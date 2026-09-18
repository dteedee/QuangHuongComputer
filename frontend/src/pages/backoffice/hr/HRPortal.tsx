import { Link } from 'react-router-dom';
import {
    Users2, ShieldAlert, Calendar, Wallet,
    UserPlus, CheckCircle, Briefcase,
    ClipboardCheck, Calculator, UserCog
} from 'lucide-react';
import { hrApi, payrollRunsApi } from '../../../api/hr';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../../../utils/format';
import { QueryBoundary } from '../../../components/ui/query-boundary';
import { Skeleton } from '../../../components/ui/Skeleton';

/**
 * HR landing dashboard. Every widget reads real data — the old "Hiệu suất TB 98%" card and the
 * "Bảng lương tháng" panel called routes that are now 410 Gone (docs/api-contracts/hr.md §8), and
 * the quick-add-employee modal hardcoded `department: 'IT'`. All removed; "Thêm nhân viên" now
 * routes to the real Employees page which has the full form + account-linking tab.
 */
export const HRPortal = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const employeesQuery = useQuery({
        queryKey: ['hr-employees', 'portal'],
        queryFn: () => hrApi.getEmployees(1, 8),
    });

    const runsQuery = useQuery({
        queryKey: ['hr-payroll-runs', 'portal', currentMonth, currentYear],
        queryFn: () => payrollRunsApi.list({ year: currentYear, month: currentMonth }),
    });

    const employees = employeesQuery.data?.items ?? [];
    const total = employeesQuery.data?.total ?? 0;
    const unlinkedCount = employees.filter((e) => !e.userId).length;

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 leading-none mb-2">
                        Quản trị <span className="text-accent">Nhân sự</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-xs flex items-center gap-2">
                        Quản lý đội ngũ nhân viên và quy trình tính lương
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link
                        to="/backoffice/hr/recruitment"
                        className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-sm shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95 group"
                    >
                        <Briefcase size={18} className="group-hover:scale-110 transition-transform" />
                        Quản lý tuyển dụng
                    </Link>
                    <Link
                        to="/backoffice/hr/employees"
                        className="flex items-center gap-3 px-8 py-4 bg-accent text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/15 hover:bg-accent-hover transition-all active:scale-95 group"
                    >
                        <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                        Thêm nhân viên
                    </Link>
                </div>
            </div>

            {/* HR Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                    { label: 'Tổng nhân sự', value: total, icon: <Users2 size={22} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Kỳ lương hiện tại', value: `${currentMonth}/${currentYear}`, icon: <Wallet size={22} />, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Đang làm việc', value: employees.filter((e) => e.status === 'Active').length, icon: <Calendar size={22} />, color: 'text-purple-500', bg: 'bg-purple-50' },
                    {
                        label: 'Chưa liên kết tài khoản', value: unlinkedCount,
                        icon: <ShieldAlert size={22} />,
                        color: unlinkedCount > 0 ? 'text-red-500' : 'text-emerald-500',
                        bg: unlinkedCount > 0 ? 'bg-red-50' : 'bg-emerald-50',
                    },
                ].map((stat, i) => (
                    <motion.div whileHover={{ y: -5 }} key={i} className="premium-card p-8 group">
                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                        <p className="text-gray-400 text-xs text-slate-500 mb-1">{stat.label}</p>
                        <h3 className="text-xl font-semibold text-slate-900">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            {/* Quick Nav Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Chấm Công', desc: 'Check-in / check-out', to: '/backoffice/hr/attendance', icon: <Calendar size={24} />, color: 'text-green-600 bg-green-50' },
                    { label: 'Duyệt Phép', desc: 'Quản lý nghỉ phép', to: '/backoffice/hr/approvals', icon: <ClipboardCheck size={24} />, color: 'text-orange-600 bg-orange-50' },
                    { label: 'Tự Phục Vụ', desc: 'Hồ sơ & phiếu lương', to: '/backoffice/hr/self-service', icon: <UserCog size={24} />, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Tham số lương/thuế/BH', desc: 'Mốc hiệu lực pháp luật', to: '/backoffice/hr/statutory-parameters', icon: <Calculator size={24} />, color: 'text-purple-600 bg-purple-50' },
                ].map(card => (
                    <Link
                        key={card.to}
                        to={card.to}
                        className="premium-card p-6 flex flex-col gap-3 hover:shadow-lg transition-all active:scale-95 group"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform`}>
                            {card.icon}
                        </div>
                        <div>
                            <p className="font-semibold text-sm  tracking-tight text-gray-900">{card.label}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">{card.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="premium-card overflow-hidden">
                    <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-900 ">Danh bạ nhân viên</h3>
                        <Link to="/backoffice/hr/employees" className="text-xs font-semibold text-accent uppercase hover:underline">Xem tất cả &gt;</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        <QueryBoundary
                            query={employeesQuery}
                            skeleton={<div className="p-8 space-y-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}
                            isEmpty={(d) => d.items.length === 0}
                            empty={{ title: 'Chưa có dữ liệu nhân sự' }}
                            errorTitle="Không tải được danh bạ nhân viên"
                        >
                            {(data) => (
                                <>
                                    {data.items.map((emp) => (
                                        <div key={emp.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group cursor-pointer">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-semibold text-gray-400 shadow-inner group-hover:bg-accent group-hover:text-white transition-all">
                                                    {emp.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 text-sm  tracking-tight flex items-center gap-2">
                                                        {emp.fullName}
                                                        {!emp.userId && <ShieldAlert size={12} className="text-amber-500" aria-label="Chưa liên kết tài khoản" />}
                                                    </h4>
                                                    <p className="text-xs font-bold text-gray-400 uppercase mt-1 flex items-center gap-2">{emp.position} <span className="w-1 h-1 bg-gray-300 rounded-full" /> {emp.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-semibold text-gray-900">{formatCurrency(emp.baseSalary)}</p>
                                                <p className="text-[9px] text-gray-400 uppercase font-semibold italic mt-1">{emp.status === 'Active' ? 'Đang làm việc' : 'Nghỉ việc/Vắng mặt'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </QueryBoundary>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="premium-card p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
                        <h3 className="text-xl font-semibold text-gray-900 ">Kỳ lương tháng {currentMonth}/{currentYear}</h3>
                        <Link to="/backoffice/hr/payroll-runs" className="text-xs font-semibold text-accent uppercase hover:underline">
                            Chạy lương &gt;
                        </Link>
                    </div>
                    <div className="space-y-4 flex-1">
                        <QueryBoundary
                            query={runsQuery}
                            skeleton={<div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}
                            isEmpty={(d) => d.length === 0}
                            empty={{
                                title: 'Chưa có kỳ lương tháng này',
                                description: 'Tạo kỳ lương tại trang Chạy lương.',
                            }}
                            errorTitle="Không tải được kỳ lương"
                        >
                            {(runs) => (
                                <>
                                    {runs.map((run) => (
                                        <Link
                                            to="/backoffice/hr/payroll-runs"
                                            key={run.id}
                                            className="p-5 bg-gray-50/50 hover:bg-white rounded-[20px] border border-transparent hover:border-blue-100 transition-all flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${run.status === 'Paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}><CheckCircle size={18} /></div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-800 leading-none mb-1.5">Kỳ lương {run.periodMonth}/{run.periodYear}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">{run.employeeCount ?? 0} nhân viên</p>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-semibold px-2 py-1 rounded-lg ${run.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {run.status}
                                            </span>
                                        </Link>
                                    ))}
                                </>
                            )}
                        </QueryBoundary>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
