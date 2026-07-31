import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    overtimeApi,
    overtimeStatusLabels,
    overtimeRateLabel,
    calculateOvertimeRate,
    type OvertimeRequest,
    type OvertimeRequestStatus,
} from '../../../api/hr';

type FilterStatus = 'All' | OvertimeRequestStatus;

const STATUS_COLORS: Record<OvertimeRequestStatus, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-500',
};

export default function OvertimeApprovalPage() {
    const [rows, setRows] = useState<OvertimeRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<FilterStatus>('Pending');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const fetch = async () => {
        setLoading(true);
        try {
            const data = await overtimeApi.pending();
            setRows(data);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetch(); }, []);

    const filtered = useMemo(() => {
        return rows.filter(r => {
            if (filter !== 'All' && r.status !== filter) return false;
            if (fromDate && r.date < fromDate) return false;
            if (toDate && r.date > toDate) return false;
            return true;
        });
    }, [rows, filter, fromDate, toDate]);

    const toggleSelect = (id: string) => {
        const n = new Set(selected);
        if (n.has(id)) n.delete(id); else n.add(id);
        setSelected(n);
    };

    const toggleSelectAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(r => r.id)));
        }
    };

    const doApprove = async (id: string) => {
        try {
            await overtimeApi.approve(id);
            toast.success('Đã duyệt');
            void fetch();
        } catch (e) {
            const err = e as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || 'Duyệt thất bại');
        }
    };

    const doReject = async () => {
        if (!rejectingId || !rejectReason.trim()) {
            toast.error('Vui lòng nhập lý do');
            return;
        }
        try {
            await overtimeApi.reject(rejectingId, rejectReason.trim());
            toast.success('Đã từ chối');
            setRejectingId(null);
            setRejectReason('');
            void fetch();
        } catch (e) {
            const err = e as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || 'Từ chối thất bại');
        }
    };

    const doBatchApprove = async () => {
        if (selected.size === 0) return;
        if (!confirm(`Duyệt ${selected.size} yêu cầu OT?`)) return;
        try {
            await Promise.all(Array.from(selected).map(id => overtimeApi.approve(id)));
            toast.success(`Đã duyệt ${selected.size} yêu cầu`);
            setSelected(new Set());
            void fetch();
        } catch {
            toast.error('Duyệt hàng loạt thất bại (một phần)');
            void fetch();
        }
    };

    const rateOf = (r: OvertimeRequest): number => r.expectedRate ?? calculateOvertimeRate(new Date(r.date));

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Duyệt làm thêm giờ</h1>
                <p className="text-sm text-gray-500 mt-1">Chỉ tính tiền OT đối với phần được duyệt trước ca làm.</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Trạng thái</label>
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value as FilterStatus)}
                        className="min-h-[36px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                    >
                        <option value="All">Tất cả</option>
                        <option value="Pending">Chờ duyệt</option>
                        <option value="Approved">Đã duyệt</option>
                        <option value="Rejected">Từ chối</option>
                        <option value="Cancelled">Đã hủy</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Từ ngày</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="min-h-[36px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Đến ngày</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="min-h-[36px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {selected.size > 0 && (
                        <button
                            onClick={doBatchApprove}
                            className="min-h-[36px] px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                        >Duyệt {selected.size} yêu cầu</button>
                    )}
                    <button
                        onClick={() => void fetch()}
                        className="min-h-[36px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                    >Tải lại</button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                        <tr>
                            <th className="text-left py-3 px-4 w-8">
                                <input
                                    type="checkbox"
                                    checked={filtered.length > 0 && selected.size === filtered.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">Nhân viên</th>
                            <th className="text-left py-3 px-4 font-semibold">Ngày</th>
                            <th className="text-left py-3 px-4 font-semibold">Giờ OT</th>
                            <th className="text-left py-3 px-4 font-semibold">Hệ số dự kiến</th>
                            <th className="text-left py-3 px-4 font-semibold">Lý do</th>
                            <th className="text-left py-3 px-4 font-semibold">Trạng thái</th>
                            <th className="text-left py-3 px-4 font-semibold">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-10 text-gray-400">Không có yêu cầu</td></tr>
                        ) : filtered.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(r.id)}
                                        onChange={() => toggleSelect(r.id)}
                                        disabled={r.status !== 'Pending'}
                                    />
                                </td>
                                <td className="py-3 px-4 font-medium">{r.employeeName || r.employeeId}</td>
                                <td className="py-3 px-4">{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                                <td className="py-3 px-4">
                                    <span className="font-medium">{r.startTime}–{r.endTime}</span>
                                    <span className="ml-2 text-xs text-gray-400">({r.hours.toFixed(1)}h)</span>
                                </td>
                                <td className="py-3 px-4 text-xs">{overtimeRateLabel(rateOf(r))}</td>
                                <td className="py-3 px-4 max-w-[220px] truncate" title={r.reason}>{r.reason || '—'}</td>
                                <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[r.status]}`}>
                                        {overtimeStatusLabels[r.status]}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    {r.status === 'Pending' ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => doApprove(r.id)}
                                                className="min-h-[32px] text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                                            >Duyệt</button>
                                            <button
                                                onClick={() => setRejectingId(r.id)}
                                                className="min-h-[32px] text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                                            >Từ chối</button>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Reject modal */}
            {rejectingId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-lg space-y-4">
                        <h3 className="text-lg font-bold">Lý do từ chối OT</h3>
                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-red-500 outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="flex-1 min-h-[44px] px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >Hủy</button>
                            <button
                                onClick={doReject}
                                className="flex-1 min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                            >Xác nhận từ chối</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
