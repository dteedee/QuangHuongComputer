import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getPendingApprovals, getMyApprovalRequests, approveRequest, rejectRequest } from '../../../api/hr';
import { useConfirm } from '../../../context/ConfirmContext';
import { QueryBoundary } from '../../../components/ui/query-boundary';
import { Skeleton } from '../../../components/ui/Skeleton';

type TabKey = 'pending' | 'mine';

interface ApprovalRow {
    id: string;
    employeeName?: string;
    employee?: { fullName?: string };
    type: string;
    startDate?: string;
    endDate?: string;
    days?: number;
    reason?: string;
    status: string;
}

const STATUS_MAP: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-500',
};
const STATUS_LABEL: Record<string, string> = {
    Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Cancelled: 'Đã hủy',
};

function errMsg(e: unknown, fallback: string): string {
    const err = e as { response?: { data?: { error?: string } } };
    return err?.response?.data?.error || fallback;
}

export default function LeaveApprovalPage() {
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [tab, setTab] = useState<TabKey>('pending');
    const [rejectReason, setRejectReason] = useState('');
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    const pendingQuery = useQuery({
        queryKey: ['hr-leave-approvals', 'pending'],
        queryFn: () => getPendingApprovals() as Promise<ApprovalRow[]>,
    });
    const mineQuery = useQuery({
        queryKey: ['hr-leave-approvals', 'mine'],
        queryFn: () => getMyApprovalRequests() as Promise<ApprovalRow[]>,
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['hr-leave-approvals'] });
    };

    const approveMutation = useMutation({
        mutationFn: (id: string) => approveRequest(id),
        onSuccess: () => { toast.success('Đã duyệt'); invalidate(); },
        onError: (e) => toast.error(errMsg(e, 'Lỗi khi duyệt')),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectRequest(id, reason),
        onSuccess: () => { toast.success('Đã từ chối'); setRejectingId(null); setRejectReason(''); invalidate(); },
        onError: (e) => toast.error(errMsg(e, 'Lỗi khi từ chối')),
    });

    const handleApprove = async (id: string) => {
        const ok = await confirm({ message: 'Xác nhận duyệt yêu cầu này?', variant: 'warning' });
        if (ok) approveMutation.mutate(id);
    };

    const handleReject = () => {
        if (!rejectingId || !rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }
        rejectMutation.mutate({ id: rejectingId, reason: rejectReason.trim() });
    };

    const statusBadge = (status: string) => (
        <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_MAP[status] || 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[status] || status}
        </span>
    );

    const renderTable = (rows: ApprovalRow[], showActions: boolean) => (
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
                    ) : rows.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-medium">{r.employeeName || r.employee?.fullName || '—'}</td>
                            <td className="py-3 px-4">{r.type}</td>
                            <td className="py-3 px-4">{r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '—'}</td>
                            <td className="py-3 px-4">{r.endDate ? new Date(r.endDate).toLocaleDateString('vi-VN') : '—'}</td>
                            <td className="py-3 px-4">{r.days ?? '—'}</td>
                            <td className="py-3 px-4 max-w-[180px] truncate" title={r.reason}>{r.reason || '—'}</td>
                            <td className="py-3 px-4">{statusBadge(r.status)}</td>
                            {showActions && (
                                <td className="py-3 px-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(r.id)}
                                            disabled={approveMutation.isPending}
                                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
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

    const activeQuery = tab === 'pending' ? pendingQuery : mineQuery;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Duyệt Nghỉ Phép</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex border-b border-gray-100">
                    {([['pending', 'Chờ duyệt'], ['mine', 'Yêu cầu của tôi']] as [TabKey, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-6 py-4 text-sm font-semibold transition-colors ${tab === key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {label}
                            {key === 'pending' && (pendingQuery.data?.length ?? 0) > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingQuery.data?.length}</span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="p-4">
                    <QueryBoundary
                        query={activeQuery}
                        skeleton={<div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}
                        isEmpty={(d) => d.length === 0}
                        empty={{ title: tab === 'pending' ? 'Không có yêu cầu chờ duyệt' : 'Bạn chưa gửi yêu cầu nào' }}
                        errorTitle="Không tải được danh sách nghỉ phép"
                    >
                        {(rows) => renderTable(rows, tab === 'pending')}
                    </QueryBoundary>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Lý do từ chối</h3>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="Nhập lý do từ chối..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                                disabled={rejectMutation.isPending}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
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
