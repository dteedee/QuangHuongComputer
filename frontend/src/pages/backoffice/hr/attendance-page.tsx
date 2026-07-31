import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import CheckInWidget from '../../../components/hr/check-in-widget';
import AttendanceCalendar from '../../../components/hr/attendance-calendar';
import {
    attendanceApi,
    attendanceStatusColors,
    attendanceStatusLabels,
    hrApi,
    timesheetApi,
    type AttendanceRecord,
    type AttendanceQrCode,
    type Employee,
} from '../../../api/hr';
import { useAuth } from '../../../context/AuthContext';

type ViewMode = 'table' | 'calendar';

const isManagerRole = (roles?: string[]) => !!roles && roles.some(r => ['Admin', 'Manager', 'HR'].includes(r));

export default function AttendancePage() {
    const { user } = useAuth();
    const canManage = isManagerRole(user?.roles);

    const now = new Date();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState('');
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<ViewMode>('table');

    const [qrOpen, setQrOpen] = useState(false);
    const [qr, setQr] = useState<AttendanceQrCode | null>(null);
    const [qrLoading, setQrLoading] = useState(false);

    const [batchMonth, setBatchMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [batchLoading, setBatchLoading] = useState(false);

    // Load employees (manager only)
    useEffect(() => {
        if (!canManage) return;
        hrApi.employees
            .getList(1, 200)
            .then(r => setEmployees(r.items || []))
            .catch(() => setEmployees([]));
    }, [canManage]);

    // Load records
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        attendanceApi
            .list({ employeeId: employeeId || undefined, year, month })
            .then(data => { if (!cancelled) setRecords(data); })
            .catch(() => { if (!cancelled) setRecords([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [employeeId, year, month]);

    // QR auto-refresh every 30s
    useEffect(() => {
        if (!qrOpen) return;
        let cancelled = false;
        const refresh = () => {
            setQrLoading(true);
            attendanceApi
                .qrCode()
                .then(d => { if (!cancelled) setQr(d); })
                .catch(() => { if (!cancelled) setQr(null); })
                .finally(() => { if (!cancelled) setQrLoading(false); });
        };
        refresh();
        const timer = window.setInterval(refresh, 30000);
        return () => { cancelled = true; window.clearInterval(timer); };
    }, [qrOpen]);

    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
    const toggleEmp = (id: string) => {
        const n = new Set(selectedEmployees);
        if (n.has(id)) n.delete(id); else n.add(id);
        setSelectedEmployees(n);
    };

    const doAggregate = async () => {
        if (selectedEmployees.size === 0) {
            toast.error('Chọn ít nhất 1 nhân viên');
            return;
        }
        const [y, m] = batchMonth.split('-').map(Number);
        setBatchLoading(true);
        try {
            await Promise.all(Array.from(selectedEmployees).map(id => timesheetApi.aggregate(id, y, m)));
            toast.success(`Đã tổng hợp ${selectedEmployees.size} bảng công`);
            setSelectedEmployees(new Set());
        } catch (e) {
            const err = e as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || 'Tổng hợp thất bại');
        } finally {
            setBatchLoading(false);
        }
    };

    const monthlyStats = useMemo(() => {
        const stats: Record<string, number> = {};
        records.forEach(r => { stats[r.status] = (stats[r.status] || 0) + 1; });
        return stats;
    }, [records]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Chấm công</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {canManage ? 'Quản lý bảng công nhân viên & phân ca' : 'Ghi nhận giờ vào/ra và theo dõi công tháng'}
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setQrOpen(true)}
                        className="min-h-[40px] px-4 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90"
                    >In mã QR chấm công</button>
                )}
            </div>

            {/* Nhân viên tự chấm */}
            {!canManage && <CheckInWidget onChanged={() => { /* trigger refetch via key change if needed */ }} />}

            {/* Filter bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-3">
                {canManage && (
                    <div className="min-w-[220px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Nhân viên</label>
                        <select
                            value={employeeId}
                            onChange={e => setEmployeeId(e.target.value)}
                            className="w-full min-h-[36px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                        >
                            <option value="">— Tất cả —</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Năm</label>
                    <input
                        type="number"
                        min={2020}
                        max={2100}
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        className="w-24 min-h-[36px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tháng</label>
                    <select
                        value={month}
                        onChange={e => setMonth(Number(e.target.value))}
                        className="min-h-[36px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setView('table')}
                        className={`min-h-[36px] px-4 py-1.5 text-sm rounded-lg font-medium border ${view === 'table' ? 'bg-[var(--accent-primary,#e11d48)] text-white border-transparent' : 'border-gray-200 hover:bg-gray-50'}`}
                    >Bảng</button>
                    <button
                        onClick={() => setView('calendar')}
                        className={`min-h-[36px] px-4 py-1.5 text-sm rounded-lg font-medium border ${view === 'calendar' ? 'bg-[var(--accent-primary,#e11d48)] text-white border-transparent' : 'border-gray-200 hover:bg-gray-50'}`}
                    >Lịch</button>
                </div>
            </div>

            {/* Stats */}
            {records.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {Object.entries(attendanceStatusLabels).map(([k, label]) => (
                        <div key={k} className={`rounded-xl p-3 text-center border ${attendanceStatusColors[k] || 'border-gray-200 bg-gray-50'}`}>
                            <p className="text-xl font-bold">{monthlyStats[k] || 0}</p>
                            <p className="text-xs font-medium mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Main content */}
            {view === 'calendar' ? (
                <AttendanceCalendar
                    employeeId={employeeId || user?.id}
                    year={year}
                    month={month}
                    isManager={canManage}
                    onManualEntry={(date) => toast(`Chấm bù ngày ${date} — dùng widget chấm hộ ở trang self-service`, { icon: 'ℹ️' })}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold">Ngày</th>
                                {canManage && <th className="text-left py-3 px-4 font-semibold">Nhân viên</th>}
                                <th className="text-left py-3 px-4 font-semibold">Vào</th>
                                <th className="text-left py-3 px-4 font-semibold">Ra</th>
                                <th className="text-right py-3 px-4 font-semibold">Giờ công</th>
                                <th className="text-right py-3 px-4 font-semibold">Muộn</th>
                                <th className="text-right py-3 px-4 font-semibold">OT duyệt</th>
                                <th className="text-left py-3 px-4 font-semibold">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={canManage ? 8 : 7} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
                            ) : records.length === 0 ? (
                                <tr><td colSpan={canManage ? 8 : 7} className="text-center py-10 text-gray-400">Không có dữ liệu</td></tr>
                            ) : records.map((r, i) => (
                                <tr key={r.id ?? i} className="hover:bg-gray-50">
                                    <td className="py-2 px-4">{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                                    {canManage && <td className="py-2 px-4">{r.employeeName || r.employeeId || '—'}</td>}
                                    <td className="py-2 px-4">{r.checkInTime || r.checkIn ? new Date(r.checkInTime || r.checkIn || '').toLocaleTimeString('vi-VN') : '—'}</td>
                                    <td className="py-2 px-4">{r.checkOutTime || r.checkOut ? new Date(r.checkOutTime || r.checkOut || '').toLocaleTimeString('vi-VN') : '—'}</td>
                                    <td className="py-2 px-4 text-right">{r.workHours != null ? `${Number(r.workHours).toFixed(1)}h` : '—'}</td>
                                    <td className="py-2 px-4 text-right text-orange-600">{r.lateMin ? `${r.lateMin}'` : '—'}</td>
                                    <td className="py-2 px-4 text-right">{r.approvedOvertimeHours ? `${r.approvedOvertimeHours}h` : '—'}</td>
                                    <td className="py-2 px-4">
                                        <span className={`text-xs px-2 py-0.5 rounded border ${attendanceStatusColors[r.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                            {attendanceStatusLabels[r.status] || r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Batch aggregate */}
            {canManage && employees.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-bold text-slate-900">Tổng hợp bảng công hàng loạt</h3>
                        <div className="flex items-center gap-2">
                            <input
                                type="month"
                                value={batchMonth}
                                onChange={e => setBatchMonth(e.target.value)}
                                className="min-h-[36px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                            />
                            <button
                                onClick={doAggregate}
                                disabled={batchLoading || selectedEmployees.size === 0}
                                className="min-h-[36px] px-4 py-1.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                            >{batchLoading ? 'Đang tổng hợp...' : `Tổng hợp (${selectedEmployees.size})`}</button>
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                        {employees.map(emp => (
                            <label key={emp.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedEmployees.has(emp.id)}
                                    onChange={() => toggleEmp(emp.id)}
                                />
                                <span className="font-medium">{emp.fullName}</span>
                                <span className="text-xs text-gray-400">— {emp.department}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* QR modal */}
            {qrOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setQrOpen(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-lg text-center space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold">Mã QR chấm công</h3>
                        <p className="text-xs text-gray-500">Đổi mỗi 30 giây. In & dán tại quầy chi nhánh.</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[220px] flex items-center justify-center">
                            {qrLoading ? (
                                <span className="text-sm text-gray-400">Đang tạo mã...</span>
                            ) : qr ? (
                                <div className="w-full">
                                    <p className="font-mono text-xs break-all">{qr.qrData}</p>
                                    <p className="text-xs text-gray-400 mt-3">Hết hạn sau {qr.expiresIn}s</p>
                                </div>
                            ) : (
                                <span className="text-sm text-red-500">Không tạo được mã. Kiểm tra kết nối.</span>
                            )}
                        </div>
                        <button
                            onClick={() => setQrOpen(false)}
                            className="w-full min-h-[44px] py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                        >Đóng</button>
                    </div>
                </div>
            )}
        </div>
    );
}
