import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { salesApi, type Order, type OrderStatus } from '../../api/sales';
import { Package, Search, Filter, Eye, XCircle, RotateCcw, Clock, CheckCircle, Truck, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

const statusConfig: Record<OrderStatus, { label: string; icon: JSX.Element; color: string; bgColor: string }> = {
    'Pending': { label: 'Chờ xử lý', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    'Confirmed': { label: 'Đã xác nhận', icon: <CheckCircle className="w-4 h-4" />, color: 'text-blue-700', bgColor: 'bg-blue-100' },
    'Paid': { label: 'Đã thanh toán', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    'Shipped': { label: 'Đang giao', icon: <Truck className="w-4 h-4" />, color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
    'Delivered': { label: 'Đã giao', icon: <Package className="w-4 h-4" />, color: 'text-green-700', bgColor: 'bg-green-100' },
    'Cancelled': { label: 'Đã hủy', icon: <Ban className="w-4 h-4" />, color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const OrdersPage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await salesApi.getMyOrders();
            setOrders(data);
        } catch (error) {
            toast.error('Không thể tải danh sách đơn hàng');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesFilter = filter === 'all' || order.status === filter;
        const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const canCancel = (order: Order) => {
        return order.status === 'Pending' || order.status === 'Confirmed';
    };

    const canReturn = (order: Order) => {
        return order.status === 'Delivered';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D70018]"></div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-10 font-sans">
            <div className="max-w-[1400px] mx-auto px-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-red-100 rounded-2xl text-[#D70018]">
                        <Package size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Đơn hàng của tôi</h2>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                            {filteredOrders.length} đơn hàng
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-[24px] p-6 mb-6 border border-gray-100 shadow-sm">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo mã đơn hàng..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D70018] focus:border-transparent font-medium text-sm"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto">
                            <Filter className="text-gray-400 w-5 h-5 flex-shrink-0" />
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all whitespace-nowrap ${
                                    filter === 'all'
                                        ? 'bg-[#D70018] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Tất cả
                            </button>
                            {Object.keys(statusConfig).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status as OrderStatus)}
                                    className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all whitespace-nowrap ${
                                        filter === status
                                            ? 'bg-[#D70018] text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {statusConfig[status as OrderStatus].label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-[24px] p-16 text-center border border-gray-100">
                        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic">Không có đơn hàng</h3>
                        <p className="text-gray-500 font-medium">
                            {filter === 'all'
                                ? 'Bạn chưa có đơn hàng nào. Bắt đầu mua sắm ngay!'
                                : `Không có đơn hàng ${statusConfig[filter as OrderStatus].label.toLowerCase()}`
                            }
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    {/* Order Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                                {order.orderNumber}
                                            </h3>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
                                                    statusConfig[order.status].bgColor
                                                } ${statusConfig[order.status].color}`}
                                            >
                                                {statusConfig[order.status].icon}
                                                {statusConfig[order.status].label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                                                    Ngày đặt
                                                </p>
                                                <p className="text-gray-900 font-bold">
                                                    {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                                                    Số lượng
                                                </p>
                                                <p className="text-gray-900 font-bold">{order.items.length} sản phẩm</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                                                    Tổng tiền
                                                </p>
                                                <p className="text-[#D70018] font-black text-xl tracking-tight">
                                                    {order.totalAmount.toLocaleString()}₫
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
                                        <Link
                                            to={`/account/orders/${order.id}`}
                                            className="flex-1 lg:flex-none px-6 py-3 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Xem chi tiết
                                        </Link>

                                        {canCancel(order) && (
                                            <button
                                                onClick={() => toast('Chức năng đang phát triển')}
                                                className="flex-1 lg:flex-none px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Hủy đơn
                                            </button>
                                        )}

                                        {canReturn(order) && (
                                            <button
                                                onClick={() => toast('Chức năng đang phát triển')}
                                                className="flex-1 lg:flex-none px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-700 font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                Đổi trả
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
