import { Package, ShoppingCart, Users, DollarSign, Loader2, ArrowUpRight, Clock, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../../api/sales';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/format';

export const AdminDashboard = () => {

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: salesApi.admin.getStats
    });

    const { data: ordersData, isLoading: ordersLoading } = useQuery({
        queryKey: ['admin-recent-orders'],
        queryFn: () => salesApi.admin.getOrders(1, 10)
    });



    if (statsLoading || ordersLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-12 h-12 animate-spin text-[#D70018]" />
                <p className="mt-4 text-gray-500 font-semibold animate-pulse">Đang tải dữ liệu hệ thống...</p>
            </div>
        );
    }

    const statCards = [
        { label: 'Tổng doanh thu', value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Đơn hàng mới', value: stats?.totalOrders?.toLocaleString() || '0', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Chờ xử lý', value: stats?.pendingOrders?.toLocaleString() || '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Đã hoàn tất', value: stats?.completedOrders?.toLocaleString() || '0', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="space-y-10 pb-20 fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Chào buổi sáng, Quản trị viên</h1>
                    <p className="text-sm text-gray-500 font-medium italic">Hôm nay hệ thống đang vận hành ổn định.</p>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Hệ thống đang trực tuyến</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-full opacity-30 -mr-8 -mt-8`} />
                        <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner relative z-10`}>
                            <stat.icon size={24} />
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-10 py-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Giao dịch gần đây</h2>
                        <p className="text-xs text-gray-400 font-medium">Theo dõi hoạt động mua sắm mới nhất của khách hàng.</p>
                    </div>
                    <button className="px-6 py-3 bg-gray-50 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2">
                        Xem tất cả <ChevronRight size={16} />
                    </button>
                </div>
                <div className="divide-y divide-gray-50">
                    {ordersData?.orders.map((order) => (
                        <div key={order.id} className="group p-8 hover:bg-gray-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                                    <ShoppingCart size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-bold text-gray-900">Đơn hàng #{order.orderNumber}</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400 font-medium truncate max-w-[200px]">{order.shippingAddress || 'Trực tiếp tại shop'}</span>
                                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                        <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{order.items?.length || 0} sản phẩm</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-10">
                                <div className="text-right">
                                    <p className="text-lg font-black text-gray-900 tracking-tight">{formatCurrency(order.totalAmount)}</p>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">{new Date(order.orderDate).toLocaleTimeString()}</span>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl ring-1 shadow-sm ${order.status === 'Draft' ? 'bg-amber-50 text-amber-600 ring-amber-100' :
                                    order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' :
                                        'bg-blue-50 text-blue-600 ring-blue-100'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    {(!ordersData?.orders || ordersData.orders.length === 0) && (
                        <div className="py-20 text-center space-y-3">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-100">
                                <Package size={32} />
                            </div>
                            <p className="text-sm text-gray-400 font-medium italic">Chưa có giao dịch phát sinh hôm nay.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
