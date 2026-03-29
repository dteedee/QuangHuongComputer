
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesApi } from '../api/sales';
import type { Order } from '../api/sales';
import { Package, Clock, Hash, MapPin, DollarSign, AlertCircle, Gift, Coins } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { LoyaltyCard } from '../components/loyalty';

export const ProfilePage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setIsLoading(true);
                const data = await salesApi.getMyOrders();
                setOrders(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load order history.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-500/20 text-yellow-500';
            case 'Confirmed': return 'bg-blue-500/20 text-blue-500';
            case 'Shipped': return 'bg-purple-500/20 text-purple-500';
            case 'Delivered': return 'bg-green-500/20 text-green-500';
            case 'Cancelled': return 'bg-red-500/20 text-red-500';
            default: return 'bg-gray-500/20 text-gray-500';
        }
    };

    if (isLoading) return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-12 font-sans">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-4 tracking-tight">Tài khoản <span className="text-accent">của tôi</span></h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 sticky top-24 shadow-sm">
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
                            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-md shadow-accent/20">
                                KH
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Phạm Văn A</h3>
                                <p className="text-gray-500 text-xs font-medium mt-0.5">Thành viên Thân thiết</p>
                            </div>
                        </div>
                        <nav className="space-y-2">
                            <Link to="/account/orders" className="w-full text-left px-4 py-3 bg-red-50 text-accent rounded-xl font-semibold text-sm border border-red-100 flex items-center gap-3">
                                <Package size={18} /> Lịch sử đơn hàng
                            </Link>
                            <Link to="/account/loyalty" className="w-full text-left px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition text-sm font-semibold flex items-center gap-3">
                                <Coins size={18} /> Điểm thưởng
                            </Link>
                            <button className="w-full text-left px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition text-sm font-semibold flex items-center gap-3">
                                <MapPin size={18} /> Thông tin địa chỉ
                            </button>
                        </nav>

                        {/* Loyalty Card */}
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <Link to="/account/loyalty">
                                <LoyaltyCard compact />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2 tracking-tight">
                        <Package className="text-accent" />
                        Lịch sử mua hàng
                    </h2>

                    {error ? (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-100 p-6 rounded-2xl text-red-700 font-medium text-sm">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
                            <p className="text-gray-500 text-sm px-4">Hãy mua sắm để nhận được nhiều ưu đãi hấp dẫn từ Quang Hưởng Computer.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 hover:border-accent/30 transition-all group relative shadow-sm hover:shadow-md">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-gray-50 pb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3.5 bg-gray-50 rounded-2xl group-hover:bg-red-50 transition-colors text-gray-400 group-hover:text-accent">
                                                <Hash className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500 font-medium mb-1">Mã đơn hàng</div>
                                                <div className="text-gray-900 font-bold text-lg">#{order.orderNumber}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${getStatusColor(order.status).replace('bg-', 'bg-transparent border border-').replace('/20', '/30')}`}>
                                                <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                                                {order.status === 'Delivered' ? 'Đã giao hàng' :
                                                    order.status === 'Pending' ? 'Chờ xử lý' :
                                                        order.status === 'Confirmed' ? 'Đã xác nhận' :
                                                            order.status === 'Shipped' ? 'Đang vận chuyển' :
                                                                order.status === 'Cancelled' ? 'Đã hủy' : order.status}
                                            </div>
                                            <div className="px-4 py-2 bg-gray-50 rounded-xl text-gray-600 text-xs font-semibold flex items-center gap-2 border border-gray-100">
                                                <Clock className="w-4 h-4" />
                                                {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div>
                                            <div className="text-gray-500 text-xs font-semibold flex items-center gap-2 mb-3">
                                                <MapPin className="w-4 h-4" /> Địa chỉ nhận hàng
                                            </div>
                                            <p className="text-gray-800 bg-gray-50 p-4 rounded-2xl text-sm border border-gray-100 leading-relaxed font-medium">{order.shippingAddress}</p>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 text-xs font-semibold flex items-center gap-2 mb-3">
                                                <DollarSign className="w-4 h-4" /> Tổng thanh toán
                                            </div>
                                            <p className="text-accent text-2xl font-bold tracking-tight">{formatCurrency(order.totalAmount)}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                                        <h4 className="text-xs font-semibold text-gray-500 mb-4">CHI TIẾT MUA HÀNG</h4>
                                        <div className="space-y-3">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-8 min-w-[32px] rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs text-gray-700 font-bold shadow-sm">
                                                            {item.quantity}x
                                                        </div>
                                                        <span className="text-gray-900 font-medium line-clamp-2 leading-relaxed">{item.productName}</span>
                                                    </div>
                                                    <span className="text-gray-900 font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</span>
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

