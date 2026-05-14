import { useState, useEffect } from 'react';
import { getActiveSessions, revokeSession, revokeAllOtherSessions } from '../../../api/auth';

interface Session {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  lastActiveAt: string;
  createdAt: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getActiveSessions();
      setSessions(data);
    } catch {
      setError('Không thể tải danh sách phiên đăng nhập.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm('Thu hồi phiên đăng nhập này?')) return;
    try {
      await revokeSession(id);
      load();
    } catch {
      alert('Không thể thu hồi phiên. Vui lòng thử lại.');
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Thu hồi tất cả phiên khác?')) return;
    try {
      await revokeAllOtherSessions();
      load();
    } catch {
      alert('Không thể thu hồi phiên. Vui lòng thử lại.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Phiên Đăng Nhập</h1>
        <button
          onClick={handleRevokeAll}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Thu hồi tất cả phiên khác
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Đang tải...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không có phiên đăng nhập nào.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thiết bị</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hoạt động cuối</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đăng nhập lúc</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm max-w-xs truncate">
                    {s.deviceInfo || s.userAgent?.substring(0, 60) || 'Không xác định'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{s.ipAddress}</td>
                  <td className="px-4 py-3 text-sm">{new Date(s.lastActiveAt).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-sm">{new Date(s.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(s.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Thu hồi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
