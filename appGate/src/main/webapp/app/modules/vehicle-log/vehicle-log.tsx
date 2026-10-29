
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface CameraLog {
  thoiGian: string | null;
  soKhungDaChup: number | null;

  motoFaceAnhGoc: string | null;
  motoFaceAnhNhanDien: string | null;
  motoFaceKetQua: string | null;

  carFaceAnhGoc: string | null;
  carFaceAnhNhanDien: string | null;
  carFaceKetQua: string | null;

  motoPlateAnhGoc: string | null;
  motoPlateAnhNhanDien: string | null;
  motoPlateKetQua: string | null;

  carPlateAnhGoc: string | null;
  carPlateAnhNhanDien: string | null;
  carPlateKetQua: string | null;
}

const imageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  return `/api/camera-images?path=${encodeURIComponent(path)}`;
};

// const CameraImage = ({ path, title }: { path?: string | null; title: string }) => {
//   const src = imageUrl(path);

//   if (!src) {
//     return <span style={{ color: '#888' }}>Không có ảnh</span>;
//   }

//   return (
//     <a href={src} target="_blank" rel="noreferrer">
//       <img
//         src={src}
//         alt={title}
//         title="Nhấn để mở ảnh"
//         loading="lazy"
//         style={{
//           width: 140,
//           maxHeight: 110,
//           objectFit: 'contain',
//           border: '1px solid #ddd',
//           borderRadius: 4,
//         }}
//         onError={event => {
//           event.currentTarget.style.display = 'none';
//         }}
//       />
//     </a>
//   );
// };


// const CameraImage = ({
//   path,
//   title,
// }: {
//   path?: string | null;
//   title: string;
// }) => {
//   const [failed, setFailed] = useState(false);
//   const [loaded, setLoaded] = useState(false);

//   if (!path) {
//     return <span style={{ color: '#888' }}>Không có ảnh trong CSV</span>;
//   }

//   const src = `/api/camera-images?path=${encodeURIComponent(path)}`;

//   return (
//     <div style={{ minWidth: 150 }}>
//       {!failed ? (
//         <>
//           {!loaded && (
//             <div style={{ color: '#666', fontSize: 12 }}>
//               Đang tải ảnh...
//             </div>
//           )}
//           <a href={src} target="_blank" rel="noreferrer">
//             <img
//               src={src}
//               alt={title}
//               title="Nhấn để mở ảnh"
//               loading="lazy"
//               onLoad={() => setLoaded(true)}
//               onError={() => setFailed(true)}
//               style={{
//                 display: loaded ? 'block' : 'none',
//                 width: 160,
//                 maxHeight: 130,
//                 objectFit: 'contain',
//                 border: '1px solid #ddd',
//                 borderRadius: 4,
//               }}
//             />
//           </a>
//         </>
//       ) : (
//         <div style={{ color: '#b00020', fontSize: 12 }}>
//           <div>Không tải được ảnh.</div>
//           <div>Kiểm tra đường dẫn hoặc quyền truy cập API.</div>
//           <a href={src} target="_blank" rel="noreferrer">
//             Mở URL để kiểm tra
//           </a>
//         </div>
//       )}

//       <div
//         style={{
//           marginTop: 4,
//           fontSize: 10,
//           color: '#666',
//           overflowWrap: 'anywhere',
//           maxWidth: 180,
//         }}
//       >
//         {path}
//       </div>
//     </div>
//   );
// };


const CameraImage = ({
  path,
  title,
}: {
  path?: string | null;
  title: string;
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
  }, [path]);

  if (!path) {
    return <span style={{ color: '#888' }}>Không có ảnh trong CSV</span>;
  }

  const src = `/api/camera-images?path=${encodeURIComponent(path)}`;

  return (
    <div style={{ minWidth: 160 }}>
      {status === 'loading' && (
        <div style={{ color: '#666', fontSize: 12 }}>
          Đang tải ảnh...
        </div>
      )}

      {status === 'error' && (
        <div style={{ color: '#b00020', fontSize: 12 }}>
          Không hiển thị được ảnh.
        </div>
      )}

      <img
        src={src}
        alt={title}
        onLoad={() => {
          console.log('Ảnh đã tải:', path);
          setStatus('loaded');
        }}
        onError={() => {
          console.error('Không giải mã được ảnh:', path, src);
          setStatus('error');
        }}
        style={{
          display: status === 'loaded' ? 'block' : 'none',
          width: 160,
          maxHeight: 130,
          objectFit: 'contain',
          border: '1px solid #ddd',
          borderRadius: 4,
        }}
      />

      <div style={{ marginTop: 4, fontSize: 10, overflowWrap: 'anywhere' }}>
        {path}
      </div>

      <a href={src} target="_blank" rel="noreferrer">
        Mở ảnh trực tiếp
      </a>
    </div>
  );
};


const VehicleLog = () => {
  const [logs, setLogs] = useState<CameraLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get<CameraLog[]>('/api/vehicle-logs')
      .then(response => setLogs(response.data))
      .catch(err => {
        console.error('Lỗi tải nhật ký camera:', err);
        setError('Không tải được nhật ký camera. Vui lòng kiểm tra backend và file CSV.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-3">Đang tải nhật ký camera...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const headerStyle: React.CSSProperties = {
    border: '1px solid #dee2e6',
    padding: 8,
    background: '#f3f5f7',
    whiteSpace: 'nowrap',
  };

  const cellStyle: React.CSSProperties = {
    border: '1px solid #dee2e6',
    padding: 8,
    verticalAlign: 'top',
  };

  return (
    <div className="container-fluid p-3">
      <h2>Nhật ký nhận diện camera</h2>
      <p>Tổng số bản ghi: {logs.length}</p>

      {logs.length === 0 ? (
        <div className="alert alert-info">CSV chưa có dữ liệu.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-sm table-bordered">
            <thead>
              <tr>
                <th style={headerStyle}>Thời gian</th>
                <th style={headerStyle}>Số khung</th>
                <th style={headerStyle}>Xe máy — ảnh gốc</th>
                <th style={headerStyle}>Xe máy — ảnh nhận diện</th>
                <th style={headerStyle}>Kết quả khuôn mặt xe máy</th>
                <th style={headerStyle}>Ô tô — ảnh gốc</th>
                <th style={headerStyle}>Ô tô — ảnh nhận diện</th>
                <th style={headerStyle}>Kết quả khuôn mặt ô tô</th>
                <th style={headerStyle}>Biển số xe máy — ảnh gốc</th>
                <th style={headerStyle}>Biển số xe máy — ảnh nhận diện</th>
                <th style={headerStyle}>Kết quả biển số xe máy</th>
                <th style={headerStyle}>Biển số ô tô — ảnh gốc</th>
                <th style={headerStyle}>Biển số ô tô — ảnh nhận diện</th>
                <th style={headerStyle}>Kết quả biển số ô tô</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={`${log.thoiGian ?? 'log'}-${index}`}>
                  <td style={cellStyle}>{log.thoiGian ?? '—'}</td>
                  <td style={cellStyle}>{log.soKhungDaChup ?? '—'}</td>

                  <td style={cellStyle}><CameraImage path={log.motoFaceAnhGoc} title="Khuôn mặt xe máy - ảnh gốc" /></td>
                  <td style={cellStyle}><CameraImage path={log.motoFaceAnhNhanDien} title="Khuôn mặt xe máy - ảnh nhận diện" /></td>
                  <td style={cellStyle}>{log.motoFaceKetQua ?? '—'}</td>

                  <td style={cellStyle}><CameraImage path={log.carFaceAnhGoc} title="Khuôn mặt ô tô - ảnh gốc" /></td>
                  <td style={cellStyle}><CameraImage path={log.carFaceAnhNhanDien} title="Khuôn mặt ô tô - ảnh nhận diện" /></td>
                  <td style={cellStyle}>{log.carFaceKetQua ?? '—'}</td>

                  <td style={cellStyle}><CameraImage path={log.motoPlateAnhGoc} title="Biển số xe máy - ảnh gốc" /></td>
                  <td style={cellStyle}><CameraImage path={log.motoPlateAnhNhanDien} title="Biển số xe máy - ảnh nhận diện" /></td>
                  <td style={cellStyle}>{log.motoPlateKetQua ?? '—'}</td>

                  <td style={cellStyle}><CameraImage path={log.carPlateAnhGoc} title="Biển số ô tô - ảnh gốc" /></td>
                  <td style={cellStyle}><CameraImage path={log.carPlateAnhNhanDien} title="Biển số ô tô - ảnh nhận diện" /></td>
                  <td style={cellStyle}>{log.carPlateKetQua ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VehicleLog;
