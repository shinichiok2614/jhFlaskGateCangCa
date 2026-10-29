from flask import Flask, render_template, Response, jsonify, request, send_from_directory
import cv2
import os
import threading
import time
import csv
import re
import unicodedata
from datetime import datetime
from pathlib import Path

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
CAPTURE_DIR = BASE_DIR / "captures"
DATA_DIR = BASE_DIR / "data"
CSV_PATH = DATA_DIR / "camera_log.csv"
CAPTURE_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

PANELS = {
    "moto_face": {"vehicle": "Xe máy", "kind": "Khuôn mặt"},
    "car_face": {"vehicle": "Ô tô", "kind": "Khuôn mặt"},
    "moto_plate": {"vehicle": "Xe máy", "kind": "Biển số"},
    "car_plate": {"vehicle": "Ô tô", "kind": "Biển số"},
}

# Mỗi lần bấm "Xong" ghi MỘT dòng CSV: 1 mốc thời gian + ảnh gốc/ảnh nhận diện/kết quả của từng khung.
CSV_FIELDS = ["thoi_gian", "so_khung_da_chup"]
for _key in PANELS:
    CSV_FIELDS += [f"{_key}_anh_goc", f"{_key}_anh_nhan_dien", f"{_key}_ket_qua"]

# Chỉ mở camera vật lý một lần, chia sẻ frame cho cả 4 khung.
camera = cv2.VideoCapture(0)
camera_lock = threading.Lock()
frame_lock = threading.Lock()
latest_frame = None
camera_running = True

LIVE_STATE = {"active": False, "frozen": False, "image": None, "message": "Camera trực tiếp"}
panel_states = {key: dict(LIVE_STATE) for key in PANELS}
# Các lượt chụp đang chờ bấm "Xong" (mỗi khung giữ lượt chụp mới nhất).
pending_captures = {}
state_lock = threading.Lock()
csv_lock = threading.Lock()

face_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(face_cascade_path)


def camera_reader():
    global latest_frame
    while camera_running:
        if not camera.isOpened():
            time.sleep(0.2)
            continue
        with camera_lock:
            ok, frame = camera.read()
        if ok:
            with frame_lock:
                latest_frame = frame
        else:
            time.sleep(0.05)
        time.sleep(0.01)


threading.Thread(target=camera_reader, daemon=True).start()


def get_latest_frame():
    with frame_lock:
        return latest_frame.copy() if latest_frame is not None else None


# ===== Nhận diện biển số bằng fast-alpr (YOLO tìm biển + fast-plate-ocr đọc ký tự) =====
PLATE_DETECTOR_MODEL = "yolo-v9-t-384-license-plate-end2end"
PLATE_OCR_MODEL = "cct-xs-v2-global-model"
PLATE_MIN_CONFIDENCE = 0.3    # độ tin cậy đọc ký tự tối thiểu để chấp nhận một biển số
PLATE_INTERVAL = 0.3          # giây giữa hai lần nhận diện ở chế độ trực tiếp
PLATE_RESULT_TTL = 2.0        # giây giữ khung vẽ sau lần nhận diện gần nhất
PLATE_CROP_PAD = 0.06         # nới vùng cắt ảnh biển số thêm tỉ lệ này mỗi phía

alpr = None
alpr_lock = threading.Lock()
ocr_state = {"status": "loading", "error": ""}   # loading | ready | missing | error
plate_results = {}   # panel_id -> {"items": [...], "time": float}


def use_certifi_certs():
    """Python cài từ python.org trên macOS thường thiếu chứng chỉ gốc nên tải mô hình báo
    CERTIFICATE_VERIFY_FAILED; dùng bộ chứng chỉ của certifi nếu có."""
    if os.environ.get("SSL_CERT_FILE"):
        return
    try:
        import certifi
    except ImportError:
        return
    os.environ["SSL_CERT_FILE"] = certifi.where()


def clean_text(text):
    """Chuẩn hoá chuỗi biển số: chữ hoa, bỏ dấu cách, gạch, chấm và ký tự đệm."""
    text = unicodedata.normalize("NFKC", text)
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def load_ocr():
    """Tải mô hình fast-alpr ở luồng nền (lần đầu chạy sẽ tải mô hình, có thể mất vài phút)."""
    global alpr
    use_certifi_certs()
    try:
        from fast_alpr import ALPR
    except Exception as exc:  # chưa cài hoặc lỗi nạp thư viện
        ocr_state.update(
            status="missing",
            error=f'Không nạp được fast-alpr ({exc}). Cần Python 3.10+: pip install "fast-alpr[onnx]"'
        )
        print(f"LỖI: {ocr_state['error']}")
        return
    try:
        model = ALPR(detector_model=PLATE_DETECTOR_MODEL, ocr_model=PLATE_OCR_MODEL)
    except Exception as exc:
        if "CERTIFICATE_VERIFY_FAILED" in str(exc):
            message = (
                "Không tải được mô hình vì thiếu chứng chỉ SSL: chạy 'Install Certificates.command' "
                "trong /Applications/Python 3.x/ hoặc pip install --upgrade certifi, rồi khởi động lại"
            )
        else:
            message = f"Không tải được mô hình nhận diện biển số: {exc}"
        ocr_state.update(status="error", error=message)
        print(f"LỖI: {message}")
        return
    with alpr_lock:
        alpr = model
    ocr_state["status"] = "ready"
    print("Mô hình nhận diện biển số đã sẵn sàng.")


def ocr_unavailable():
    """Trả về phản hồi lỗi nếu mô hình chưa sẵn sàng, ngược lại trả về None."""
    status = ocr_state["status"]
    if status == "ready":
        return None
    if status == "loading":
        return jsonify(
            ok=False,
            error="Mô hình nhận diện biển số đang được tải (lần đầu có thể mất vài phút), vui lòng thử lại sau"
        ), 503
    return jsonify(ok=False, error=ocr_state["error"]), 503


def _mean_confidence(value):
    """Độ tin cậy có thể là số hoặc danh sách theo từng ký tự; trả về trung bình hoặc None."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        pass
    try:
        values = [float(v) for v in value]
    except (TypeError, ValueError):
        return None
    return sum(values) / len(values) if values else None


def detect_plates(frame):
    """Nhận diện biển số trong ảnh. Trả về [(biển số, độ tin cậy, x1, y1, x2, y2)], tin cậy cao trước."""
    if ocr_state["status"] != "ready":
        raise RuntimeError(ocr_state["error"] or "Mô hình nhận diện biển số chưa sẵn sàng")

    with alpr_lock:
        results = alpr.predict(frame)

    h, w = frame.shape[:2]
    items = []
    for result in results or []:
        ocr = getattr(result, "ocr", None)    # có thể None nếu không đọc được ký tự
        text = clean_text(getattr(ocr, "text", "") or "")
        if not text:
            continue
        confidence = _mean_confidence(getattr(ocr, "confidence", None))
        if confidence is None:
            confidence = 1.0
        if confidence < PLATE_MIN_CONFIDENCE:
            continue
        box = getattr(getattr(result, "detection", None), "bounding_box", None)
        try:
            x1, y1, x2, y2 = (int(getattr(box, k)) for k in ("x1", "y1", "x2", "y2"))
        except (TypeError, ValueError, AttributeError):
            continue
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue
        items.append((text, confidence, x1, y1, x2, y2))
    items.sort(key=lambda it: it[1], reverse=True)
    return items


def crop_plate(frame, box):
    """Cắt vùng biển số, nới thêm một chút mỗi phía."""
    x1, y1, x2, y2 = box
    h, w = frame.shape[:2]
    px, py = int((x2 - x1) * PLATE_CROP_PAD), int((y2 - y1) * PLATE_CROP_PAD)
    return frame[max(0, y1 - py):min(h, y2 + py), max(0, x1 - px):min(w, x2 + px)].copy()


def draw_plates(frame, items):
    """Vẽ khung và biển số lên ảnh (vẽ trực tiếp, trả về chính ảnh đó)."""
    for plate, confidence, x1, y1, x2, y2 in items:
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            frame, f"{plate} ({confidence:.2f})", (x1, max(25, y1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2
        )
    return frame


def plate_worker():
    """Chạy nhận diện nền khi có khung biển số đang bật; một lần chạy dùng chung cho các khung."""
    last_print = None
    while camera_running:
        with state_lock:
            targets = [
                key for key, s in panel_states.items()
                if key.endswith("_plate") and s["active"]
            ]
        if not targets or ocr_state["status"] != "ready":
            time.sleep(0.2)
            continue
        frame = get_latest_frame()
        if frame is None:
            time.sleep(0.1)
            continue
        started = time.time()
        try:
            items = detect_plates(frame)
        except Exception as exc:
            print(f"Lỗi nhận diện biển số: {exc}")
            time.sleep(1)
            continue
        with state_lock:
            for key in targets:
                plate_results[key] = {"items": items, "time": time.time()}
        summary = tuple(i[0] for i in items)
        if summary != last_print:
            last_print = summary
            print(f"[Biển số] {list(summary) or 'không thấy'}")
        time.sleep(max(0.05, PLATE_INTERVAL - (time.time() - started)))


threading.Thread(target=load_ocr, daemon=True).start()
threading.Thread(target=plate_worker, daemon=True).start()


def detect_face_and_crop(frame):
    """Phát hiện khuôn mặt cơ bản bằng Haar Cascade, không xác định danh tính."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40)
    )
    annotated = frame.copy()
    crop = None
    if len(faces) > 0:
        x, y, w, h = max(faces, key=lambda box: box[2] * box[3])
        pad_x, pad_y = int(w * 0.15), int(h * 0.15)
        x1, y1 = max(0, x - pad_x), max(0, y - pad_y)
        x2, y2 = min(frame.shape[1], x + w + pad_x), min(frame.shape[0], y + h + pad_y)
        cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 255, 0), 2)
        crop = frame[y1:y2, x1:x2].copy()
    return annotated, crop, len(faces)


def jpeg_bytes(frame):
    ok, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return buffer.tobytes() if ok else None


def generate_frames(panel_id):
    while True:
        with state_lock:
            state = panel_states[panel_id].copy()

        if state["frozen"] and state["image"] is not None:
            frame = state["image"].copy()
        else:
            frame = get_latest_frame()
            if frame is None:
                time.sleep(0.1)
                continue
            if state["active"]:
                if panel_id.endswith("_face"):
                    frame, _, _ = detect_face_and_crop(frame)
                else:
                    with state_lock:
                        found = plate_results.get(panel_id)
                    if found and time.time() - found["time"] <= PLATE_RESULT_TTL:
                        frame = draw_plates(frame, found["items"])

        encoded = jpeg_bytes(frame)
        if encoded:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + encoded + b"\r\n"
            )
        time.sleep(0.03)


def rel(path):
    return str(path.relative_to(BASE_DIR))


def prepare_csv():
    """Nếu file CSV cũ có cấu trúc cột khác, đổi tên thành bản sao lưu để không lẫn cột."""
    if not CSV_PATH.exists() or CSV_PATH.stat().st_size == 0:
        return
    with CSV_PATH.open("r", newline="", encoding="utf-8-sig") as f:
        header = next(csv.reader(f), [])
    if header != CSV_FIELDS:
        backup = CSV_PATH.with_name(f"camera_log_cu_{datetime.now():%Y%m%d_%H%M%S}.csv")
        CSV_PATH.rename(backup)


def write_csv(row):
    with csv_lock:
        prepare_csv()
        new_file = not CSV_PATH.exists() or CSV_PATH.stat().st_size == 0
        with CSV_PATH.open("a", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
            if new_file:
                writer.writeheader()
            writer.writerow(row)


def discard_capture_files(entry):
    """Xoá ảnh của lượt chụp bị thay thế hoặc bị huỷ (chưa được ghi vào CSV)."""
    if not entry:
        return
    for key in ("original_path", "crop_path"):
        try:
            entry[key].unlink(missing_ok=True)
        except OSError:
            pass


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/video_feed/<panel_id>")
def video_feed(panel_id):
    if panel_id not in PANELS:
        return "Khung camera không hợp lệ", 404
    return Response(
        generate_frames(panel_id),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/api/action", methods=["POST"])
def action():
    payload = request.get_json(silent=True) or {}
    panel_id = payload.get("panel")
    action_name = payload.get("action")

    if panel_id not in PANELS:
        return jsonify(ok=False, error="Khung camera không hợp lệ"), 400
    if action_name not in {"start", "capture", "cancel"}:
        return jsonify(ok=False, error="Thao tác không hợp lệ"), 400

    if action_name in {"start", "capture"} and panel_id.endswith("_plate"):
        unavailable = ocr_unavailable()
        if unavailable:
            return unavailable

    if action_name == "start":
        if get_latest_frame() is None:
            return jsonify(ok=False, error="Chưa lấy được hình ảnh camera"), 503
        with state_lock:
            old = pending_captures.pop(panel_id, None)
            plate_results.pop(panel_id, None)
            panel_states[panel_id].update({
                "active": True, "frozen": False, "image": None,
                "message": "Đang xử lý"
            })
            pending_count = len(pending_captures)
        discard_capture_files(old)
        return jsonify(ok=True, message="Đã bắt đầu", pending=pending_count)

    if action_name == "cancel":
        with state_lock:
            old = pending_captures.pop(panel_id, None)
            plate_results.pop(panel_id, None)
            panel_states[panel_id].update(LIVE_STATE)
            pending_count = len(pending_captures)
        discard_capture_files(old)
        return jsonify(
            ok=True, message="Đã huỷ và trở lại camera trực tiếp",
            pending=pending_count
        )

    frame = get_latest_frame()
    if frame is None:
        return jsonify(ok=False, error="Chưa lấy được hình ảnh camera"), 503

    annotated = frame.copy()
    crop = None

    if panel_id.endswith("_face"):
        annotated, crop, count = detect_face_and_crop(frame)
        result = f"Phát hiện {count} khuôn mặt" if count else "Không phát hiện khuôn mặt"
        if crop is None:
            crop = frame.copy()
    else:
        try:
            items = detect_plates(frame)
        except Exception as exc:
            return jsonify(ok=False, error=f"Lỗi nhận diện biển số: {exc}"), 500
        draw_plates(annotated, items)
        if items:
            plate, confidence, x1, y1, x2, y2 = items[0]   # biển có độ tin cậy cao nhất
            crop = crop_plate(frame, (x1, y1, x2, y2))
            result = f"Biển số: {plate} (độ tin cậy {confidence:.2f})"
            if len(items) > 1:
                result += f"; còn {len(items) - 1} biển số khác"
        else:
            crop = frame.copy()
            result = "Không phát hiện biển số"

    timestamp = datetime.now().astimezone().strftime("%Y%m%d_%H%M%S_%f")
    folder = CAPTURE_DIR / panel_id
    folder.mkdir(parents=True, exist_ok=True)
    original_path = folder / f"{timestamp}_original.jpg"
    crop_path = folder / f"{timestamp}_crop.jpg"
    cv2.imwrite(str(original_path), frame)
    cv2.imwrite(str(crop_path), crop)

    # Chưa ghi CSV ở bước này: chỉ lưu tạm, chờ bấm "Xong".
    entry = {
        "original_path": original_path,
        "crop_path": crop_path,
        "original": rel(original_path),
        "crop": rel(crop_path),
        "result": result,
        "crop_url": f"/captures/{panel_id}/{crop_path.name}",
    }
    with state_lock:
        old = pending_captures.get(panel_id)
        pending_captures[panel_id] = entry
        panel_states[panel_id].update({
            "active": False, "frozen": True, "image": annotated.copy(),
            "message": result
        })
        pending_count = len(pending_captures)
    discard_capture_files(old)

    return jsonify(
        ok=True, message=result,
        original=entry["original"], crop=entry["crop"],
        crop_url=entry["crop_url"], pending=pending_count
    )


@app.route("/api/ocr_status")
def ocr_status():
    """Trạng thái mô hình OCR để giao diện hiển thị (loading | ready | missing | error)."""
    return jsonify(status=ocr_state["status"], error=ocr_state["error"])


@app.route("/api/pending")
def get_pending():
    """Trạng thái các khung đã chụp nhưng chưa bấm "Xong" (dùng khi tải lại trang)."""
    with state_lock:
        panels = {
            key: {"message": e["result"], "crop_url": e["crop_url"]}
            for key, e in pending_captures.items()
        }
    return jsonify(count=len(panels), panels=panels)


@app.route("/api/done", methods=["POST"])
def done():
    with state_lock:
        snapshot = dict(pending_captures)
    if not snapshot:
        return jsonify(ok=False, error="Chưa chụp khung nào để lưu"), 400

    time_text = datetime.now().astimezone().isoformat(timespec="seconds")
    row = {"thoi_gian": time_text, "so_khung_da_chup": len(snapshot)}
    for key in PANELS:
        entry = snapshot.get(key)
        row[f"{key}_anh_goc"] = entry["original"] if entry else ""
        row[f"{key}_anh_nhan_dien"] = entry["crop"] if entry else ""
        row[f"{key}_ket_qua"] = entry["result"] if entry else ""

    try:
        write_csv(row)
    except OSError as exc:
        return jsonify(ok=False, error=f"Không ghi được file CSV: {exc}"), 500

    with state_lock:
        for key, entry in snapshot.items():
            if pending_captures.get(key) is entry:
                del pending_captures[key]
        # Đưa các khung đã lưu về camera trực tiếp, sẵn sàng cho lượt mới.
        for key in PANELS:
            if key not in pending_captures:
                panel_states[key].update(LIVE_STATE)
        remaining = len(pending_captures)

    return jsonify(
        ok=True,
        message=f"Đã lưu mốc thời gian {time_text} ({len(snapshot)} khung)",
        time=time_text, saved=len(snapshot), pending=remaining
    )


@app.route("/captures/<panel_id>/<filename>")
def captured_image(panel_id, filename):
    if panel_id not in PANELS:
        return "Không tìm thấy ảnh", 404
    return send_from_directory(CAPTURE_DIR / panel_id, filename)


@app.route("/api/log")
def get_log():
    if not CSV_PATH.exists():
        return jsonify([])
    with csv_lock:
        with CSV_PATH.open("r", newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
    return jsonify(rows[-100:][::-1])


if __name__ == "__main__":
    if not camera.isOpened():
        print("LỖI: Không mở được camera 0. Kiểm tra quyền camera trên macOS.")
    else:
        print("Camera 0 đã sẵn sàng.")
    print("Mở trình duyệt tại http://127.0.0.1:5000")
    try:
        app.run(host="127.0.0.1", port=5000, debug=False, threaded=True)
    finally:
        camera_running = False
        if camera.isOpened():
            camera.release()
