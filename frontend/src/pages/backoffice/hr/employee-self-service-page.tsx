import { useState, useEffect } from 'react';
import { getMyProfile, updateMyProfile, getLeaveBalance, getMyPayslips, getHolidays } from '../../../api/hr';

type TabKey = 'profile' | 'payslips' | 'leave' | 'holidays';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'profile', label: 'Hồ Sơ' },
    { key: 'payslips', label: 'Phiếu Lương' },
    { key: 'leave', label: 'Nghỉ Phép' },
    { key: 'holidays', label: 'Ngày Lễ' },
];

export default function EmployeeSelfServicePage() {
    const [tab, setTab] = useState<TabKey>('profile');
    const [profile, setProfile] = useState<any>(null);
    const [editProfile, setEditProfile] = useState<any>(null);
    const [leaveBalance, setLeaveBalance] = useState<any>(null);
    const [payslips, setPayslips] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getMyProfile().then(d => { setProfile(d); setEditProfile(d); }).catch(() => {});
        getLeaveBalance().catch(() => {});
        getMyPayslips().then(d => setPayslips(Array.isArray(d) ? d : [])).catch(() => {});
        getHolidays(new Date().getFullYear()).then(d => setHolidays(Array.isArray(d) ? d : [])).catch(() => {});
        getLeaveBalance().then(setLeaveBalance).catch(() => {});
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await updateMyProfile(editProfile);
            setProfile(updated);
            alert('Cập nhật hồ sơ thành công!');
        } catch (e: any) {
            alert(e.response?.data?.error || 'Lỗi cập nhật hồ sơ');
        }
        setSaving(false);
    };

    const renderProfile = () => (
        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Họ và tên</label>
                    <input
                        value={editProfile?.fullName || ''}
                        onChange={e => setEditProfile({ ...editProfile, fullName: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</label>
                    <input
                        value={editProfile?.email || ''}
                        onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                        type="email"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Điện thoại</label>
                    <input
                        value={editProfile?.phone || ''}
                        onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phòng ban</label>
                    <input
                        value={editProfile?.department || ''}
                        readOnly
                        className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Vị trí</label>
                    <input
                        value={editProfile?.position || ''}
                        readOnly
                        className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ngày sinh</label>
                    <input
                        type="date"
                        value={editProfile?.dateOfBirth?.slice(0, 10) || ''}
                        onChange={e => setEditProfile({ ...editProfile, dateOfBirth: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Địa chỉ</label>
                <input
                    value={editProfile?.address || ''}
                    onChange={e => setEditProfile({ ...editProfile, address: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
        </form>
    );

    const renderPayslips = () => (
        <div className="space-y-3">
            {payslips.length === 0 ? (
                <p className="text-gray-400 text-center py-10">Chưa có phiếu lương</p>
            ) : payslips.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div>
                        <p className="font-semibold text-sm">Tháng {p.month}/{p.year}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Lương net: <span className="font-medium text-gray-800">{p.netPay?.toLocaleString('vi-VN')} ₫</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {p.status === 'Paid' ? 'Đã thanh toán' : 'Chờ xử lý'}
                        </span>
                        <button className="text-xs text-blue-600 hover:underline">Tải xuống</button>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderLeave = () => (
        <div className="space-y-6">
            {leaveBalance && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Phép năm còn lại', value: (leaveBalance.annualLeaveTotal || 0) - (leaveBalance.annualLeaveUsed || 0) },
                        { label: 'Đã dùng (năm)', value: leaveBalance.annualLeaveUsed || 0 },
                        { label: 'Nghỉ ốm đã dùng', value: leaveBalance.sickLeaveUsed || 0 },
                        { label: 'Yêu cầu đang chờ', value: leaveBalance.pendingRequests || 0 },
                    ].map(s => (
                        <div key={s.label} className="bg-blue-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-blue-700">{s.value}</p>
                            <p className="text-xs text-blue-500 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}
            <p className="text-sm text-gray-500">
                Để tạo yêu cầu nghỉ phép, vui lòng sử dụng chức năng Duyệt Phép hoặc liên hệ phòng Nhân sự.
            </p>
        </div>
    );

    const renderHolidays = () => (
        <div className="space-y-2">
            {holidays.length === 0 ? (
                <p className="text-gray-400 text-center py-10">Không có dữ liệu ngày lễ</p>
            ) : holidays.map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                        <p className="text-sm font-medium">{h.name}</p>
                        {h.description && <p className="text-xs text-gray-400 mt-0.5">{h.description}</p>}
                    </div>
                    <span className="text-sm text-gray-500 font-medium">
                        {h.date ? new Date(h.date).toLocaleDateString('vi-VN') : '—'}
                    </span>
                </div>
            ))}
        </div>
    );

    const tabContent: Record<TabKey, React.ReactNode> = {
        profile: profile ? renderProfile() : <p className="text-gray-400 py-8 text-center">Đang tải hồ sơ...</p>,
        payslips: renderPayslips(),
        leave: renderLeave(),
        holidays: renderHolidays(),
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Tự Phục Vụ Nhân Viên</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="p-6">{tabContent[tab]}</div>
            </div>
        </div>
    );
}
