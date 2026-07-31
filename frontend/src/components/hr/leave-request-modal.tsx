import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { leavePhase06Api, leaveTypeLabels, type LeaveRequest, type LeaveType } from '../../api/hr';

interface LeaveRequestModalProps {
    open: boolean;
    onClose: () => void;
    onSubmitted?: (req: LeaveRequest) => void;
}

const LEAVE_OPTIONS: LeaveType[] = ['Annual', 'Sick', 'Personal', 'Maternity', 'Bereavement', 'Unpaid'];

/** Đếm số ngày làm việc thực tế (loại trừ Chủ Nhật — client tính tạm, backend là nguồn chân lý). */
const countWorkingDays = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end < start) return 0;
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
        if (d.getDay() !== 0) count += 1; // loại trừ CN
        d.setDate(d.getDate() + 1);
    }
    return count;
};

export default function LeaveRequestModal({ open, onClose, onSubmitted }: LeaveRequestModalProps) {
    const today = new Date().toISOString().slice(0, 10);
    const [type, setType] = useState<LeaveType>('Annual');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const days = useMemo(() => countWorkingDays(startDate, endDate), [startDate, endDate]);
    const canSubmit = days > 0 && startDate <= endDate;

    const handleSubmit = async () => {
        if (!canSubmit) {
            toast.error('Vui lòng chọn khoảng ngày hợp lệ');
            return;
        }
        setLoading(true);
        try {
            const req = await leavePhase06Api.create({
                type,
                startDate,
                endDate,
                reason: reason.trim() || undefined,
            });
            toast.success('Đã gửi yêu cầu nghỉ phép');
            onSubmitted?.(req);
            onClose();
        } catch (e) {
            const err = e as { response?: { data?: { error?: string; message?: string } } };
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Gửi yêu cầu thất bại');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-lg space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Đăng ký nghỉ phép</h3>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Loại nghỉ</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value as LeaveType)}
                            className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none bg-white"
                        >
                            {LEAVE_OPTIONS.map(t => (
                                <option key={t} value={t}>{leaveTypeLabels[t]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Từ ngày</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Đến ngày</label>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Lý do</label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Ví dụ: Nghỉ về quê..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                        />
                    </div>
                </div>

                {days > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900">
                        Số ngày nghỉ (không tính CN): <span className="font-bold">{days} ngày</span>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 min-h-[44px] px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >Hủy</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !canSubmit}
                        className="flex-1 min-h-[44px] px-4 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >{loading ? 'Đang gửi...' : 'Gửi đăng ký'}</button>
                </div>
            </div>
        </div>
    );
}
