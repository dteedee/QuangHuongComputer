import { useState, useEffect } from 'react';
import { getPendingApprovals, getMyApprovalRequests, approveRequest, rejectRequest } from '../../../api/hr';

type TabKey = 'pending' | 'mine';

export default function LeaveApprovalPage() {
    const [tab, setTab] = useState<TabKey>('pending');
    const [pending, setPending] = useState<any[]>([]);
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [p, m] = await Promise.all([
                getPendingApprovals().catch(() => []),
                getMyApprovalRequests().catch(() => []),
            ]);
            setPending(Array.isArray(p) ? p : []);
            setMyRequests(Array.isArray(m) ? m : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleApprove = async (id: string) => {
        if (!confirm('Xác nhận duyệt yêu cầu này?')) return;
        try {
            await approveRequest(id);
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Lỗi khi duyệt');
        }
    };

    const handleReject = async () => {
        if (!rejectingId || !rejectReason.trim()) {
            alert('Vui lòng nhập lý do từ chối');
            return;
        }
        try {
            await rejectRequest(rejectingId, rejectReason);
            setRejectingId(null);
            setRejectReason('');
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Lỗi khi từ chối');
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            Pending: 'bg-yellow-100 text-yellow-700',
            Approved: 'bg-green-100 text-green-700',
            Rejected: 'bg-red-100 text-red-700',
            Cancelled: 'bg-gray-100 text-gray-500',
        };
        const labels: Record<string, string> = {
            Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Cancelled: 'Đã hủy',
        };
        return <span className={`text-xs px-2 py-1 rounded font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
    };

    const renderTable = (rows: any[], showActions: boolean) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                        <th className="text-left py-3 px-4 font-semibold">Nhân viên</th>
                        <th className="text-left py-3 px-4 font-semibold">Loại nghỉ</th>
                        <th className="text-left py-3 px-4 font-semibold">Từ ngày</th>
                        <th className="text-left py-3 px-4 font-semibold">Đến ngày</th>
                        <th className="text-left py-3 px-4 font-semibold">Số ngày</th>
                        <th className="text-left py-3 px-4 font-semibold">Lý do</th>
                        <th className="text-left py-3 px-4 font-semibold">Trạng thái</th>
                        {showActions && <th className="text-left py-3 px-4 font-semibold">Hành động</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {rows.length === 0 ? (
                        <tr><td colSpan={showActions ? 8 : 7} className="text-center py-10 text-gray-400">Không có dữ liệu</td></tr>
                    ) : rows.map((r: any) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-medium">{r.employeeName || r.employee?.fullName || '—'}</td>
                            <td className="py-3 px-4">{r.type}</td>
                            <td className="py-3 px-4">{r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '—'}</td>
                            <td className="py-3 px-4">{r.endDate ? new Date(r.endDate).toLocaleDateString('vi-VN') : '—'}</td>
                            <td className="py-3 px-4">{r.days}</td>
                            <td className="py-3 px-4 max-w-[180px] truncate" title={r.reason}>{r.reason || '—'}</td>
                            <td className="py-3 px-4">{statusBadge(r.status)}</td>
                            {showActions && (
                                <td className="py-3 px-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(r.id)}
                                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                        >
                                            Duyệt
                                        </button>
                                        <button
                                            onClick={() => setRejectingId(r.id)}
                                            className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Duyệt Nghỉ Phép</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex border-b border-gray-100">
                    {([['pending', 'Chờ duyệt'], ['mine', 'Yêu cầu của tôi']] as [TabKey, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-6 py-4 text-sm font-semibold transition-colors ${tab === key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {label}
                            {key === 'pending' && pending.length > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pending.length}</span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="p-4">
                    {loading ? (
                        <p className="text-center py-10 text-gray-400">Đang tải...</p>
                    ) : tab === 'pending' ? renderTable(pending, true) : renderTable(myRequests, false)}
                </div>
            </div>

            {/* Reject Modal */}
            {rejectingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Lý do từ chối</h3>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="Nhập lý do từ chối..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleReject}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
