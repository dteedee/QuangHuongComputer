import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import CheckInWidget from '../../../components/hr/check-in-widget';
import AttendanceCalendar from '../../../components/hr/attendance-calendar';
import OvertimeRequestModal from '../../../components/hr/overtime-request-modal';
import LeaveRequestModal from '../../../components/hr/leave-request-modal';
import PayslipView from '../../../components/hr/payslip-view';
import { useAuth } from '../../../context/AuthContext';
import {
    attendanceApi,
    formatCurrency,
    getMyProfile,
    getLeaveBalance,
    leavePhase06Api,
    leaveStatusLabels,
    leaveTypeLabels,
    overtimeApi,
    overtimeStatusLabels,
    payrollSelfServiceApi,
    updateMyProfile,
    type AttendanceRecord,
    type LeaveRequest,
    type OvertimeRequest,
    type Payroll,
} from '../../../api/hr';

type TabKey = 'dashboard' | 'attendance' | 'leave' | 'payslip' | 'profile';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'dashboard', label: 'Tổng quan' },
    { key: 'attendance', label: 'Bảng công' },
    { key: 'leave', label: 'Nghỉ phép & OT' },
    { key: 'payslip', label: 'Phiếu lương' },
    { key: 'profile', label: 'Hồ sơ' },
];

interface LeaveBalance {
    annualLeaveTotal?: number;
    annualLeaveUsed?: number;
    sickLeaveUsed?: number;
    pendingRequests?: number;
}

interface ProfileData {
    fullName?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    dateOfBirth?: string;
    address?: string;
    [k: string]: unknown;
}

export default function EmployeeSelfServicePage() {
    const { user } = useAuth();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [tab, setTab] = useState<TabKey>('dashboard');
    const [thisMonthRecords, setThisMonthRecords] = useState<AttendanceRecord[]>([]);
    const [payslips, setPayslips] = useState<Payroll[]>([]);
    const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
    const [myOvertimes, setMyOvertimes] = useState<OvertimeRequest[]>([]);
    const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [editProfile, setEditProfile] = useState<ProfileData | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);

    const [otModalOpen, setOtModalOpen] = useState(false);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [payslipId, setPayslipId] = useState<string | null>(null);

    const refetchAll = () => {
        attendanceApi.list({ year, month }).then(setThisMonthRecords).catch(() => setThisMonthRecords([]));
        payrollSelfServiceApi.mine(year).then(setPayslips).catch(() => setPayslips([]));
        leavePhase06Api.mine().then(setMyLeaves).catch(() => setMyLeaves([]));
        overtimeApi.mine().then(setMyOvertimes).catch(() => setMyOvertimes([]));
        getLeaveBalance().then((d: LeaveBalance) => setLeaveBalance(d)).catch(() => setLeaveBalance(null));
    };

    useEffect(() => {
        refetchAll();
        getMyProfile()
            .then((p: ProfileData) => { setProfile(p); setEditProfile(p); })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Bảng công tổng hợp mini
    const workSummary = useMemo(() => {
        const stats = { present: 0, late: 0, absent: 0, leave: 0, totalHours: 0 };
        thisMonthRecords.forEach(r => {
            if (r.status === 'Present') stats.present += 1;
            else if (r.status === 'Late') stats.late += 1;
            else if (r.status === 'Absent') stats.absent += 1;
            else if (r.status === 'OnLeave') stats.leave += 1;
            stats.totalHours += Number(r.workHours || 0);
        });
        return stats;
    }, [thisMonthRecords]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editProfile) return;
        setSavingProfile(true);
        try {
            const updated = await updateMyProfile(editProfile);
            setProfile(updated);
            toast.success('Cập nhật hồ sơ thành công');
        } catch (err) {
            const e = err as { response?: { data?: { error?: string } } };
            toast.error(e.response?.data?.error || 'Lỗi cập nhật hồ sơ');
        } finally {
            setSavingProfile(false);
        }
    };

    // -------------- Renderers --------------
    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CheckInWidget employeeId={user?.id} onChanged={refetchAll} />
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
                    <div className="flex items-baseline justify-between">
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-400">Bảng công tháng {month}/{year}</p>
                            <h3 className="text-lg font-bold text-slate-900">{workSummary.totalHours.toFixed(1)} giờ công</h3>
                        </div>
                        <button onClick={() => setTab('attendance')} className="text-xs font-semibold text-[var(--accent-primary,#e11d48)] hover:underline">Xem đầy đủ →</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center pt-2">
                        <div className="p-2 bg-green-50 rounded-lg"><p className="text-xl font-bold text-green-700">{workSummary.present}</p><p className="text-[10px] text-green-600 uppercase">Có mặt</p></div>
                        <div className="p-2 bg-orange-50 rounded-lg"><p className="text-xl font-bold text-orange-700">{workSummary.late}</p><p className="text-[10px] text-orange-600 uppercase">Đi trễ</p></div>
                        <div className="p-2 bg-red-50 rounded-lg"><p className="text-xl font-bold text-red-700">{workSummary.absent}</p><p className="text-[10px] text-red-600 uppercase">Vắng</p></div>
                        <div className="p-2 bg-blue-50 rounded-lg"><p className="text-xl font-bold text-blue-700">{workSummary.leave}</p><p className="text-[10px] text-blue-600 uppercase">Phép</p></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Leave / OT */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold">Nghỉ phép & Làm thêm giờ</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setOtModalOpen(true)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">+ Đăng ký OT</button>
                            <button onClick={() => setLeaveModalOpen(true)} className="min-h-[36px] px-3 py-1.5 text-xs font-semibold bg-[var(--accent-primary,#e11d48)] text-white rounded-lg hover:opacity-90">+ Xin phép</button>
                        </div>
                    </div>
                    {leaveBalance && (
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-blue-50 rounded-lg"><p className="text-lg font-bold text-blue-700">{(leaveBalance.annualLeaveTotal ?? 0) - (leaveBalance.annualLeaveUsed ?? 0)}</p><p className="text-[10px] text-blue-600 uppercase">Phép còn</p></div>
                            <div className="p-2 bg-yellow-50 rounded-lg"><p className="text-lg font-bold text-yellow-700">{leaveBalance.annualLeaveUsed ?? 0}</p><p className="text-[10px] text-yellow-600 uppercase">Đã dùng</p></div>
                            <div className="p-2 bg-gray-50 rounded-lg"><p className="text-lg font-bold text-gray-700">{leaveBalance.pendingRequests ?? 0}</p><p className="text-[10px] text-gray-600 uppercase">Chờ duyệt</p></div>
                        </div>
                    )}
                    <p className="text-xs font-semibold text-gray-500 uppercase pt-2">Yêu cầu gần đây</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {[...myLeaves, ...myOvertimes].length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-2">Chưa có yêu cầu</p>
                        ) : (
                            <>
                                {myLeaves.slice(0, 3).map(l => (
                                    <div key={l.id} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                                        <span>{leaveTypeLabels[l.type]} — {new Date(l.startDate).toLocaleDateString('vi-VN')}</span>
                                        <span className={`px-1.5 py-0.5 rounded ${l.status === 'Approved' ? 'bg-green-100 text-green-700' : l.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{leaveStatusLabels[l.status]}</span>
                                    </div>
                                ))}
                                {myOvertimes.slice(0, 3).map(o => (
                                    <div key={o.id} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                                        <span>OT {o.hours.toFixed(1)}h — {new Date(o.date).toLocaleDateString('vi-VN')}</span>
                                        <span className={`px-1.5 py-0.5 rounded ${o.status === 'Approved' ? 'bg-green-100 text-green-700' : o.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{overtimeStatusLabels[o.status]}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Payslips mini */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold">Phiếu lương gần đây</h3>
                        <button onClick={() => setTab('payslip')} className="text-xs font-semibold text-[var(--accent-primary,#e11d48)] hover:underline">Xem tất cả →</button>
                    </div>
                    {payslips.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-4 text-center">Chưa có phiếu lương</p>
                    ) : (
                        <div className="space-y-2">
                            {payslips.slice(0, 3).map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100" onClick={() => setPayslipId(p.id)}>
                                    <div>
                                        <p className="text-sm font-semibold">Kỳ {String(p.month).padStart(2, '0')}/{p.year}</p>
                                        <p className="text-xs text-gray-500">Thực lĩnh: <span className="font-medium">{formatCurrency(p.netPay)}</span></p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {p.status === 'Paid' ? 'Đã trả' : 'Chờ xử lý'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderAttendance = () => (
        <AttendanceCalendar employeeId={user?.id} year={year} month={month} />
    );

    const renderLeave = () => (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button onClick={() => setLeaveModalOpen(true)} className="min-h-[40px] px-4 py-2 text-sm font-semibold bg-[var(--accent-primary,#e11d48)] text-white rounded-lg hover:opacity-90">Đăng ký nghỉ phép</button>
                <button onClick={() => setOtModalOpen(true)} className="min-h-[40px] px-4 py-2 text-sm font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">Đăng ký OT</button>
            </div>

            <div>
                <h4 className="text-sm font-bold mb-2">Yêu cầu nghỉ phép</h4>
                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr><th className="text-left py-2 px-3">Loại</th><th className="text-left py-2 px-3">Từ</th><th className="text-left py-2 px-3">Đến</th><th className="text-right py-2 px-3">Số ngày</th><th className="text-left py-2 px-3">Trạng thái</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {myLeaves.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-6 text-gray-400">Chưa có yêu cầu</td></tr>
                            ) : myLeaves.map(l => (
                                <tr key={l.id}><td className="py-2 px-3">{leaveTypeLabels[l.type]}</td><td className="py-2 px-3">{new Date(l.startDate).toLocaleDateString('vi-VN')}</td><td className="py-2 px-3">{new Date(l.endDate).toLocaleDateString('vi-VN')}</td><td className="py-2 px-3 text-right">{l.days}</td><td className="py-2 px-3"><span className={`text-xs px-2 py-0.5 rounded ${l.status === 'Approved' ? 'bg-green-100 text-green-700' : l.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{leaveStatusLabels[l.status]}</span></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-bold mb-2">Yêu cầu làm thêm giờ</h4>
                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr><th className="text-left py-2 px-3">Ngày</th><th className="text-left py-2 px-3">Giờ</th><th className="text-right py-2 px-3">Số giờ</th><th className="text-left py-2 px-3">Lý do</th><th className="text-left py-2 px-3">Trạng thái</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {myOvertimes.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-6 text-gray-400">Chưa có yêu cầu</td></tr>
                            ) : myOvertimes.map(o => (
                                <tr key={o.id}><td className="py-2 px-3">{new Date(o.date).toLocaleDateString('vi-VN')}</td><td className="py-2 px-3">{o.startTime}–{o.endTime}</td><td className="py-2 px-3 text-right">{o.hours.toFixed(1)}h</td><td className="py-2 px-3 max-w-[220px] truncate" title={o.reason}>{o.reason || '—'}</td><td className="py-2 px-3"><span className={`text-xs px-2 py-0.5 rounded ${o.status === 'Approved' ? 'bg-green-100 text-green-700' : o.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{overtimeStatusLabels[o.status]}</span></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderPayslip = () => (
        <div className="space-y-3">
            {payslips.length === 0 ? (
                <p className="text-gray-400 text-center py-10">Chưa có phiếu lương</p>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr><th className="text-left py-2 px-3">Kỳ</th><th className="text-right py-2 px-3">Lương cơ bản</th><th className="text-right py-2 px-3">Thực lĩnh</th><th className="text-left py-2 px-3">Trạng thái</th><th className="text-right py-2 px-3">Hành động</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {payslips.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="py-2 px-3 font-semibold">Tháng {String(p.month).padStart(2, '0')}/{p.year}</td>
                                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(p.baseSalary)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-[var(--accent-primary,#e11d48)]">{formatCurrency(p.netPay)}</td>
                                    <td className="py-2 px-3"><span className={`text-xs px-2 py-0.5 rounded ${p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status === 'Paid' ? 'Đã trả' : p.status}</span></td>
                                    <td className="py-2 px-3 text-right">
                                        <button onClick={() => setPayslipId(p.id)} className="text-xs font-semibold text-[var(--accent-primary,#e11d48)] hover:underline">Xem chi tiết</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderProfile = () => profile ? (
        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Họ và tên</label>
                    <input value={editProfile?.fullName ?? ''} onChange={e => setEditProfile({ ...editProfile, fullName: e.target.value })} className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                    <input value={editProfile?.email ?? ''} onChange={e => setEditProfile({ ...editProfile, email: e.target.value })} type="email" className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Điện thoại</label>
                    <input value={editProfile?.phone ?? ''} onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })} className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phòng ban</label>
                    <input value={editProfile?.department ?? ''} readOnly className="w-full min-h-[40px] border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vị trí</label>
                    <input value={editProfile?.position ?? ''} readOnly className="w-full min-h-[40px] border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ngày sinh</label>
                    <input type="date" value={(editProfile?.dateOfBirth ?? '').slice(0, 10)} onChange={e => setEditProfile({ ...editProfile, dateOfBirth: e.target.value })} className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Địa chỉ</label>
                <input value={editProfile?.address ?? ''} onChange={e => setEditProfile({ ...editProfile, address: e.target.value })} className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="submit" disabled={savingProfile} className="min-h-[44px] px-6 py-2.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
        </form>
    ) : (
        <p className="text-gray-400 py-8 text-center">Đang tải hồ sơ...</p>
    );

    const content: Record<TabKey, React.ReactNode> = {
        dashboard: renderDashboard(),
        attendance: renderAttendance(),
        leave: renderLeave(),
        payslip: renderPayslip(),
        profile: renderProfile(),
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Tự phục vụ nhân viên</h1>
                {profile?.fullName && <p className="text-sm text-gray-500 mt-1">Xin chào, <span className="font-semibold">{profile.fullName}</span></p>}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`min-h-[44px] px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.key ? 'border-b-2 border-[var(--accent-primary,#e11d48)] text-[var(--accent-primary,#e11d48)]' : 'text-gray-500 hover:text-gray-700'}`}
                        >{t.label}</button>
                    ))}
                </div>
                <div className="p-6">{content[tab]}</div>
            </div>

            <OvertimeRequestModal open={otModalOpen} onClose={() => setOtModalOpen(false)} onSubmitted={() => refetchAll()} />
            <LeaveRequestModal open={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} onSubmitted={() => refetchAll()} />
            {payslipId && <PayslipView payrollId={payslipId} onClose={() => setPayslipId(null)} />}
        </div>
    );
}
