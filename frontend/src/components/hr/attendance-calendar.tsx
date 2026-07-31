import { useEffect, useMemo, useState } from 'react';
import { AnimatedSection } from '../motion/animated-section';
import {
    attendanceApi,
    attendanceStatusColors,
    attendanceStatusLabels,
    type AttendanceRecord,
} from '../../api/hr';

interface AttendanceCalendarProps {
    employeeId?: string;
    year?: number;
    month?: number; // 1-12
    isManager?: boolean;
    onManualEntry?: (date: string, record: AttendanceRecord | null) => void;
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Lịch chấm công tháng — grid 7 cột, ô ngày tô màu theo status.
 * Bấm ngày mở drawer chi tiết. Manager có thể mở modal chấm bù (callback).
 */
export default function AttendanceCalendar({
    employeeId,
    year: yearProp,
    month: monthProp,
    isManager = false,
    onManualEntry,
}: AttendanceCalendarProps) {
    const now = new Date();
    const [year, setYear] = useState(yearProp ?? now.getFullYear());
    const [month, setMonth] = useState(monthProp ?? now.getMonth() + 1); // 1-12
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        if (yearProp !== undefined) setYear(yearProp);
        if (monthProp !== undefined) setMonth(monthProp);
    }, [yearProp, monthProp]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        attendanceApi
            .list({ employeeId, year, month })
            .then(data => { if (!cancelled) setRecords(data); })
            .catch(() => { if (!cancelled) setRecords([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [employeeId, year, month]);

    const cells = useMemo(() => {
        const first = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0).getDate();
        const startOffset = first.getDay(); // 0=CN

        // Map date -> record
        const map = new Map<string, AttendanceRecord>();
        records.forEach(r => {
            const key = (r.date || '').slice(0, 10);
            if (key) map.set(key, r);
        });

        const items: Array<{ day: number | null; date?: string; record?: AttendanceRecord }> = [];
        for (let i = 0; i < startOffset; i++) items.push({ day: null });
        for (let d = 1; d <= lastDay; d++) {
            const dateStr = isoDate(new Date(Date.UTC(year, month - 1, d)));
            items.push({ day: d, date: dateStr, record: map.get(dateStr) });
        }
        return items;
    }, [records, year, month]);

    const changeMonth = (delta: number) => {
        const dt = new Date(year, month - 1 + delta, 1);
        setYear(dt.getFullYear());
        setMonth(dt.getMonth() + 1);
    };

    const goToday = () => {
        setYear(now.getFullYear());
        setMonth(now.getMonth() + 1);
    };

    const selectedRecord = selectedDate
        ? cells.find(c => c.date === selectedDate)?.record ?? null
        : null;

    return (
        <AnimatedSection className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="min-h-[36px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                        aria-label="Tháng trước"
                    >‹</button>
                    <h3 className="text-base font-bold text-slate-900 min-w-[140px] text-center">
                        Tháng {String(month).padStart(2, '0')}/{year}
                    </h3>
                    <button
                        onClick={() => changeMonth(1)}
                        className="min-h-[36px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                        aria-label="Tháng sau"
                    >›</button>
                    <button
                        onClick={goToday}
                        className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary,#e11d48)] hover:underline"
                    >Hôm nay</button>
                </div>
                {loading && <span className="text-xs text-gray-400">Đang tải...</span>}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(attendanceStatusLabels).map(([k, label]) => (
                    <span key={k} className={`text-[10px] px-2 py-0.5 rounded border ${attendanceStatusColors[k] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {label}
                    </span>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold text-gray-500 py-2">{d}</div>
                ))}
                {cells.map((c, i) => {
                    if (c.day === null) return <div key={`b-${i}`} />;
                    const rec = c.record;
                    const status = rec?.status || 'Absent';
                    const colorCls = attendanceStatusColors[status] || 'bg-gray-50 text-gray-400 border-gray-200';
                    const isToday = c.date === isoDate(new Date());
                    return (
                        <button
                            key={c.date}
                            onClick={() => setSelectedDate(c.date ?? null)}
                            className={`relative min-h-[56px] rounded-lg border ${colorCls} p-1.5 text-left hover:ring-2 hover:ring-[var(--accent-primary,#e11d48)] transition-all ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                        >
                            <span className="text-xs font-bold">{c.day}</span>
                            {rec?.lateMin ? (
                                <span className="absolute top-1 right-1 text-[9px] font-semibold text-orange-600">
                                    {rec.lateMin}'
                                </span>
                            ) : null}
                            {rec?.workHours != null && (
                                <span className="block text-[10px] mt-1 opacity-70">
                                    {Number(rec.workHours).toFixed(1)}h
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Drawer chi tiết */}
            {selectedDate && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
                    onClick={() => setSelectedDate(null)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-md p-6 space-y-3 shadow-lg"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Chi tiết ngày</p>
                                <h4 className="text-lg font-bold">
                                    {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </h4>
                            </div>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="min-h-[36px] min-w-[36px] text-gray-400 hover:text-gray-700"
                                aria-label="Đóng"
                            >✕</button>
                        </div>
                        {selectedRecord ? (
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between"><dt className="text-gray-500">Trạng thái</dt>
                                    <dd className={`text-xs px-2 py-0.5 rounded border ${attendanceStatusColors[selectedRecord.status] || ''}`}>
                                        {attendanceStatusLabels[selectedRecord.status] || selectedRecord.status}
                                    </dd>
                                </div>
                                <div className="flex justify-between"><dt className="text-gray-500">Vào</dt>
                                    <dd className="font-medium">{selectedRecord.checkInTime || selectedRecord.checkIn ? new Date(selectedRecord.checkInTime || selectedRecord.checkIn || '').toLocaleTimeString('vi-VN') : '—'}</dd>
                                </div>
                                <div className="flex justify-between"><dt className="text-gray-500">Ra</dt>
                                    <dd className="font-medium">{selectedRecord.checkOutTime || selectedRecord.checkOut ? new Date(selectedRecord.checkOutTime || selectedRecord.checkOut || '').toLocaleTimeString('vi-VN') : '—'}</dd>
                                </div>
                                <div className="flex justify-between"><dt className="text-gray-500">Giờ công</dt>
                                    <dd className="font-medium">{selectedRecord.workHours != null ? `${Number(selectedRecord.workHours).toFixed(2)}h` : '—'}</dd>
                                </div>
                                <div className="flex justify-between"><dt className="text-gray-500">Đi muộn</dt>
                                    <dd className="font-medium text-orange-600">{selectedRecord.lateMin ? `${selectedRecord.lateMin} phút` : '—'}</dd>
                                </div>
                                <div className="flex justify-between"><dt className="text-gray-500">OT được duyệt</dt>
                                    <dd className="font-medium">{selectedRecord.approvedOvertimeHours ? `${selectedRecord.approvedOvertimeHours}h` : '—'}</dd>
                                </div>
                                {selectedRecord.isManualEntry && (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                        <p className="font-semibold text-yellow-800">Chấm bù</p>
                                        {selectedRecord.manualReason && (
                                            <p className="text-yellow-700 mt-0.5">{selectedRecord.manualReason}</p>
                                        )}
                                    </div>
                                )}
                            </dl>
                        ) : (
                            <p className="text-sm text-gray-400 py-4 text-center">Chưa có bản ghi cho ngày này</p>
                        )}
                        {isManager && onManualEntry && (
                            <button
                                onClick={() => { onManualEntry(selectedDate, selectedRecord); setSelectedDate(null); }}
                                className="w-full min-h-[44px] py-2 bg-[var(--accent-primary,#e11d48)] text-white text-sm font-semibold rounded-lg hover:opacity-90"
                            >Chấm bù</button>
                        )}
                    </div>
                </div>
            )}
        </AnimatedSection>
    );
}
