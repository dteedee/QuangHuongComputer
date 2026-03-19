import { useState, useEffect } from 'react';
import {
    Plus, CreditCard, ArrowRight,
    Tag, Star, TrendingUp, Clock, DollarSign, Package, ExternalLink,
    ShoppingCart, Percent, ShoppingBag, RefreshCw, AlertCircle, Calendar, RotateCcw
} from 'lucide-react';
import { salesApi } from '../../../api/sales';
import type { Order, SalesStats } from '../../../api/sales';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

export const SalePortal = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<SalesStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            // Mock data for demo if API fails
            const mockStats: SalesStats = {
                totalOrders: 156,
                todayOrders: 12,
                monthOrders: 45,
                monthRevenue: 45200000,
                totalRevenue: 500000000,
                pendingOrders: 8,
                completedOrders: 142,
                averageOrderValue: 3200000,
                todayRevenue: 12500000
            };

            const mockOrders: Order[] = [
                {
                    id: '1', orderNumber: 'ORD-2024001', customerId: 'CUST-001', status: 'Confirmed',
                    paymentStatus: 'Pending', fulfillmentStatus: 'Pending',
                    subtotalAmount: 12000000, discountAmount: 0, taxAmount: 1200000, shippingAmount: 0,
                    totalAmount: 13200000, taxRate: 0.1, shippingAddress: 'Hanoi', retryCount: 0,
                    orderDate: new Date().toISOString(), items: [{ productName: 'Laptop Gaming ASUS ROG', quantity: 1, unitPrice: 12000000 }]
                },
                {
                    id: '2', orderNumber: 'ORD-2024002', customerId: 'CUST-002', status: 'Paid',
                    paymentStatus: 'Paid', fulfillmentStatus: 'Pending',
                    subtotalAmount: 25000000, discountAmount: 500000, taxAmount: 2450000, shippingAmount: 0,
                    totalAmount: 26950000, taxRate: 0.1, shippingAddress: 'HCM', retryCount: 0,
                    orderDate: new Date(Date.now() - 3600000).toISOString(), items: [{ productName: 'PC Gaming Custom Build', quantity: 1, unitPrice: 25000000 }]
                },
                {
                    id: '3', orderNumber: 'ORD-2024003', customerId: 'CUST-003', status: 'Shipped',
                    paymentStatus: 'Paid', fulfillmentStatus: 'Shipped',
                    subtotalAmount: 8500000, discountAmount: 0, taxAmount: 850000, shippingAmount: 50000,
                    totalAmount: 9400000, taxRate: 0.1, shippingAddress: 'Da Nang', retryCount: 0,
                    orderDate: new Date(Date.now() - 7200000).toISOString(), items: [{ productName: 'Monitor LG 27"', quantity: 2, unitPrice: 4250000 }]
                },
            ] as Order[];

            try {
                const [ordersData, statsData] = await Promise.all([
                    salesApi.admin.getOrders({ page: 1, pageSize: 10 }),
                    salesApi.admin.getStats()
                ]);
                setOrders(ordersData.orders?.length > 0 ? ordersData.orders : mockOrders);
                setStats(statsData || mockStats);
            } catch (apiError) {
                console.warn('API error, using mock data:', apiError);
                setStats(mockStats);
                setOrders(mockOrders);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
        toast.success('Đã cập nhật dữ liệu');
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Confirmed': return { color: 'text-blue-700', bg: 'bg-blue-50', label: 'Chờ xử lý' };
            case 'Completed': return { color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Hoàn thành' };
            case 'Shipped': return { color: 'text-purple-700', bg: 'bg-purple-50', label: 'Đang giao' };
            default: return { color: 'text-gray-700', bg: 'bg-gray-50', label: status };
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D70018]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Trung tâm <span className="text-[#D70018]">Kinh doanh</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Quản lý đơn hàng, doanh thu và chương trình bán hàng
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => navigate('/backoffice/pos')}
                        className="flex items-center gap-3 px-6 py-4 bg-gray-950 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-900/20 active:scale-95 group"
                    >
                        <CreditCard size={18} className="group-hover:scale-110 transition-transform" />
                        POS Bán hàng
                    </button>
                    <button
                        onClick={() => navigate('/backoffice/pos')}
                        className="flex items-center gap-3 px-6 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[#b50014] transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        Tạo đơn hàng
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-gray-900">
                <div className="premium-card p-6 border-2 border-gray-100 transition-all hover:border-blue-500/20">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-lg">
                            <Package size={28} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-black bg-emerald-50 text-emerald-700">
                            <TrendingUp size={14} className="fill-current" /> +12%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-gray-600 font-black uppercase text-xs tracking-widest">Tổng đơn hàng</p>
                        <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic">{stats?.totalOrders || 0}</h3>
                    </div>
                </div>

                <div className="premium-card p-6 border-2 border-gray-100 transition-all hover:border-emerald-500/20">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg">
                            <DollarSign size={28} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-black bg-emerald-50 text-emerald-700">
                            <TrendingUp size={14} className="fill-current" /> +8.5%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-gray-600 font-black uppercase text-xs tracking-widest">Doanh thu tháng</p>
                        <h3 className="text-3xl font-black text-gray-950 tracking-tighter italic">{formatCurrency(stats?.monthRevenue || 0)}</h3>
                    </div>
                </div>

                <div className="premium-card p-6 border-2 border-gray-100 transition-all hover:border-amber-500/20">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-lg">
                            <Clock size={28} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-gray-600 font-black uppercase text-xs tracking-widest">Đơn chờ xử lý</p>
                        <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic">{stats?.pendingOrders || 0}</h3>
                    </div>
                </div>

                <div className="premium-card p-6 border-2 border-gray-100 transition-all hover:border-purple-500/20">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-lg">
                            <Star size={28} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-gray-600 font-black uppercase text-xs tracking-widest">Đánh giá trung bình</p>
                        <h3 className="text-4xl font-black text-gray-950 tracking-tighter italic">4.8<span className="text-lg text-gray-400">/5.0</span></h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders List */}
                <div className="lg:col-span-2 premium-card overflow-hidden border-2">
                    <div className="p-8 flex items-center justify-between border-b-2 border-gray-50">
                        <h2 className="text-2xl font-black text-gray-950 tracking-tight uppercase italic">Đơn hàng gần đây</h2>
                        <Link to="/backoffice/orders" className="flex items-center gap-2 text-sm text-[#D70018] font-black hover:underline uppercase tracking-widest">
                            Xem tất cả <ExternalLink size={16} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Mã đơn</th>
                                    <th className="px-8 py-5">Khách hàng</th>
                                    <th className="px-8 py-5">Trạng thái</th>
                                    <th className="px-8 py-5 text-right">Tổng tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((order) => {
                                    const status = getStatusInfo(order.status);
                                    return (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-gray-50/80 transition-all group cursor-pointer"
                                            onClick={() => navigate(`/backoffice/orders/${order.id}`)}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-gray-950 group-hover:text-[#D70018] transition-colors tracking-tight">#{order.orderNumber}</span>
                                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{formatDate(order.orderDate)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-sm font-bold text-gray-800">{order.customerId}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic border ${status.bg} ${status.color} border-current/20`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-gray-950 text-lg tracking-tighter italic">
                                                {formatCurrency(order.totalAmount)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions & Promo */}
                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl border-4 border-gray-100">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Tạo khuyến mãi</h3>
                            <p className="text-gray-400 text-sm font-bold mb-8 uppercase tracking-wide">Tăng doanh số với các chương trình Hot Sale</p>
                            <button className="w-full bg-[#D70018] text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95">
                                Tạo chiến dịch ngay
                            </button>
                        </div>
                        <Tag className="absolute right-[-20px] bottom-[-20px] text-white/5 rotate-12" size={180} />
                    </div>

                    <div className="premium-card p-8 border-2">
                        <h3 className="text-lg font-black text-gray-950 mb-6 uppercase italic tracking-widest border-b-2 border-red-50 pb-2">Thao tác nhanh</h3>
                        <div className="space-y-4">
                            <Link to="/backoffice/orders" className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 hover:bg-blue-50 transition-all border-2 border-transparent hover:border-blue-100 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white text-blue-600 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                        <Package size={20} />
                                    </div>
                                    <span className="text-sm font-black text-gray-800 uppercase tracking-tight">Đơn hàng</span>
                                </div>
                                <ArrowRight size={20} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                            </Link>
                            <Link to="/backoffice/coupons" className="w-full flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 hover:bg-amber-50 transition-all border-2 border-transparent hover:border-amber-100 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white text-amber-600 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                        <Percent size={20} />
                                    </div>
                                    <span className="text-sm font-black text-gray-800 uppercase tracking-tight">Mã giảm giá</span>
                                </div>
                                <ArrowRight size={20} className="text-gray-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                            </Link>
                            <Link to="/backoffice/products" className="w-full flex items-center justify-between p-4 rounded-2xl bg-purple-50/50 hover:bg-purple-50 transition-all border-2 border-transparent hover:border-purple-100 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white text-purple-600 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <span className="text-sm font-black text-gray-800 uppercase tracking-tight">Sản phẩm</span>
                                </div>
                                <ArrowRight size={20} className="text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                            </Link>
                            <Link to="/backoffice/returns" className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 hover:bg-rose-50 transition-all border-2 border-transparent hover:border-rose-100 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white text-rose-600 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                        <RotateCcw size={20} />
                                    </div>
                                    <span className="text-sm font-black text-gray-800 uppercase tracking-tight">Đổi trả</span>
                                </div>
                                <ArrowRight size={20} className="text-gray-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Orders Alert */}
            {(stats?.pendingOrders || 0) > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={24} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black text-amber-800 mb-1 text-lg">
                                Có {stats?.pendingOrders} đơn hàng cần xử lý
                            </h3>
                            <p className="text-sm text-amber-700 mb-3">
                                Vui lòng kiểm tra và cập nhật trạng thái các đơn hàng đang chờ.
                            </p>
                            <Link
                                to="/backoffice/orders?status=Pending"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors"
                            >
                                Xử lý ngay <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's Summary */}
            <div className="bg-gray-50 rounded-3xl p-6 border-2 border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <Calendar size={20} className="text-gray-500" />
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Tổng kết hôm nay</h2>
                    <span className="text-sm text-gray-500">
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                        <p className="text-3xl font-black text-blue-600">{stats?.todayOrders || 0}</p>
                        <p className="text-sm text-gray-500 font-medium">Đơn hàng</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                        <p className="text-2xl font-black text-emerald-600">{formatCurrency(stats?.todayRevenue || stats?.monthRevenue || 0)}</p>
                        <p className="text-sm text-gray-500 font-medium">Doanh thu</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                        <p className="text-2xl font-black text-purple-600">
                            {formatCurrency(stats?.averageOrderValue || (stats?.totalRevenue || 0) / (stats?.totalOrders || 1))}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">Giá trị TB/đơn</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
