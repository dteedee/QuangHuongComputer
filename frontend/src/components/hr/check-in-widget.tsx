import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AnimatedSection } from '../motion/animated-section';
import {
    attendanceApi,
    hrApi,
    type AttendanceRecord,
    type CheckInMethod,
    type ShiftAssignment,
} from '../../api/hr';

type Mode = 'idle' | 'gps' | 'qr' | 'manual';

interface CheckInWidgetProps {
    employeeId?: string;
    /** Cho phép chấm hộ (manager). */
    allowManual?: boolean;
    onChanged?: (record: AttendanceRecord) => void;
}

const toIso = (d: Date) => d.toISOString().slice(0, 10);

const formatTime = (v?: string) => {
    if (!v) return '—';
    try {
        return new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return v;
    }
};

/**
 * Widget chấm công cho nhân viên: hiển thị ca hôm nay + nút chấm lớn (>=44px).
 * Hỗ trợ GPS / QR / Manual. Tôn trọng prefers-reduced-motion qua AnimatedSection.
 */
export default function CheckInWidget({ employeeId, allowManual = false, onChanged }: CheckInWidgetProps) {
    const [today, setToday] = useState<AttendanceRecord | null>(null);
    const [shift, setShift] = useState<ShiftAssignment | null>(null);
    const [weekRecords, setWeekRecords] = useState<AttendanceRecord[]>([]);
    const [mode, setMode] = useState<Mode>('idle');
    const [loading, setLoading] = useState(false);
    const [manualReason, setManualReason] = useState('');
    const [manualTime, setManualTime] = useState(new Date().toISOString().slice(0, 16));
    const [qrCode, setQrCode] = useState('');

    const todayStr = useMemo(() => toIso(new Date()), []);

    const fetchState = async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        try {
            const records = await attendanceApi.list({ employeeId, year, month });
            const todays = records.find(r => (r.date || '').slice(0, 10) === todayStr) ?? null;
            setToday(todays);

            // Tuần hiện tại (7 ngày lùi từ hôm nay)
            const start = new Date();
            start.setDate(start.getDate() - 6);
            const startStr = toIso(start);
            const week = records.filter(r => {
                const d = (r.date || '').slice(0, 10);
                return d >= startStr && d <= todayStr;
            });
            week.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            setWeekRecords(week);
        } catch {
            // Silent — backend có thể chưa sẵn sàng, UI vẫn cho thao tác
        }

        // Ca hôm nay
        if (employeeId) {
            try {
                const raw = await hrApi.shiftAssignments.getList({
                    employeeId,
                    fromDate: todayStr,
                    toDate: todayStr,
                });
                const arr: ShiftAssignment[] = Array.isArray(raw)
                    ? (raw as ShiftAssignment[])
                    : ((raw as { items?: ShiftAssignment[] })?.items ?? []);
                setShift(arr[0] ?? null);
            } catch {
                setShift(null);
            }
        }
    };

    useEffect(() => {
        void fetchState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId]);

    const attemptCheck = async (
        payload: { method: CheckInMethod; latitude?: number; longitude?: number; qrCode?: string },
    ) => {
        setLoading(true);
        try {
            const isCheckOut = !!today?.checkInTime || !!today?.checkIn;
            const rec = isCheckOut
                ? await attendanceApi.checkOut(payload)
                : await attendanceApi.checkIn(payload);
            toast.success(isCheckOut ? 'Đã chấm ra' : 'Đã chấm vào');
            setToday(rec);
            setMode('idle');
            onChanged?.(rec);
            void fetchState();
        } catch (e) {
            const err = e as { response?: { data?: { error?: string; message?: string } } };
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Chấm công thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleGps = () => {
        if (!('geolocation' in navigator)) {
            toast.error('Trình duyệt không hỗ trợ định vị');
            setMode('qr');
            return;
        }
        setMode('gps');
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                void attemptCheck({
                    method: 'GPS',
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                });
            },
            () => {
                toast.error('Không lấy được vị trí. Vui lòng dùng QR');
                setLoading(false);
                setMode('qr');
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
        );
    };

    const handleQr = () => {
        if (!qrCode.trim()) {
            toast.error('Vui lòng nhập/quét mã QR');
            return;
        }
        void attemptCheck({ method: 'QR', qrCode: qrCode.trim() });
    };

    const handleManual = async () => {
        if (!employeeId || !manualReason.trim()) {
            toast.error('Cần chọn nhân viên và ghi lý do');
            return;
        }
        setLoading(true);
        try {
            const rec = await attendanceApi.manual({
                employeeId,
                date: manualTime.slice(0, 10),
                checkIn: manualTime,
                reason: manualReason.trim(),
            });
            toast.success('Chấm bù thành công');
            setToday(rec);
            setMode('idle');
            setManualReason('');
            onChanged?.(rec);
            void fetchState();
        } catch (e) {
            const err = e as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || 'Chấm bù thất bại');
        } finally {
            setLoading(false);
        }
    };

    const status = today?.checkOutTime || today?.checkOut
        ? `Đã chấm ra lúc ${formatTime(today.checkOutTime || today.checkOut)}`
        : today?.checkInTime || today?.checkIn
            ? `Đã chấm vào lúc ${formatTime(today.checkInTime || today.checkIn)}`
            : 'Chưa chấm công';

    const isDone = !!(today?.checkOutTime || today?.checkOut);
    const primaryLabel = isDone ? 'Đã hoàn tất ca' : (today?.checkInTime || today?.checkIn) ? 'Chấm ra' : 'Chấm công';

    return (
        <AnimatedSection className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Chấm công hôm nay</p>
                    <h2 className="text-lg font-bold text-slate-900">
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {shift ? (
                            <>Ca <span className="font-semibold">{shift.shiftName ?? shift.shiftId}</span>{' '}
                                <span className="text-gray-400">— trạng thái: {shift.status}</span></>
                        ) : (
                            <span className="text-gray-400">Chưa phân ca hôm nay</span>
                        )}
                    </p>
                    <p className={`text-sm mt-1 font-medium ${isDone ? 'text-gray-500' : today?.checkInTime || today?.checkIn ? 'text-green-600' : 'text-orange-600'}`}>
                        {status}
                    </p>
                    {today?.lateMin ? (
                        <p className="text-xs text-orange-500 mt-1">⚠ Đi muộn {today.lateMin} phút</p>
                    ) : null}
                </div>
                <button
                    onClick={handleGps}
                    disabled={loading || isDone}
                    className="min-h-[56px] px-8 py-4 bg-[var(--accent-primary,#e11d48)] text-white text-base font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? 'Đang xử lý...' : primaryLabel}
                </button>
            </div>

            {/* Actions phụ */}
            {!isDone && (
                <div className="flex flex-wrap gap-2 text-xs">
                    <button
                        onClick={() => setMode('qr')}
                        className="min-h-[44px] px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
                    >
                        Chấm bằng mã QR
                    </button>
                    {allowManual && (
                        <button
                            onClick={() => setMode('manual')}
                            className="min-h-[44px] px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            Chấm hộ (Manual)
                        </button>
                    )}
                </div>
            )}

            {/* Modal QR */}
            {mode === 'qr' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg space-y-4">
                        <h3 className="text-lg font-bold">Chấm công QR</h3>
                        <p className="text-sm text-gray-500">Nhập/quét mã QR hiển thị tại quầy chi nhánh.</p>
                        <input
                            autoFocus
                            value={qrCode}
                            onChange={e => setQrCode(e.target.value)}
                            placeholder="Mã QR (đổi mỗi 30 giây)"
                            className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] focus:border-transparent outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setMode('idle'); setQrCode(''); }}
                                className="flex-1 min-h-[44px] px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >Hủy</button>
                            <button
                                onClick={handleQr}
                                disabled={loading}
                                className="flex-1 min-h-[44px] px-4 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                            >{loading ? 'Đang gửi...' : 'Xác nhận'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Manual */}
            {mode === 'manual' && allowManual && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg space-y-4">
                        <h3 className="text-lg font-bold">Chấm hộ nhân viên</h3>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Thời gian</label>
                            <input
                                type="datetime-local"
                                value={manualTime}
                                onChange={e => setManualTime(e.target.value)}
                                className="w-full min-h-[44px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Lý do (bắt buộc)</label>
                            <textarea
                                rows={3}
                                value={manualReason}
                                onChange={e => setManualReason(e.target.value)}
                                placeholder="Ví dụ: Máy chấm công hỏng, quên chấm ra..."
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setMode('idle'); setManualReason(''); }}
                                className="flex-1 min-h-[44px] px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >Hủy</button>
                            <button
                                onClick={handleManual}
                                disabled={loading}
                                className="flex-1 min-h-[44px] px-4 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                            >{loading ? 'Đang lưu...' : 'Xác nhận'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lịch sử tuần */}
            <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Lịch sử tuần</p>
                {weekRecords.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">Chưa có bản ghi</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="text-gray-500">
                                <tr>
                                    <th className="text-left py-1.5">Ngày</th>
                                    <th className="text-left">Vào</th>
                                    <th className="text-left">Ra</th>
                                    <th className="text-right">Giờ công</th>
                                    <th className="text-right">Muộn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {weekRecords.map((r, i) => (
                                    <tr key={r.id ?? i}>
                                        <td className="py-1.5 font-medium">{new Date(r.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                                        <td>{formatTime(r.checkInTime || r.checkIn)}</td>
                                        <td>{formatTime(r.checkOutTime || r.checkOut)}</td>
                                        <td className="text-right">{r.workHours != null ? `${Number(r.workHours).toFixed(1)}h` : '—'}</td>
                                        <td className="text-right text-orange-500">{r.lateMin ? `${r.lateMin}'` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AnimatedSection>
    );
}
