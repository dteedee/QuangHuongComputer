import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Clock, CalendarOff, BarChart3, DollarSign, Trophy, Filter } from 'lucide-react';
import { hrReportsApi } from '../../../api/hr-reports';
import { formatCurrency, formatNumber } from '../../../utils/format';

type TabId = 'attendance' | 'performance' | 'leave' | 'timesheet' | 'payroll' | 'ranking';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'attendance', label: 'Chấm công', icon: <Clock size={16} /> },
    { id: 'performance', label: 'Hiệu suất', icon: <BarChart3 size={16} /> },
    { id: 'leave', label: 'Nghỉ phép', icon: <CalendarOff size={16} /> },
    { id: 'timesheet', label: 'Chấm công giờ', icon: <Clock size={16} /> },
    { id: 'payroll', label: 'Lương', icon: <DollarSign size={16} /> },
    { id: 'ranking', label: 'Xếp hạng', icon: <Trophy size={16} /> },
];

const today = new Date();
const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
const defaultEnd = today.toISOString().split('T')[0];

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}

function AttendanceTab({ startDate, endDate }: { startDate: string; endDate: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['hr-attendance', startDate, endDate],
        queryFn: () => hrReportsApi.getAttendanceSummary(startDate, endDate),
    });
    if (isLoading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;
    if (!data) return null;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Tổng nhân viên" value={data.totalEmployees} />
                <KpiCard label="Tỷ lệ chuyên cần TB" value={`${data.avgAttendanceRate}%`} />
                <KpiCard label="Tỷ lệ đúng giờ TB" value={`${data.avgPunctualityRate}%`} />
                <KpiCard label="Tổng giờ tăng ca" value={formatNumber(Number(data.totalOTHours))} sub="giờ" />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            {['Nhân viên', 'Phòng ban', 'Chuyên cần', 'Đúng giờ', 'Có mặt', 'Trễ', 'Vắng', 'Tăng ca (h)'].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.employees.map(e => (
                            <tr key={e.employeeId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                                <td className="px-4 py-3 text-gray-500">{e.department}</td>
                                <td className="px-4 py-3">
                                    <span className={`font-medium ${e.attendanceRate >= 90 ? 'text-green-600' : e.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-500'}`}>
                                        {e.attendanceRate}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{e.punctualityRate}%</td>
                                <td className="px-4 py-3 text-green-600">{e.present}</td>
                                <td className="px-4 py-3 text-yellow-600">{e.late}</td>
                                <td className="px-4 py-3 text-red-500">{e.absent}</td>
                                <td className="px-4 py-3 text-gray-700">{e.totalOTHours}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PerformanceTab({ startDate }: { startDate: string; endDate: string }) {
    const month = new Date(startDate).getMonth() + 1;
    const year = new Date(startDate).getFullYear();
    const { data, isLoading } = useQuery({
        queryKey: ['hr-performance', month, year],
        queryFn: () => hrReportsApi.getEmployeePerformance(startDate),
    });
    if (isLoading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;
    if (!data?.length) return <div className="p-8 text-center text-gray-400">Không có dữ liệu</div>;
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        {['#', 'Nhân viên', 'Phòng ban', 'Chức vụ', 'Lương cơ bản', 'Thưởng hiệu suất', 'Thưởng chuyên cần', 'Tăng ca', 'Lương net'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {data.map(e => (
                        <tr key={e.employeeId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${e.rank <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {e.rank}
                                </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                            <td className="px-4 py-3 text-gray-500">{e.department}</td>
                            <td className="px-4 py-3 text-gray-500">{e.position}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(e.baseSalary)}</td>
                            <td className="px-4 py-3 text-green-600">{formatCurrency(e.performanceBonus)}</td>
                            <td className="px-4 py-3 text-blue-600">{formatCurrency(e.attendanceBonus)}</td>
                            <td className="px-4 py-3 text-orange-600">{formatCurrency(e.overtimePay)}</td>
                            <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(e.netPay)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function LeaveTab() {
    const year = today.getFullYear();
    const { data, isLoading } = useQuery({
        queryKey: ['hr-leave', year],
        queryFn: () => hrReportsApi.getLeaveSummary(year),
    });
    if (isLoading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;
    if (!data) return null;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <KpiCard label="Tổng ngày nghỉ" value={formatNumber(Number(data.totalLeaveDays))} sub={`Năm ${year}`} />
                <KpiCard label="Tỷ lệ sử dụng phép" value={`${data.utilizationRate}%`} sub="Trên quota 12 ngày/người" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Theo loại nghỉ</h3>
                    <div className="space-y-2">
                        {data.byType.map(t => (
                            <div key={t.type} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{t.type}</span>
                                <span className="font-medium text-gray-800">{t.totalDays} ngày ({t.count} lần)</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Theo phòng ban</h3>
                    <div className="space-y-2">
                        {data.byDepartment.map(d => (
                            <div key={d.department} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{d.department}</span>
                                <span className="font-medium text-gray-800">{d.totalDays} ngày</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TimesheetTab({ startDate, endDate }: { startDate: string; endDate: string }) {
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const { data, isLoading } = useQuery({
        queryKey: ['hr-timesheet', month, year],
        queryFn: () => hrReportsApi.getTimesheetOverview(month, year),
    });
    if (isLoading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;
    if (!data) return null;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Giờ thực tế" value={formatNumber(Number(data.totalActualHours))} sub="giờ" />
                <KpiCard label="Giờ kế hoạch" value={formatNumber(Number(data.totalPlannedHours))} sub="giờ" />
                <KpiCard label="Giờ tăng ca" value={formatNumber(Number(data.totalOTHours))} sub="giờ" />
                <KpiCard label="Hiệu suất" value={`${data.efficiencyPercent}%`} />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            {['Nhân viên', 'Phòng ban', 'Thực tế (h)', 'Kế hoạch (h)', 'Tăng ca (h)', 'Hiệu suất'].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.employees.map(e => (
                            <tr key={e.employeeId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                                <td className="px-4 py-3 text-gray-500">{e.department}</td>
                                <td className="px-4 py-3 text-gray-700">{e.actualHours}</td>
                                <td className="px-4 py-3 text-gray-500">{e.plannedHours}</td>
                                <td className="px-4 py-3 text-orange-600">{e.overtimeHours}</td>
                                <td className="px-4 py-3">
                                    <span className={`font-medium ${e.efficiency >= 90 ? 'text-green-600' : e.efficiency >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
                                        {e.efficiency}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PayrollTab() {
    const { data, isLoading } = useQuery({
        queryKey: ['hr-payroll', today.getMonth() + 1, today.getFullYear()],
        queryFn: () => hrReportsApi.getPayrollSummary(today.getMonth() + 1, today.getFullYear()),
    });
    if (isLoading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;
    if (!data) return null;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <KpiCard label="Tổng lương gross" value={formatCurrency(data.totalGrossSalary)} />
                <KpiCard label="Tổng lương net" value={formatCurrency(data.totalNetSalary)} />
                <KpiCard label="Lương net TB" value={formatCurrency(data.avgNetSalary)} />
                <KpiCard label="Tổng thưởng" value={formatCurrency(data.totalBonuses)} />
                <KpiCard label="Tổng khấu trừ" value={formatCurrency(data.totalDeductions)} />
                <KpiCard label="Bảo hiểm" value={formatCurrency(data.totalInsurance)} />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            {['Phòng ban', 'Nhân viên', 'Tổng gross', 'Tổng net', 'Lương net TB'].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.byDepartment.map(d => (
                            <tr key={d.department} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">{d.department}</td>
                                <td className="px-4 py-3 text-gray-600">{d.employeeCount}</td>
                                <td className="px-4 py-3 text-gray-700">{formatCurrency(d.totalGross)}</td>
                                <td className="px-4 py-3 font-medium text-blue-600">{formatCurrency(d.totalNet)}</td>
                                <td className="px-4 py-3 text-gray-600">{formatCurrency(d.avgNet)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RankingTab({ startDate, endDate }: { startDate: string; endDate: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['hr-ranking', startDate, endDate],
        queryFn: () => hrReportsApi.getEmployeeRanking(startDate, endDate),
    });
    if (isLoading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;
    if (!data?.length) return <div className="p-8 text-center text-gray-400">Không có dữ liệu</div>;
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        {['#', 'Nhân viên', 'Phòng ban', 'Chức vụ', 'Chuyên cần', 'Hiệu suất', 'Đúng giờ', 'Nghỉ phép', 'Tổng điểm'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {data.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                    e.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                    e.rank === 2 ? 'bg-gray-200 text-gray-600' :
                                    e.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'
                                }`}>{e.rank}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">{e.fullName}</td>
                            <td className="px-4 py-3 text-gray-500">{e.department}</td>
                            <td className="px-4 py-3 text-gray-500">{e.position}</td>
                            <td className="px-4 py-3 text-blue-600">{e.attendanceScore}</td>
                            <td className="px-4 py-3 text-green-600">{e.performanceScore}</td>
                            <td className="px-4 py-3 text-purple-600">{e.punctualityScore}</td>
                            <td className="px-4 py-3 text-orange-600">{e.leaveScore}</td>
                            <td className="px-4 py-3">
                                <span className="font-bold text-gray-800">{e.compositeScore}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function HRReportsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('attendance');
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);

    const tabContent = useMemo(() => {
        switch (activeTab) {
            case 'attendance': return <AttendanceTab startDate={startDate} endDate={endDate} />;
            case 'performance': return <PerformanceTab startDate={startDate} endDate={endDate} />;
            case 'leave': return <LeaveTab />;
            case 'timesheet': return <TimesheetTab startDate={startDate} endDate={endDate} />;
            case 'payroll': return <PayrollTab />;
            case 'ranking': return <RankingTab startDate={startDate} endDate={endDate} />;
        }
    }, [activeTab, startDate, endDate]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Users className="text-blue-600" size={22} />
                    <h1 className="text-xl font-bold text-gray-800">Báo cáo Nhân sự</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <input
                        type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <span className="text-gray-400 text-sm">—</span>
                    <input
                        type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                </div>
            </div>

            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
            >
                {tabContent}
            </motion.div>
        </div>
    );
}
