# Hệ thống quản lý nhật ký phương tiện và nhân viên

Ứng dụng thử nghiệm kết hợp **Python Flask + camera AI** và **JHipster +
React + Spring Boot** nhằm hỗ trợ ghi nhận hình ảnh phương tiện, nhận
diện biển số/khuôn mặt và đối chiếu biển số với danh sách nhân viên đã
đăng ký.

> **Mục tiêu:** xây dựng mô hình minh họa phục vụ nghiên cứu, thử nghiệm
> và phát triển sáng kiến ứng dụng công nghệ tại đơn vị. Kết quả nhận
> diện tự động cần được kiểm tra khi sử dụng trong thực tế.

## 1. Tổng quan kiến trúc

``` text
Camera
  │
  ▼
Ứng dụng Python / Flask
  ├── Chụp và xử lý khung hình
  ├── Phát hiện/cắt vùng khuôn mặt
  ├── Phát hiện/cắt vùng biển số
  ├── Lưu ảnh gốc và ảnh xử lý
  └── Ghi nhật ký vào camera_log.csv
             │
             ▼
Ứng dụng JHipster
  ├── Spring Boot REST API
  ├── Đọc nhật ký CSV
  ├── API phục vụ ảnh
  ├── Quản lý danh sách nhân viên
  ├── Đối chiếu biển số nhận diện với nhân viên
  └── Giao diện React hiển thị nhật ký
             │
             ▼
      Nhật ký ra/vào
      ├── Thời gian ghi nhận
      ├── Loại phương tiện
      ├── Biển số nhận diện
      ├── Ảnh biển số
      ├── Ảnh khuôn mặt
      ├── Thông tin nhân viên (nếu khớp)
      └── Trạng thái: Nhân viên / Khách ngoài
```

Hai phần được thiết kế theo hướng tách biệt: Python đảm nhiệm khâu
camera và xử lý hình ảnh; JHipster đảm nhiệm quản lý dữ liệu, API và
giao diện web.

## 2. Các thành phần chính

### 2.1. Python Flask -- Camera và xử lý hình ảnh

Ứng dụng Python kết nối camera, lấy khung hình và lưu các ảnh phục vụ
kiểm tra. Tùy cấu hình và các thư viện được cài đặt trong môi trường,
quy trình có thể gồm:

-   Mở camera và chụp khung hình.
-   Phát hiện khuôn mặt và lưu ảnh gốc/ảnh khuôn mặt đã cắt.
-   Phát hiện biển số và lưu ảnh gốc/ảnh vùng biển số đã xử lý.
-   Ghi thời gian, số khung hình, đường dẫn ảnh và kết quả nhận diện vào
    `camera_log.csv`.
-   Tổ chức ảnh theo thư mục để dễ tra cứu, ví dụ `captures/moto_face`,
    `captures/car_face`, `captures/moto_plate` và `captures/car_plate`.

**Vai trò của CSV:** `camera_log.csv` là dữ liệu trung gian để phần web
đọc lại lịch sử xử lý mà không cần xử lý trực tiếp camera lần nữa.

Tên các cột CSV có thể bao gồm:

-   `thoi_gian`, `so_khung_da_chup`
-   `moto_face_anh_goc`, `moto_face_anh_nhan_dien`, `moto_face_ket_qua`
-   `car_face_anh_goc`, `car_face_anh_nhan_dien`, `car_face_ket_qua`
-   `moto_plate_anh_goc`, `moto_plate_anh_nhan_dien`,
    `moto_plate_ket_qua`
-   `car_plate_anh_goc`, `car_plate_anh_nhan_dien`, `car_plate_ket_qua`

Tên cột thực tế phải thống nhất giữa chương trình Python và phần đọc CSV
của backend Java.

### 2.2. JHipster -- Quản lý nhân viên và giao diện web

Phần web được xây dựng từ JHipster, gồm backend Spring Boot và frontend
React/TypeScript.

Các chức năng chính:

-   **Quản lý nhân viên:** lưu mã nhân viên, họ tên, phòng ban/bộ phận,
    chức vụ, thông tin liên hệ, biển số xe đăng ký và đường dẫn ảnh
    khuôn mặt (nếu sử dụng).
-   **Nhật ký camera:** hiển thị thời gian, kết quả nhận diện và ảnh
    được lưu từ chương trình Python.
-   **Nhật ký ra/vào:** trích xuất biển số từ kết quả nhận diện rồi đối
    chiếu với biển số đã đăng ký trong danh sách nhân viên.
-   **Phân loại sơ bộ:** nếu biển số khớp duy nhất với nhân viên đã đăng
    ký, hiển thị thông tin nhân viên; nếu không tìm thấy kết quả khớp,
    hiển thị **"Khách ngoài"**.
-   **Hiển thị hình ảnh:** tải ảnh qua API backend thay vì để giao diện
    tự truy cập trực tiếp đường dẫn trên máy chạy camera.
-   **Tìm kiếm và lọc:** hỗ trợ tra cứu nhật ký theo dữ liệu mà giao
    diện đã triển khai.

Các API dự kiến trong phần tích hợp:

-   `GET /api/vehicle-logs` -- đọc nhật ký camera.
-   `GET /api/entry-logs` -- nhật ký đối chiếu biển số với nhân viên.
-   `GET /api/camera-images?path=...` -- phục vụ ảnh theo đường dẫn
    tương đối được backend kiểm tra.

Các API và đường dẫn trên cần được đối chiếu với mã nguồn thực tế trước
khi triển khai.

## 3. Điểm nổi bật của dự án

### 3.1. Kết hợp camera AI với hệ thống quản lý nhân viên

Thay vì chỉ chụp ảnh hoặc nhận diện riêng lẻ, hệ thống kết nối kết quả
từ camera với dữ liệu nhân viên để tạo thành nhật ký dễ tra cứu.

### 3.2. Đối chiếu biển số tự động

Biển số được chuẩn hóa trước khi so sánh, chẳng hạn chuyển về chữ in hoa
và loại bỏ dấu cách/ký tự phân cách. Điều này giúp giảm sai khác do cách
viết biển số. Tuy nhiên, kết quả OCR vẫn có thể nhầm ký tự, nên cần cơ
chế xác minh khi cần độ chính xác cao.

### 3.3. Liên kết ảnh với từng sự kiện

Mỗi bản ghi có thể liên kết đến ảnh gốc, ảnh biển số đã xử lý và ảnh
khuôn mặt đã xử lý. Người quản lý có thêm dữ liệu trực quan để kiểm tra
lại kết quả nhận diện.

### 3.4. Tách biệt xử lý camera và giao diện nghiệp vụ

Python tập trung vào camera và hình ảnh; Spring Boot cung cấp API; React
hiển thị dữ liệu. Cách chia này giúp từng phần có thể được kiểm tra, sửa
lỗi và nâng cấp độc lập.

### 3.5. Sử dụng CSV làm cầu nối dữ liệu ban đầu

CSV dễ xem, dễ sao lưu và thuận tiện khi thử nghiệm. Đây là cách triển
khai đơn giản để làm nguyên mẫu trước khi chuyển sang hàng đợi sự kiện
hoặc cơ sở dữ liệu chuyên dụng cho nhật ký camera.

### 3.6. Có thể mở rộng

Các hướng phát triển tiếp theo:

-   Lưu nhật ký camera vào MySQL thay vì chỉ đọc CSV.
-   Bổ sung bộ lọc theo thời gian, biển số, loại xe và trạng thái.
-   Phát hiện biển số trùng hoặc nhiều nhân viên đăng ký cùng một biển
    số.
-   Bổ sung trạng thái "Không đọc được biển số" thay vì bỏ qua bản ghi
    không có kết quả OCR.
-   Thêm phân quyền người dùng, nhật ký thao tác và chức năng xuất báo
    cáo.
-   Tối ưu hiệu năng camera, OCR và tải ảnh khi số lượng bản ghi tăng.
-   Chỉ triển khai nhận diện khuôn mặt theo quy trình được phê duyệt và
    có biện pháp bảo vệ dữ liệu phù hợp.

## 4. Công nghệ và phiên bản

Các phiên bản dưới đây là thông tin môi trường đã được xác định trong
quá trình phát triển. Phiên bản thư viện Python cụ thể cần được xác nhận
từ môi trường chạy thực tế.

  -----------------------------------------------------------------------
  Thành phần                          Phiên bản / công nghệ
  ----------------------------------- -----------------------------------
  JHipster                            8.6.0

  Java / JDK                          OpenJDK 21.0.13

  Node.js                             Nhánh Node.js 20

  Backend web                         Spring Boot, Java

  Frontend web                        React + TypeScript

  Công cụ build Java                  Maven

  Cơ sở dữ liệu                       MySQL

  Xác thực JHipster                   JWT

  Ứng dụng camera                     Python + Flask

  Xử lý ảnh                           OpenCV (`opencv-python`, nếu đang
                                      dùng gói này)

  Nhận diện biển số                   Kiểm tra thư viện OCR thực tế trong
                                      môi trường Python

  Định dạng nhật ký trung gian        CSV
  -----------------------------------------------------------------------

**Lưu ý:** không nên ghi một số phiên bản Flask, OpenCV, NumPy hoặc thư
viện OCR khi chưa kiểm tra môi trường thật. Để lấy danh sách phiên bản
đang cài trong môi trường Python của dự án, chạy:

``` bash
python -m pip freeze
```

Nếu dự án dùng môi trường ảo, hãy kích hoạt đúng môi trường đó trước khi
chạy lệnh. Sau khi kiểm tra, nên lưu các gói cần thiết vào
`requirements.txt`:

``` bash
python -m pip freeze > requirements.txt
```

Có thể tạo thêm danh sách gọn chỉ gồm các thư viện trực tiếp sử dụng, để
`requirements.txt` dễ bảo trì hơn.

## 5. Cấu trúc thư mục tham khảo

Cấu trúc có thể khác tùy mã nguồn thực tế:

``` text
project/
├── FlaskProjectGate312/
│   ├── app.py
│   ├── camera_log.csv
│   ├── captures/
│   │   ├── moto_face/
│   │   ├── car_face/
│   │   ├── moto_plate/
│   │   └── car_plate/
│   └── requirements.txt
│
└── appGate/
    ├── src/main/java/com/mycompany/myapp/
    │   ├── web/rest/
    │   └── service/dto/
    ├── src/main/webapp/app/
    │   └── modules/
    ├── appGate.jdl
    └── pom.xml
```

Đây là sơ đồ minh họa; hãy chỉnh tên file/thư mục cho khớp repository
trước khi công bố.

## 6. Cài đặt và chạy thử

### 6.1. Phần Python Flask

1.  Cài phiên bản Python phù hợp với các thư viện của dự án.
2.  Tạo và kích hoạt môi trường ảo.
3.  Cài các gói trong `requirements.txt`.
4.  Kiểm tra quyền truy cập camera và đường dẫn lưu ảnh.
5.  Chạy ứng dụng theo tên file và lệnh khởi động thực tế của dự án.

Ví dụ tạo môi trường ảo trên macOS:

``` bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Lệnh chạy ứng dụng tùy thuộc vào cấu trúc Flask; ví dụ nếu file khởi
chạy là `app.py`:

``` bash
python app.py
```

### 6.2. Phần JHipster

Yêu cầu môi trường: JDK phù hợp, Node.js, Maven và MySQL đã được cấu
hình.

Trong thư mục dự án JHipster, có thể chạy frontend/backend ở chế độ phát
triển bằng lệnh phù hợp với cấu hình dự án, thường là:

``` bash
./mvnw
```

Nếu dự án sử dụng Maven Wrapper. Cần kiểm tra `README` do JHipster tạo,
`pom.xml`, cấu hình database và các script trong `package.json` để xác
định lệnh khởi chạy chính xác.

### 6.3. Kiểm tra tích hợp

-   Xác nhận chương trình Python tạo được `camera_log.csv`.
-   Kiểm tra đường dẫn ảnh trong CSV có tồn tại và backend có thể đọc
    được.
-   Kiểm tra API nhật ký trả về dữ liệu hợp lệ.
-   Đăng ký một nhân viên thử nghiệm với biển số đã biết.
-   Đối chiếu nhật ký có biển số khớp và không khớp để kiểm tra trạng
    thái.
-   Kiểm tra quyền truy cập API và ảnh; không tắt xác thực chỉ để khắc
    phục lỗi trong môi trường triển khai.

## 7. Cấu hình đường dẫn và bảo mật

-   Không commit đường dẫn tuyệt đối trên máy cá nhân vào mã nguồn dùng
    chung. Nên đưa đường dẫn CSV, thư mục ảnh và thông tin kết nối vào
    file cấu hình môi trường hoặc biến môi trường.
-   Không đưa mật khẩu, JWT secret, khóa API hoặc thông tin đăng nhập
    vào GitHub.
-   Thêm dữ liệu ảnh thực tế, CSV có thông tin cá nhân và dữ liệu nhân
    viên vào `.gitignore`, trừ khi đã được phép công khai.
-   Chỉ cho phép API ảnh trả về file nằm trong thư mục gốc đã cấu hình;
    kiểm tra đường dẫn chuẩn hóa để ngăn truy cập file ngoài phạm vi.
-   Nếu repository công khai, chỉ sử dụng ảnh minh họa và dữ liệu giả
    lập. Ảnh khuôn mặt, biển số xe và nhật ký ra/vào có thể là dữ liệu
    cá nhân.
-   Với hệ thống dùng thực tế, cần xác định rõ mục đích, quyền truy cập,
    thời hạn lưu trữ và quy trình xử lý dữ liệu.

## 8. Giới hạn hiện tại

-   Chất lượng nhận diện phụ thuộc camera, ánh sáng, góc chụp, độ phân
    giải và mô hình/thư viện đang dùng.
-   Kết quả nhận diện biển số không đồng nghĩa với xác minh danh tính
    tuyệt đối.
-   Trạng thái "Khách ngoài" chỉ có nghĩa là chưa tìm thấy biển số khớp
    trong danh sách đăng ký tại thời điểm đối chiếu; không khẳng định
    người đó không thuộc đơn vị.
-   Nếu một biển số được gán cho nhiều nhân viên, hệ thống cần báo trạng
    thái dữ liệu trùng để kiểm tra, thay vì tự chọn một người.
-   Bản ghi không trích xuất được biển số nên được phân biệt với bản ghi
    "Khách ngoài".
-   Đọc nhật ký từ CSV phù hợp với nguyên mẫu; nhiều tiến trình ghi đồng
    thời hoặc dữ liệu lớn cần thiết kế lưu trữ/đồng bộ chặt chẽ hơn.

## 9. Hướng phát triển

-   Tự động đồng bộ sự kiện từ Flask sang REST API.
-   Chuyển nhật ký sang bảng MySQL và xây dựng phân trang.
-   Bổ sung dashboard thống kê lượt xe theo ngày/giờ.
-   Bổ sung quy trình xác nhận thủ công khi OCR có độ tin cậy thấp.
-   Tách cấu hình phát triển và triển khai; đóng gói bằng Docker khi
    cần.
-   Viết kiểm thử cho chuẩn hóa biển số, đối chiếu nhân viên và kiểm tra
    đường dẫn ảnh.

## 10. Tác giả và giấy phép

-   **Tác giả:** bổ sung tên tác giả/đơn vị trước khi công khai.
-   **Mục đích:** học tập, nghiên cứu và xây dựng nguyên mẫu quản lý
    phương tiện.
-   **Giấy phép:** bổ sung giấy phép phù hợp nếu muốn cho phép người
    khác sử dụng, sửa đổi hoặc phân phối mã nguồn.

------------------------------------------------------------------------

**Gợi ý trước khi đẩy lên GitHub:** kiểm tra lại `requirements.txt`, tên
file khởi chạy Flask, lệnh chạy JHipster và các phiên bản thư viện thực
tế. Không đưa dữ liệu nhân viên, ảnh khuôn mặt, biển số thật hoặc thông
tin bí mật vào repository công khai.
