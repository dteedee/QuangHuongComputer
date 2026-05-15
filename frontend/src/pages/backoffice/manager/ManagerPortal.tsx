import { useState, useEffect } from 'react';
import { Users, Target, Rocket, Zap, BarChart3, TrendingUp, Briefcase, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { reportingApi, type BusinessOverview } from '../../../api/reporting';
import { hrApi } from '../../../api/hr';
import { formatCurrency } from '../../../utils/format';
import KpiDashboardWidgets from '../../../components/kpi-dashboard-widgets';

export const ManagerPortal = () => {
    const navigate = useNavigate();
    const [overview, setOverview] = useState<BusinessOverview | null>(null);
    const [employeeCount, setEmployeeCount] = useState({ active: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [overviewData, employeesData] = await Promise.all([
                    reportingApi.getBusinessOverview(),
                    hrApi.getEmployees(1, 100)
                ]);
                setOverview(overviewData);
                const employees = employeesData.items || [];
                const activeCount = employees.filter(e => e.status === 'Active').length;
                setEmployeeCount({ active: activeCount, total: employees.length });
            } catch (err) {
                console.error('Failed to fetch manager data:', err);
                setError('Không thể tải dữ liệu');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = [
        {
            label: 'Doanh thu tháng',
            value: overview ? formatCurrency(overview.sales.thisMonthRevenue) : '—',
            icon: <TrendingUp size={20} />,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50'
        },
        {
            label: 'Tăng trưởng',
            value: overview ? `${overview.sales.growthPercent >= 0 ? '+' : ''}${overview.sales.growthPercent.toFixed(1)}%` : '—',
            icon: <Target size={20} />,
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        {
            label: 'Sửa chữa chờ',
            value: overview ? String(overview.repairs.pendingCount).padStart(2, '0') : '—',
            icon: <Rocket size={20} />,
            color: 'text-purple-500',
            bg: 'bg-purple-50'
        },
        {
            label: 'Nhân sự',
            value: employeeCount.total > 0 ? `${employeeCount.active}/${employeeCount.total}` : '—',
            icon: <Users size={20} />,
            color: 'text-accent',
            bg: 'bg-red-50'
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle size={48} className="text-red-400" />
                <p className="text-gray-500 font-bold text-sm">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-hover transition-all"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <KpiDashboardWidgets />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 leading-none mb-2">
                        Quản lý <span className="text-accent">Trung tâm Chiến lược</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-xs flex items-center gap-2">
                        Điều hành chiến lược, quản lý chỉ số KPI và nhân sự trực thuộc
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-3 px-8 py-4 bg-accent text-white text-xs text-slate-500 rounded-lg shadow-sm shadow-blue-500/15 hover:bg-accent-hover transition-all active:scale-95 group">
                        <Zap size={18} className="text-white group-hover:scale-125 transition-transform" />
                        Báo cáo nhanh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                    <motion.div
                        whileHover={{ y: -5 }}
                        key={i}
                        className="premium-card p-8 group"
                    >
                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                            {stat.icon}
                        </div>
                        <p className="text-gray-400 text-xs text-slate-500 mb-1">{stat.label}</p>
                        <h3 className="text-xl font-semibold text-slate-900">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-10 bg-white border-none shadow-sm shadow-gray-200/50 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-10 text-gray-50 pointer-events-none group-hover:scale-125 transition-transform">
                        <BarChart3 size={150} />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900  mb-4">Phân tích Hiệu suất</h3>
                    <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 max-w-sm">Theo dõi sát sao các chỉ số tăng trưởng, hiệu quả marketing và tối ưu hóa quy trình vận hành cửa hàng.</p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/backoffice/reports')}
                            className="px-6 py-3 bg-accent text-white text-xs text-slate-500 rounded-xl shadow-lg shadow-blue-500/15 hover:bg-accent-hover transition-all"
                        >
                            Phân tích tăng trưởng
                        </button>
                        <button
                            onClick={() => navigate('/backoffice/orders')}
                            className="px-6 py-3 bg-gray-50 text-gray-500 text-xs text-slate-500 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all"
                        >
                            Duyệt đơn hàng
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-10 bg-gray-900 border-none shadow-md relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-10 text-white/5 pointer-events-none group-hover:scale-125 transition-transform">
                        <Briefcase size={150} />
                    </div>
                    <h3 className="text-2xl font-semibold text-white  mb-4">Quản lý Đội ngũ</h3>
                    <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 max-w-sm">Điều phối tài nguyên nhân sự, phân bổ ca trực và giải quyết các khiếu nại khách hàng cấp quản lý.</p>
                    <button
                        onClick={() => navigate('/backoffice/hr')}
                        className="px-6 py-3 bg-white text-gray-900 text-xs text-slate-500 rounded-xl hover:bg-accent hover:text-white transition-all"
                    >
                        Quản lý Đội ngũ
                    </button>
                </motion.div>
            </div>
        </div>
    );
};
