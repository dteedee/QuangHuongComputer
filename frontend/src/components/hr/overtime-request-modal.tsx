import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { overtimeApi, overtimeRateLabel, calculateOvertimeRate, type OvertimeRequest } from '../../api/hr';

interface OvertimeRequestModalProps {
    open: boolean;
    onClose: () => void;
    onSubmitted?: (req: OvertimeRequest) => void;
}

const WEEKDAY_LABEL = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export default function OvertimeRequestModal({ open, onClose, onSubmitted }: OvertimeRequestModalProps) {
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);
    const [startTime, setStartTime] = useState('18:00');
    const [endTime, setEndTime] = useState('20:00');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const hours = useMemo(() => {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        const start = sh + sm / 60;
        const end = eh + em / 60;
        return Math.max(0, end - start);
    }, [startTime, endTime]);

    const preview = useMemo(() => {
        try {
            const d = new Date(date);
            const rate = calculateOvertimeRate(d);
            return {
                weekday: WEEKDAY_LABEL[d.getDay()],
                rate,
                rateLabel: overtimeRateLabel(rate),
            };
        } catch {
            return { weekday: '', rate: 1.5, rateLabel: overtimeRateLabel(1.5) };
        }
    }, [date]);

    const canSubmit = date >= today && hours > 0 && startTime < endTime;

    const handleSubmit = async () => {
        if (!canSubmit) {
            toast.error('Vui lòng kiểm tra ngày và giờ');
            return;
        }
        setLoading(true);
        try {
            const req = await overtimeApi.create({ date, startTime, endTime, reason: reason.trim() || undefined });
            toast.success('Đã gửi yêu cầu OT — chờ duyệt');
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
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Đăng ký làm thêm giờ</h3>
                    <p className="text-xs text-gray-500 mt-1">Chỉ được tính tiền OT nếu đăng ký & được duyệt trước.</p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Ngày</label>
                        <input
                            type="date"
                            value={date}
                            min={today}
                            onChange={e => setDate(e.target.value)}
                            className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Bắt đầu</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Kết thúc</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Lý do</label>
                        <textarea
                            rows={2}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Ví dụ: Xử lý đơn hàng gấp cuối tháng..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                        />
                    </div>
                </div>

                {/* Preview */}
                {hours > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                        <p className="font-medium text-blue-900">
                            Đăng ký OT <span className="font-bold">{hours.toFixed(1)}</span> giờ,{' '}
                            {preview.weekday} ngày {new Date(date).toLocaleDateString('vi-VN')}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">Hệ số dự kiến: <span className="font-semibold">{preview.rateLabel}</span></p>
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
