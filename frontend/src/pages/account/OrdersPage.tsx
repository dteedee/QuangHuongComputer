import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AccountLayout } from '../../layouts/account-layout';
import { useMyOrders } from './use-my-orders';
import type { OrderStatus } from '../../api/sales/types';
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

const PAGE_SIZE = 10;

/**
 * Same `useMyOrders()` query as `AccountPage`'s overview (phase-56 Step 2 — one source of truth
 * so the two screens never disagree on counts). `/api/sales/orders` has no server paging
 * (confirmed against `CustomerOrderEndpoints.cs`) — paginated client-side here; filed as an
 * integration request for Sales (W2-23's file) to add `page`/`pageSize`.
 */
export const OrdersPage = () => {
    const { orders, isLoading, error, reload, filter } = useMyOrders();
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const confirm = useConfirm();

    const filteredOrders = filter(statusFilter, searchQuery);
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
    const pageOrders = useMemo(
        () => filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filteredOrders, page],
    );

    const canCancel = (order: (typeof orders)[number]) => order.status === 'Pending' || order.status === 'Confirmed';
    const canReturn = (order: (typeof orders)[number]) => order.status === 'Delivered';

    const handleCancelOrder = async (orderId: string) => {
        const ok = await confirm({ message: 'Bạn có chắc chắn muốn hủy đơn hàng này?', variant: 'warning' });
        if (!ok) return;
        try {
            await client.post(`/sales/orders/${orderId}/cancel`, { reason: 'Khách hàng yêu cầu hủy' });
            toast.success('Đã hủy đơn hàng thành công');
            reload();
        } catch (error: any) {
            toast.error(error?.response?.data?.Error || 'Không thể hủy đơn hàng');
        }
    };

    return (
        <AccountLayout breadcrumb={[{ label: 'Đơn hàng' }]}>
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
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã đơn hàng..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <Filter className="text-gray-400 w-4 h-4 flex-shrink-0" />
                        <button
                            onClick={() => { setStatusFilter('all'); setPage(1); }}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                statusFilter === 'all' ? 'bg-accent text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Tất cả
                        </button>
                        {(Object.keys(statusConfig) as OrderStatus[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => { setStatusFilter(status); setPage(1); }}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                    statusFilter === status ? 'bg-accent text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {statusConfig[status].label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-white border border-gray-100 animate-pulse" />)}
                </div>
            ) : error ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                    <button onClick={reload} className="text-accent text-sm font-semibold hover:underline cursor-pointer">Thử lại</button>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
                    <Package className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Không có đơn hàng</h3>
                    <p className="text-gray-500 text-sm">
                        {statusFilter === 'all'
                            ? 'Bạn chưa có đơn hàng nào. Bắt đầu mua sắm ngay!'
                            : `Không có đơn hàng ${statusConfig[statusFilter].label.toLowerCase()}`}
                    </p>
                    {statusFilter !== 'all' && (
                        <button onClick={() => setStatusFilter('all')} className="mt-4 text-accent text-sm hover:underline cursor-pointer">
                            Xem tất cả đơn hàng
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {pageOrders.map((order) => (
                            <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                                            <h3 className="text-base font-bold text-gray-900">{order.orderNumber}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig[order.status].bgColor} ${statusConfig[order.status].color}`}>
                                                {statusConfig[order.status].icon}
                                                {statusConfig[order.status].label}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs mb-0.5">Ngày đặt</p>
                                                <p className="text-gray-900 font-semibold">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs mb-0.5">Số lượng</p>
                                                <p className="text-gray-900 font-semibold">{order.items.length} sản phẩm</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-gray-500 text-xs mb-0.5">Tổng tiền</p>
                                                <p className="text-accent font-bold text-lg">{formatCurrency(order.totalAmount)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap lg:flex-col lg:items-stretch">
                                        <Link
                                            to={`/tai-khoan/orders/${order.id}`}
                                            className="flex-1 lg:flex-none bg-accent hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
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
                                            <Link
                                                to={`/tai-khoan/returns/new?orderId=${order.id}`}
                                                className="flex-1 lg:flex-none border border-amber-200 text-amber-700 px-5 py-2.5 rounded-xl hover:bg-amber-50 font-semibold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                Đổi trả
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {canReturn(order) && order.items.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sản phẩm trong đơn</p>
                                        {order.items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-gray-800 truncate">{item.productName}</p>
                                                    <p className="text-xs text-gray-500">SL {item.quantity} · {formatCurrency(item.unitPrice)}</p>
                                                </div>
                                                <Link
                                                    to={`/tai-khoan/returns/new?orderId=${order.id}&orderItemId=${item.id}`}
                                                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 cursor-pointer"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Yêu cầu đổi/trả
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-lg text-sm font-semibold cursor-pointer ${
                                        p === page ? 'bg-accent text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </AccountLayout>
    );
};
