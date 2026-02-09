import { Package, ShoppingCart, Users, DollarSign, Loader2, ArrowUpRight, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../../api/sales';

export const AdminDashboard = () => {

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: salesApi.admin.getStats
    });

    const { data: ordersData, isLoading: ordersLoading } = useQuery({
        queryKey: ['admin-recent-orders'],
        queryFn: () => salesApi.admin.getOrders(1, 10)
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    if (statsLoading || ordersLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[500px] admin-area">
                <Loader2 className="w-16 h-16 animate-spin text-[#D70018]" />
                <p className="mt-6 text-gray-950 font-black uppercase tracking-widest italic animate-pulse">Khởi tạo trung tâm điều hành...</p>
            </div>
        );
    }

    const statCards = [
        { label: 'Tổng doanh thu', value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: 'bg-rose-600' },
        { label: 'Số lượng đơn hàng', value: stats?.totalOrders?.toLocaleString() || '0', icon: ShoppingCart, color: 'bg-blue-600' },
        { label: 'Đơn chờ xử lý', value: stats?.pendingOrders?.toLocaleString() || '0', icon: Clock, color: 'bg-amber-500' },
        { label: 'Đơn hoàn tất', value: stats?.completedOrders?.toLocaleString() || '0', icon: Package, color: 'bg-emerald-600' },
    ];

    return (
        <div className="space-y-12 pb-24 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <h1 className="text-5xl font-black text-gray-950 tracking-tighter uppercase italic leading-none mb-3">
                        Hệ thống <span className="text-[#D70018]">Tổng quan</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2 italic">
                            Giám sát hoạt động kinh doanh trực tiếp
                        </p>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="premium-card p-10 border-2 bg-white transition-all hover:border-gray-950/10 group active:scale-95"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className={`${stat.color} p-5 rounded-3xl shadow-2xl shadow-gray-200 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                                <stat.icon size={28} className="text-white" />
                            </div>
                            <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-widest shadow-sm italic">
                                <ArrowUpRight size={14} /> LIVE
                            </div>
                        </div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 italic">{stat.label}</p>
                        <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic leading-none">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="premium-card border-2 bg-white overflow-hidden">
                <div className="p-10 border-b-2 border-gray-50 flex items-center justify-between bg-gray-50/20">
                    <div>
                        <h2 className="text-3xl font-black text-gray-950 tracking-tighter uppercase italic leading-none">Giao dịch <span className="text-[#D70018]">Hiện tại</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 italic">Danh sách 10 đơn hàng phát sinh gần nhất</p>
                    </div>
                    <button className="px-8 py-4 bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-900/40 hover:bg-black transition-all active:scale-95 italic">
                        Xem chi tiết tất cả đơn
                    </button>
                </div>
                <div className="divide-y-2 divide-gray-50">
                    {ordersData?.orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-10 hover:bg-gray-50/80 transition-all group cursor-pointer">
                            <div className="flex items-center gap-8">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-gray-950 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                    <ShoppingCart size={32} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-gray-950 italic uppercase tracking-tighter">Đơn hàng #{order.orderNumber}</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <p className="text-xs font-black text-gray-400 uppercase italic truncate max-w-md">{order.shippingAddress || 'Trực tiếp tại cửa hàng'}</p>
                                        <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                        <p className="text-xs font-black text-[#D70018] uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">{order.items?.length || 0} sản phẩm</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-3">
                                <p className="text-2xl font-black text-gray-950 tracking-tighter italic underline decoration-[#D70018] decoration-4 underline-offset-4">{formatCurrency(order.totalAmount)}</p>
                                <span className={`text-[10px] font-black uppercase tracking-widest italic px-5 py-2 rounded-2xl border-2 shadow-sm ${order.status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>{order.status}</span>
                            </div>
                        </div>
                    ))}
                    {(ordersData?.orders.length || 0) === 0 && (
                        <div className="py-24 text-center">
                            <ShoppingCart size={80} className="mx-auto text-gray-100 mb-6" />
                            <p className="text-gray-400 font-black uppercase italic tracking-widest">Hiện tại hệ thống chưa ghi nhận giao dịch mới.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
