import { LayoutDashboard, Shield, Users, Lock, Key, Activity, Heart, Globe, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const AdminPortal = () => {
    const navigate = useNavigate();
    const stats = [
        { label: 'System Health', value: '99.9%', icon: <Heart size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Active Sessions', value: '142', icon: <Users size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Security Alerts', value: '0', icon: <Shield size={20} />, color: 'text-[#D70018]', bg: 'bg-red-50' },
        { label: 'Failed Logins', value: '12', icon: <Lock size={20} />, color: 'text-amber-500', bg: 'bg-amber-50' },
    ];

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Admin <span className="text-[#D70018]">Command Center</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Giám sát hệ thống toàn cục và cấu hình đặc quyền
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 group">
                        <Terminal size={18} className="text-[#D70018]" />
                        System Logs
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
                        <Key size={150} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">Quản lý định danh</h3>
                    <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 max-w-sm">Cấp phát quyền hạn (RBAC), quản lý token người dùng và thiết lập bảo mật 2 lớp toàn hệ thống.</p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/backoffice/users')}
                            className="px-6 py-3 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 hover:bg-[#b50014] transition-all"
                        >
                            Identity Hub
                        </button>
                        <button
                            onClick={() => navigate('/backoffice/roles')}
                            className="px-6 py-3 bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-100 hover:bg-gray-100 transition-all"
                        >
                            Role Manager
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-10 bg-gray-900 border-none shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-10 text-white/5 pointer-events-none group-hover:scale-125 transition-transform">
                        <Activity size={150} />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Monitor & Observability</h3>
                    <p className="text-gray-400 text-xs font-bold leading-relaxed mb-8 max-w-sm">Giám sát tải CPU, bộ nhớ RAM và băng thông của các microservices trong thời gian thực.</p>
                    <button className="px-6 py-3 bg-white text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#D70018] hover:text-white transition-all">
                        Open Grafana Panel
                    </button>
                </motion.div>
            </div>
        </div>
    );
};
