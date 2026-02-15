
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesApi } from '../api/sales';
import type { Order } from '../api/sales';
import { Package, Clock, Hash, MapPin, DollarSign, AlertCircle, Gift, Heart, Coins } from 'lucide-react';
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D70018]"></div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-12 font-sans">
            <h1 className="text-3xl font-black text-gray-900 mb-8 border-b border-gray-100 pb-4 uppercase italic tracking-tighter">Tài khoản <span className="text-[#D70018]">của tôi</span></h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 sticky top-24 shadow-xl shadow-gray-200/50">
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
                            <div className="w-12 h-12 bg-[#D70018] rounded-xl flex items-center justify-center text-xl font-black text-white shadow-lg shadow-red-500/20">
                                KH
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 uppercase text-xs">Phạm Văn A</h3>
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest italic mt-0.5">Thành viên Thân thiết</p>
                            </div>
                        </div>
                        <nav className="space-y-2">
                            <Link to="/account/orders" className="w-full text-left px-4 py-3 bg-red-50 text-[#D70018] rounded-xl font-black text-[10px] border border-red-100 flex items-center gap-3 uppercase tracking-widest">
                                <Package size={16} /> Lịch sử đơn hàng
                            </Link>
                            <Link to="/account/loyalty" className="w-full text-left px-4 py-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition text-[10px] font-black flex items-center gap-3 uppercase tracking-widest">
                                <Coins size={16} /> Điểm thưởng
                            </Link>
                            <Link to="/account/wishlist" className="w-full text-left px-4 py-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition text-[10px] font-black flex items-center gap-3 uppercase tracking-widest">
                                <Heart size={16} /> Yêu thích
                            </Link>
                            <button className="w-full text-left px-4 py-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition text-[10px] font-black flex items-center gap-3 uppercase tracking-widest">
                                <MapPin size={16} /> Thông tin địa chỉ
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
                    <h2 className="text-xl font-black text-gray-900 mb-6 uppercase italic flex items-center gap-2 tracking-tighter">
                        <Package className="text-[#D70018]" />
                        Lịch sử mua hàng
                    </h2>

                    {error ? (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-100 p-6 rounded-3xl text-[#D70018] font-bold text-sm">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
                            <Package className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic">Chưa có đơn hàng nào</h3>
                            <p className="text-gray-400 text-xs font-medium px-4">Hãy mua sắm để nhận được nhiều ưu đãi hấp dẫn từ Quang Hưởng Computer.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-8 overflow-hidden hover:border-[#D70018]/30 transition-all group relative shadow-lg shadow-gray-200/20">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-gray-50 pb-6">
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-red-50 transition-colors text-gray-400 group-hover:text-[#D70018]">
                                                <Hash className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 italic">Mã đơn hàng</div>
                                                <div className="text-gray-900 font-mono font-black text-xl">#{order.orderNumber}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${getStatusColor(order.status).replace('bg-', 'bg-transparent border-')}`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                                                {order.status === 'Delivered' ? 'Đã giao hàng' :
                                                    order.status === 'Pending' ? 'Chờ xử lý' :
                                                        order.status === 'Confirmed' ? 'Đã xác nhận' :
                                                            order.status === 'Shipped' ? 'Đang vận chuyển' :
                                                                order.status === 'Cancelled' ? 'Đã hủy' : order.status}
                                            </div>
                                            <div className="px-4 py-2 bg-gray-50 rounded-xl text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-gray-100">
                                                <Clock className="w-3 h-3" />
                                                {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div>
                                            <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 italic">
                                                <MapPin className="w-3 h-3" /> Địa chỉ nhận hàng
                                            </div>
                                            <p className="text-gray-800 bg-gray-50 p-4 rounded-2xl text-xs font-bold border border-gray-100 leading-relaxed">{order.shippingAddress}</p>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 italic">
                                                <DollarSign className="w-3 h-3" /> Tổng thanh toán
                                            </div>
                                            <p className="text-[#D70018] text-3xl font-black tracking-tighter">{formatCurrency(order.totalAmount)}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                                        <h4 className="text-[9px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em] italic">Chi tiết sản phẩm</h4>
                                        <div className="space-y-4">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-7 min-w-[28px] rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[10px] text-gray-900 font-black shadow-sm">
                                                            {item.quantity}x
                                                        </div>
                                                        <span className="text-gray-900 font-bold italic">{item.productName}</span>
                                                    </div>
                                                    <span className="text-gray-400 font-black">{formatCurrency(item.unitPrice * item.quantity)}</span>
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

