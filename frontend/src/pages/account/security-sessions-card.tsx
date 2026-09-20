import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Monitor, LogOut } from 'lucide-react';
import { getActiveSessions, revokeSession, revokeAllOtherSessions } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { useConfirm } from '../../context/ConfirmContext';

type Session = { id: string; deviceInfo: string; ipAddress: string; userAgent: string; lastActiveAt: string; createdAt: string };

/**
 * Phiên đăng nhập — `GET /identity/sessions`, `DELETE /identity/sessions/{id}`,
 * `DELETE /identity/sessions/all-others` (đã có sẵn trong `api/auth.ts`).
 */
export const SessionsCard = () => {
    const confirm = useConfirm();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [revokingAll, setRevokingAll] = useState(false);

    const load = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getActiveSessions();
            setSessions(data);
        } catch {
            setError('Không tải được danh sách phiên đăng nhập');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const handleRevoke = async (id: string) => {
        const ok = await confirm({ message: 'Đăng xuất khỏi thiết bị này?', variant: 'warning' });
        if (!ok) return;
        setBusyId(id);
        try {
            await revokeSession(id);
            toast.success('Đã đăng xuất thiết bị');
            await load();
        } catch {
            toast.error('Không đăng xuất được thiết bị này');
        } finally {
            setBusyId(null);
        }
    };

    const handleRevokeAllOthers = async () => {
        const ok = await confirm({ message: 'Đăng xuất khỏi mọi thiết bị khác? Chỉ phiên hiện tại của bạn được giữ lại.', variant: 'warning' });
        if (!ok) return;
        setRevokingAll(true);
        try {
            await revokeAllOtherSessions();
            toast.success('Đã đăng xuất mọi thiết bị khác');
            await load();
        } catch {
            toast.error('Thao tác thất bại');
        } finally {
            setRevokingAll(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><Monitor size={16} /> Phiên đăng nhập</h2>
                {sessions.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={handleRevokeAllOthers} loading={revokingAll}>
                        Đăng xuất mọi thiết bị khác
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}
                </div>
            ) : error ? (
                <div className="text-center py-4">
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                    <button onClick={load} className="text-sm font-semibold text-accent hover:underline cursor-pointer">Thử lại</button>
                </div>
            ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Không có phiên đăng nhập nào.</p>
            ) : (
                <ul className="divide-y divide-gray-50">
                    {sessions.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{s.deviceInfo || s.userAgent || 'Thiết bị không xác định'}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {s.ipAddress} · Hoạt động lúc {new Date(s.lastActiveAt).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            <button
                                onClick={() => handleRevoke(s.id)}
                                disabled={busyId === s.id}
                                className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50 cursor-pointer"
                            >
                                <LogOut size={13} /> Đăng xuất
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SessionsCard;
