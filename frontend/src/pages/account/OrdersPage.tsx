import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { salesApi, type Order, type OrderStatus } from '../../api/sales';
import { Package, Search, Filter, Eye, XCircle, RotateCcw, Clock, CheckCircle, Truck, Ban, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/format';
import { useConfirm } from '../../context/ConfirmContext';
import client from '../../api/client';

const statusConfig: Record<OrderStatus, { label: string; icon: JSX.Element; color: string; bgColor: string }> = {
    'Draft':     { label: 'Bản nháp',      icon: <FileText className="w-3.5 h-3.5" />,    color: 'text-gray-700',    bgColor: 'bg-gray-100' },
    'Pending':   { label: 'Chờ xử lý',     icon: <Clock className="w-3.5 h-3.5" />,       color: 'text-yellow-700',  bgColor: 'bg-yellow-100' },
    'Confirmed': { label: 'Đã xác nhận',   icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-blue-700',    bgColor: 'bg-blue-100' },
    'Paid':      { label: 'Đã thanh toán', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    'Shipped':   { label: 'Đang giao',     icon: <Truck className="w-3.5 h-3.5" />,       color: 'text-purple-700',  bgColor: 'bg-purple-100' },
    'Delivered': { label: 'Đã giao',       icon: <Package className="w-3.5 h-3.5" />,     color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    'Completed': { label: 'Hoàn thành',    icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    'Cancelled': { label: 'Đã hủy',        icon: <Ban className="w-3.5 h-3.5" />,         color: 'text-red-700',     bgColor: 'bg-red-100' },
};

export const OrdersPage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const confirm = useConfirm();

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await salesApi.getMyOrders();
            setOrders(data);
        } catch {
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

    const canCancel = (order: Order) => order.status === 'Pending' || order.status === 'Confirmed';
    const canReturn = (order: Order) => order.status === 'Delivered';

    const handleCancelOrder = async (orderId: string) => {
        const ok = await confirm({ message: 'Bạn có chắc chắn muốn hủy đơn hàng này?', variant: 'warning' });
        if (!ok) return;
        try {
            await client.post(`/sales/orders/${orderId}/cancel`, { reason: 'Khách hàng yêu cầu hủy' });
            toast.success('Đã hủy đơn hàng thành công');
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Cancelled' as OrderStatus } : o));
            loadOrders();
        } catch (error: any) {
            toast.error(error?.response?.data?.Error || 'Không thể hủy đơn hàng');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-red-50 rounded-xl text-accent">
                        <Package size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
                        <p className="text-gray-500 text-sm">{filteredOrders.length} đơn hàng</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
                    <div className="flex flex-col lg:flex-row gap-3">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo mã đơn hàng..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm"
                            />
                        </div>
                        {/* Status Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            <Filter className="text-gray-400 w-4 h-4 flex-shrink-0" />
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                    filter === 'all' ? 'bg-accent text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Tất cả
                            </button>
                            {(Object.keys(statusConfig) as OrderStatus[]).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                        filter === status ? 'bg-accent text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {statusConfig[status].label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
                        <Package className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Không có đơn hàng</h3>
                        <p className="text-gray-500 text-sm">
                            {filter === 'all'
                                ? 'Bạn chưa có đơn hàng nào. Bắt đầu mua sắm ngay!'
                                : `Không có đơn hàng ${statusConfig[filter as OrderStatus].label.toLowerCase()}`}
                        </p>
                        {filter !== 'all' && (
                            <button
                                onClick={() => setFilter('all')}
                                className="mt-4 text-accent text-sm hover:underline cursor-pointer"
                            >
                                Xem tất cả đơn hàng
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    {/* Order Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                                            <h3 className="text-base font-bold text-gray-900">
                                                {order.orderNumber}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig[order.status].bgColor} ${statusConfig[order.status].color}`}>
                                                {statusConfig[order.status].icon}
                                                {statusConfig[order.status].label}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs mb-0.5">Ngày đặt</p>
                                                <p className="text-gray-900 font-semibold">
                                                    {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs mb-0.5">Số lượng</p>
                                                <p className="text-gray-900 font-semibold">{order.items.length} sản phẩm</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-gray-500 text-xs mb-0.5">Tổng tiền</p>
                                                <p className="text-accent font-bold text-lg">
                                                    {formatCurrency(order.totalAmount)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-wrap lg:flex-col lg:items-stretch">
                                        <Link
                                            to={`/account/orders/${order.id}`}
                                            className="flex-1 lg:flex-none bg-accent hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Xem chi tiết
                                        </Link>
                                        {canCancel(order) && (
                                            <button
                                                onClick={() => handleCancelOrder(order.id)}
                                                className="flex-1 lg:flex-none border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 font-semibold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Hủy đơn
                                            </button>
                                        )}
                                        {canReturn(order) && (
                                            <button
                                                onClick={() => toast('Chức năng đang phát triển')}
                                                className="flex-1 lg:flex-none border border-amber-200 text-amber-700 px-5 py-2.5 rounded-xl hover:bg-amber-50 font-semibold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
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
