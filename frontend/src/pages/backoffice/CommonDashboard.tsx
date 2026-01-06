import { useEffect } from 'react';
import {
    ArrowUpRight, ArrowDownRight, Package,
    ShoppingCart, Users, DollarSign, TrendingUp,
    Clock, Bell, ShieldCheck, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const CommonDashboard = () => {
    useEffect(() => {
        toast.success('Hệ thống đã kết nối trực tuyến!', {
            icon: '🚀',
            style: {
                borderRadius: '15px',
                background: '#D70018',
                color: '#fff',
                fontWeight: 'bold'
            }
        });
    }, []);

    const stats = [
        { label: 'Tổng doanh thu', value: '$128,430', change: '+12.5%', icon: <DollarSign size={24} />, trend: 'up', color: 'bg-red-500' },
        { label: 'Đơn hàng mới', value: '43', change: '+5.2%', icon: <ShoppingCart size={24} />, trend: 'up', color: 'bg-blue-500' },
        { label: 'Khách hàng mới', value: '12', change: '-2.4%', icon: <Users size={24} />, trend: 'down', color: 'bg-amber-500' },
        { label: 'Cảnh báo kho', value: '8', change: 'Cần nhập', icon: <Package size={24} />, trend: 'none', color: 'bg-emerald-500' },
    ];

    const activities = [
        { type: 'order', title: 'Đơn hàng #9942 mới', user: 'Nguyễn Văn A', time: '5 phút trước', icon: <ShoppingCart size={14} />, color: 'bg-blue-500' },
        { type: 'repair', title: 'Đã sửa xong Laptop Dell XPS', user: 'Kỹ thuật Minh', time: '12 phút trước', icon: <Zap size={14} />, color: 'bg-amber-500' },
        { type: 'warranty', title: 'Yêu cầu bảo hành mới', user: 'Trần Thị B', time: '45 phút trước', icon: <ShieldCheck size={14} />, color: 'bg-red-500' },
        { type: 'system', title: 'Sao lưu dữ liệu hoàn tất', user: 'Hệ thống', time: '2 giờ trước', icon: <Bell size={14} />, color: 'bg-emerald-500' },
    ];

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Bảng điều khiển <span className="text-[#D70018]">Tổng quan</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <Clock size={12} /> Cập nhật lần cuối: {new Date().toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-600 uppercase shadow-sm hover:shadow-md transition-all active:scale-95">
                        Xuất báo cáo
                    </button>
                    <button className="px-6 py-3 bg-[#D70018] rounded-2xl text-xs font-black text-white uppercase shadow-lg shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 flex items-center gap-2">
                        <TrendingUp size={16} /> Xem chi tiết
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="premium-card p-6 group cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 ${stat.color} text-white rounded-2xl shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                                {stat.icon}
                            </div>
                            {stat.trend !== 'none' && (
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {stat.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                    {stat.change}
                                </div>
                            )}
                        </div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart Placeholder */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 premium-card p-8 flex flex-col min-h-[450px]"
                >
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Biểu đồ doanh thu</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hiệu suất bán hàng theo tháng</p>
                        </div>
                        <select className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-gray-600 outline-none ring-1 ring-gray-100">
                            <option>Năm 2024</option>
                            <option>Năm 2023</option>
                        </select>
                    </div>

                    <div className="flex-1 flex items-end gap-3 px-2">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 95, 60, 75, 100].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="relative w-full">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ duration: 1.5, delay: i * 0.05, ease: "circOut" }}
                                        className={`w-full rounded-t-xl transition-all duration-300 relative ${i === 11 ? 'bg-[#D70018]' : 'bg-gray-100 group-hover:bg-red-100'}`}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            {h}%
                                        </div>
                                    </motion.div>
                                </div>
                                <span className={`text-[9px] font-black uppercase ${i === 11 ? 'text-[#D70018]' : 'text-gray-400'}`}>T{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Recent activity */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-8 flex flex-col"
                >
                    <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic mb-8 flex items-center gap-3">
                        Hoạt động <span className="text-[#D70018]">Gần đây</span>
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    </h3>

                    <div className="space-y-8 flex-1">
                        {activities.map((act, i) => (
                            <div key={i} className="flex gap-4 group cursor-pointer">
                                <div className={`w-10 h-10 rounded-xl ${act.color} flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-gray-200 group-hover:rotate-12 transition-transform`}>
                                    {act.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-gray-800 leading-tight group-hover:text-[#D70018] transition-colors">{act.title}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{act.user}</p>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                            <Clock size={10} /> {act.time}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full py-4 mt-8 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-[#D70018] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-gray-100 flex items-center justify-center gap-2 group">
                        Xem tất cả hoạt động
                        <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </motion.div>
            </div>
        </div>
    );
};
