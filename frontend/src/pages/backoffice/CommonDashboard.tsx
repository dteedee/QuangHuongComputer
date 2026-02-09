import { useQuery } from '@tanstack/react-query';
import {
    ArrowUpRight, ArrowDownRight, Package,
    ShoppingCart, Users, DollarSign, TrendingUp,
    Clock, Bell, ShieldCheck, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { salesApi } from '../../api/sales';
import { adminApi, formatDate } from '../../api/admin';
import { formatCurrency } from '@/utils/format';

export const CommonDashboard = () => {
    const { data: salesStats } = useQuery({
        queryKey: ['sales', 'stats'],
        queryFn: () => salesApi.stats.get()
    });

    const { data: latestOrders } = useQuery({
        queryKey: ['sales', 'orders', 'latest'],
        queryFn: () => salesApi.orders.getList({ page: 1, pageSize: 5 })
    });

    const stats = [
        {
            label: 'Tổng doanh thu',
            value: formatCurrency(salesStats?.totalRevenue || 0),
            change: '+12.5%',
            icon: <DollarSign size={28} />,
            trend: 'up',
            color: 'bg-rose-600'
        },
        {
            label: 'Đơn hàng mới',
            value: salesStats?.todayOrders?.toString() || '0',
            change: '+5.2%',
            icon: <ShoppingCart size={28} />,
            trend: 'up',
            color: 'bg-blue-600'
        },
        {
            label: 'Đơn chờ xử lý',
            value: salesStats?.pendingOrders?.toString() || '0',
            change: '-2.4%',
            icon: <Clock size={28} />,
            trend: 'down',
            color: 'bg-amber-500'
        },
        {
            label: 'Đơn hoàn thành',
            value: salesStats?.completedOrders?.toString() || '0',
            change: 'Orders',
            icon: <Package size={28} />,
            trend: 'none',
            color: 'bg-emerald-600'
        },
    ];

    const activities = latestOrders?.slice(0, 4).map(order => ({
        type: 'order',
        title: `Đơn hàng #${order.orderNumber}`,
        user: order.customerId,
        time: formatDate(order.orderDate),
        icon: <ShoppingCart size={16} />,
        color: 'bg-blue-600'
    })) || [];

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Bảng điều khiển <span className="text-[#D70018]">Tổng quan</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                            Trung tâm điều hành Quang Hưởng Computer
                        </p>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest italic flex items-center gap-2">
                            <Clock size={14} /> LIVE: {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="px-8 py-4 bg-white border-2 border-gray-100 rounded-2xl text-xs font-black text-gray-950 uppercase tracking-widest shadow-sm hover:border-[#D70018] transition-all active:scale-95">
                        Xuất dữ liệu báo cáo
                    </button>
                    <button className="px-8 py-4 bg-gray-950 rounded-2xl text-xs font-black text-white uppercase tracking-widest shadow-2xl shadow-gray-900/30 hover:bg-black transition-all active:scale-95 flex items-center gap-3 italic">
                        <TrendingUp size={20} className="text-[#D70018]" /> Phân tích chuyên sâu
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        className="premium-card p-10 group cursor-pointer border-2 transition-all hover:border-gray-950/10 active:scale-95"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className={`p-5 ${stat.color} text-white rounded-3xl shadow-2xl shadow-gray-200 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                                {stat.icon}
                            </div>
                            {stat.trend !== 'none' && (
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                    {stat.trend === 'up' ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                                    {stat.change}
                                </div>
                            )}
                        </div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 italic">{stat.label}</p>
                        <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic leading-none">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 premium-card p-10 border-2 bg-white flex flex-col min-h-[550px] overflow-hidden">
                    <div className="flex items-center justify-between mb-14 pb-8 border-b-2 border-gray-50">
                        <div>
                            <h3 className="text-3xl font-black text-gray-950 tracking-tighter uppercase italic">Hiệu suất <span className="text-[#D70018]">Doanh thu</span></h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Phân tích dòng tiền theo chu kỳ kinh doanh 2024</p>
                        </div>
                        <select className="bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-xs font-black text-gray-950 outline-none focus:border-[#D70018] shadow-sm uppercase tracking-widest italic cursor-pointer">
                            <option>Năm hiện tại: 2024</option>
                            <option>Năm trước: 2023</option>
                        </select>
                    </div>

                    <div className="flex-1 flex items-end gap-3 md:gap-4 px-2 relative h-full">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 95, 60, 75, 100].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                                <div className="relative w-full">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ duration: 1.5, delay: i * 0.05, ease: "circOut" }}
                                        className={`w-full rounded-t-2xl transition-all duration-300 relative ${i === 11 ? 'bg-gray-950 shadow-2xl' : 'bg-gray-100 group-hover:bg-red-500 group-hover:shadow-red-500/30'}`}
                                    >
                                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-[10px] font-black px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-gray-800 shadow-2xl z-20">
                                            {h}%
                                        </div>
                                    </motion.div>
                                </div>
                                <span className={`text-[10px] font-black uppercase italic tracking-tighter ${i === 11 ? 'text-[#D70018] scale-125 underline decoration-4 underline-offset-4' : 'text-gray-300'}`}>T{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent activity */}
                <div className="premium-card p-10 border-2 bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-10 pb-8 border-b-2 border-gray-50">
                        <h3 className="text-2xl font-black text-gray-950 tracking-tighter uppercase italic flex items-center gap-3">
                            Dòng <span className="text-[#D70018]">Hoạt động</span>
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                        </h3>
                    </div>

                    <div className="space-y-10 flex-1">
                        {activities.map((act, i) => (
                            <div key={i} className="flex gap-6 group cursor-pointer items-start transition-all hover:translate-x-2">
                                <div className={`w-14 h-14 rounded-2xl ${act.color} flex-shrink-0 flex items-center justify-center text-white shadow-xl shadow-gray-200 group-hover:rotate-12 group-hover:scale-110 transition-all`}>
                                    {act.icon}
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <p className="text-base font-black text-gray-950 leading-tight group-hover:text-[#D70018] transition-colors uppercase italic tracking-tight">{act.title}</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[100px] border border-gray-100 px-2 py-0.5 rounded-md italic">ID: {act.user}</p>
                                        <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                        <p className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2 tracking-widest">
                                            <Clock size={12} className="text-gray-300" /> {act.time}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full py-5 mt-10 bg-gray-50 hover:bg-gray-100 text-gray-950 text-xs font-black uppercase tracking-widest rounded-2xl transition-all border-2 border-gray-100 flex items-center justify-center gap-3 group italic shadow-sm hover:shadow-md">
                        Xem nhật ký vận hành
                        <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform text-[#D70018]" />
                    </button>
                </div>
            </div>
        </div>
    );
};
