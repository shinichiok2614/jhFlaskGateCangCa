
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

interface EntryLog {
  thoiGian: string | null;
  soKhungDaChup: number | null;
  loaiXe: string;
  bienSo: string;
  anhGoc: string | null;
  anhNhanDien: string | null;
  anhKhuonMat: string | null;
  ketQuaNhanDien: string | null;
  maNhanVien: string | null;
  hoTen: string | null;
  phongBan: string | null;
  chucVu: string | null;
  trangThai: string;
}


const getImageUrl = (path?: string | null) =>
  path
    ? `/api/camera-images?path=${encodeURIComponent(path)}`
    : null;

const PlateImage = ({
  path,
  title,
}: {
  path?: string | null;
  title: string;
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [path]);

  const src = getImageUrl(path);

  if (!src) return <span>Không có ảnh</span>;

  return (
    <div style={{ minWidth: 120 }}>
      {!loaded && !error && (
        <div style={{ fontSize: 12, color: '#666' }}>Đang tải ảnh...</div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#b00020' }}>
          Không tải được ảnh
        </div>
      )}

      <a href={src} target="_blank" rel="noreferrer">
        <img
          src={src}
          alt={title}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            display: loaded ? 'block' : 'none',
            width: 140,
            maxHeight: 100,
            objectFit: 'contain',
            border: '1px solid #ddd',
            borderRadius: 4,
          }}
        />
      </a>
    </div>
  );
};

const EntryLogPage = () => {
  const [logs, setLogs] = useState<EntryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');

  useEffect(() => {
    axios
      .get<EntryLog[]>('/api/entry-logs')
      .then(response => setLogs(response.data))
      .catch(err => {
        console.error('Lỗi tải nhật ký ra vào:', err);
        setError('Không tải được nhật ký. Vui lòng kiểm tra backend và quyền truy cập.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = useMemo(() => {
    const search = keyword.trim().toLocaleLowerCase('vi');

    return logs.filter(log => {
      const matchesStatus =
        statusFilter === 'Tất cả' || log.trangThai === statusFilter;

      const searchable = [
        log.bienSo,
        log.hoTen,
        log.maNhanVien,
        log.phongBan,
        log.chucVu,
        log.loaiXe,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi');

      return matchesStatus && (!search || searchable.includes(search));
    });
  }, [logs, keyword, statusFilter]);

  if (loading) {
    return <div className="p-3">Đang tải nhật ký ra vào...</div>;
  }

  if (error) {
    return <div className="alert alert-danger m-3">{error}</div>;
  }

  const cell: React.CSSProperties = {
    border: '1px solid #dee2e6',
    padding: 8,
    verticalAlign: 'middle',
  };

  const header: React.CSSProperties = {
    ...cell,
    background: '#f3f5f7',
    whiteSpace: 'nowrap',
  };

  const staffCount = logs.filter(
    log => log.trangThai === 'Nhân viên'
  ).length;

  const guestCount = logs.filter(
    log => log.trangThai === 'Khách ngoài'
  ).length;

  return (
    <div className="container-fluid p-3">
      <h2>Nhật ký ra vào</h2>
      <p>
        Theo dõi biển số được nhận diện và đối chiếu với danh sách nhân viên.
      </p>

      <div className="d-flex flex-wrap gap-3 mb-3">
        <div className="border rounded p-3">
          <div>Tổng lượt nhận diện</div>
          <strong>{logs.length}</strong>
        </div>

        <div className="border rounded p-3">
          <div>Lượt khớp nhân viên</div>
          <strong>{staffCount}</strong>
        </div>

        <div className="border rounded p-3">
          <div>Lượt khách ngoài</div>
          <strong>{guestCount}</strong>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <input
          className="form-control"
          style={{ maxWidth: 360 }}
          placeholder="Tìm biển số, họ tên, mã nhân viên..."
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
        />

        <select
          className="form-select"
          style={{ maxWidth: 220 }}
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
        >
          <option value="Tất cả">Tất cả đối tượng</option>
          <option value="Nhân viên">Nhân viên</option>
          <option value="Khách ngoài">Khách ngoài</option>
        </select>

        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            setKeyword('');
            setStatusFilter('Tất cả');
          }}
        >
          Xóa bộ lọc
        </button>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="alert alert-info">
          Không có lượt nhận diện phù hợp.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-sm table-bordered">
            <thead>
              <tr>
                <th style={header}>Thời gian</th>
                
                <th style={header}>Loại xe</th>
                <th style={header}>Biển số</th>
                <th style={header}>Ảnh biển số</th>
                <th style={header}>Ảnh khuôn mặt</th>
                <th style={header}>Mã nhân viên</th>
                <th style={header}>Họ tên chủ xe</th>
                <th style={header}>Phòng ban</th>
                <th style={header}>Chức vụ</th>
                <th style={header}>Đối tượng</th>
                <th style={header}>Kết quả nhận diện</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={`${log.thoiGian}-${log.bienSo}-${index}`}>
                  <td style={cell}>{log.thoiGian ?? '—'}</td>
                  
                  <td style={cell}>{log.loaiXe}</td>
                  <td style={cell}>
                    <strong>{log.bienSo}</strong>
                  </td>
                  <td style={cell}>
                    <PlateImage
                      path={log.anhNhanDien || log.anhGoc}
                      title={`Biển số ${log.bienSo}`}
                    />
                  </td>
                  <td style={cell}>
                    <PlateImage
                      path={log.anhKhuonMat}
                      title={`Khuôn mặt - biển số ${log.bienSo}`}
                    />
                  </td>
                  <td style={cell}>{log.maNhanVien ?? '—'}</td>
                  <td style={cell}>{log.hoTen ?? '—'}</td>
                  <td style={cell}>{log.phongBan ?? '—'}</td>
                  <td style={cell}>{log.chucVu ?? '—'}</td>
                  <td style={cell}>
                    <span
                      className={
                        log.trangThai === 'Nhân viên'
                          ? 'badge bg-success'
                          : 'badge bg-warning text-dark'
                      }
                    >
                      {log.trangThai}
                    </span>
                  </td>
                  <td style={cell}>{log.ketQuaNhanDien ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EntryLogPage;
