import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesApi } from '../api/sales';
import type { Order } from '../api/sales';
import { Package, Clock, Hash, MapPin, DollarSign, AlertCircle, Coins, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { LoyaltyCard } from '../components/loyalty';

const statusLabel: Record<string, string> = {
    Delivered: 'Đã giao hàng', Pending: 'Chờ xử lý',
    Confirmed: 'Đã xác nhận', Shipped: 'Đang vận chuyển', Cancelled: 'Đã hủy',
};

const statusColor: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    Shipped: 'bg-purple-100 text-purple-700 border-purple-200',
    Delivered: 'bg-green-100 text-green-700 border-green-200',
    Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export const ProfilePage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        salesApi.getMyOrders()
            .then(setOrders)
            .catch(() => setError('Không thể tải lịch sử đơn hàng.'))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 font-sans">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
                Tài khoản <span className="text-accent">của tôi</span>
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-24">
                        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                            <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-sm">
                                KH
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Phạm Văn A</h3>
                                <p className="text-gray-500 text-xs mt-0.5">Thành viên Thân thiết</p>
                            </div>
                        </div>

                        <nav className="space-y-1">
                            <Link to="/account/orders"
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-red-50 text-accent rounded-xl font-semibold text-sm border border-red-100"
                            >
                                <Package size={16} />Lịch sử đơn hàng
                            </Link>
                            <Link to="/account/loyalty"
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors"
                            >
                                <Coins size={16} />Điểm thưởng
                            </Link>
                            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors">
                                <MapPin size={16} />Thông tin địa chỉ
                            </button>
                        </nav>

                        <div className="mt-5 pt-5 border-t border-gray-100">
                            <Link to="/account/loyalty">
                                <LoyaltyCard compact />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="text-accent w-5 h-5" />
                        Lịch sử mua hàng
                    </h2>

                    {error ? (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-100 p-5 rounded-xl text-red-700 text-sm font-medium">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <Package className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có đơn hàng nào</h3>
                            <p className="text-gray-500 text-sm">Hãy mua sắm để nhận nhiều ưu đãi từ Quang Hưởng Computer.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5 md:p-6 hover:border-accent/30 hover:shadow-md transition-all group shadow-sm">
                                    {/* Order Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-red-50 transition-colors">
                                                <Hash className="w-5 h-5 text-gray-400 group-hover:text-accent transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium mb-0.5">Mã đơn hàng</p>
                                                <p className="text-gray-900 font-bold">#{order.orderNumber}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${statusColor[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                {statusLabel[order.status] || order.status}
                                            </span>
                                            <span className="px-3 py-1.5 bg-gray-50 rounded-xl text-gray-600 text-xs font-medium flex items-center gap-1.5 border border-gray-100">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Order Meta */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                        <div>
                                            <p className="text-gray-400 text-xs font-semibold flex items-center gap-1.5 mb-2">
                                                <MapPin className="w-3.5 h-3.5" />Địa chỉ nhận hàng
                                            </p>
                                            <p className="text-gray-700 bg-gray-50 px-3 py-2.5 rounded-xl text-sm border border-gray-100 leading-relaxed">{order.shippingAddress}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs font-semibold flex items-center gap-1.5 mb-2">
                                                <DollarSign className="w-3.5 h-3.5" />Tổng thanh toán
                                            </p>
                                            <p className="text-accent text-2xl font-bold">{formatCurrency(order.totalAmount)}</p>
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Chi tiết mua hàng</p>
                                        <div className="space-y-2">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <span className="min-w-[32px] h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs text-gray-700 font-bold px-1.5">
                                                            {item.quantity}x
                                                        </span>
                                                        <span className="text-gray-800 font-medium line-clamp-1">{item.productName}</span>
                                                    </div>
                                                    <span className="text-gray-900 font-semibold ml-3 flex-shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
