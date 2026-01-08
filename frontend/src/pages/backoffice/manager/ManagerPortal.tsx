import { Users, Target, Rocket, Zap, BarChart3, TrendingUp, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const ManagerPortal = () => {
    const navigate = useNavigate();
    const stats = [
        { label: 'Doanh thu tháng', value: '₫1.2B', icon: <TrendingUp size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'KPI Hoàn thành', value: '85%', icon: <Target size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Dự án đang chạy', value: '08', icon: <Rocket size={20} />, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'Nhân sự trực', value: '12/15', icon: <Users size={20} />, color: 'text-[#D70018]', bg: 'bg-red-50' },
    ];

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Manager <span className="text-[#D70018]">Strategy Hub</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Điều hành chiến lược, quản lý chỉ số KPI và nhân sự trực thuộc
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-3 px-8 py-4 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 group">
                        <Zap size={18} className="text-white group-hover:scale-125 transition-transform" />
                        Quick Report
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
                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                            {stat.icon}
                        </div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">{stat.label}</p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-10 bg-white border-none shadow-xl shadow-gray-200/50 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-10 text-gray-50 pointer-events-none group-hover:scale-125 transition-transform">
                        <BarChart3 size={150} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">Phân tích Hiệu suất</h3>
                    <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 max-w-sm">Theo dõi sát sao các chỉ số tăng trưởng, hiệu quả marketing và tối ưu hóa quy trình vận hành cửa hàng.</p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/backoffice/reports')}
                            className="px-6 py-3 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 hover:bg-[#b50014] transition-all"
                        >
                            Growth Analytics
                        </button>
                        <button
                            onClick={() => navigate('/backoffice/orders')}
                            className="px-6 py-3 bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-100 hover:bg-gray-100 transition-all"
                        >
                            Review Orders
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-10 bg-gray-900 border-none shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-10 text-white/5 pointer-events-none group-hover:scale-125 transition-transform">
                        <Briefcase size={150} />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Quản lý Đội ngũ</h3>
                    <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 max-w-sm">Điều phối tài nguyên nhân sự, phân bổ ca trực và giải quyết các khiếu nại khách hàng cấp quản lý.</p>
                    <button
                        onClick={() => navigate('/backoffice/hr')}
                        className="px-6 py-3 bg-white text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#D70018] hover:text-white transition-all"
                    >
                        Team Management
                    </button>
                </motion.div>
            </div>
        </div>
    );
};
