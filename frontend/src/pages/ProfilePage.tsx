
import { useEffect, useState } from 'react';
import { salesApi } from '../api/sales';
import type { Order } from '../api/sales';
import { Package, Clock, Hash, MapPin, DollarSign, AlertCircle } from 'lucide-react';

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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-black text-white mb-8 border-b border-white/10 pb-4 uppercase italic">Tài khoản của tôi</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 sticky top-24 backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-tr from-[#D70018] to-rose-500 rounded-xl flex items-center justify-center text-xl font-black text-white shadow-lg shadow-red-500/20">
                                KH
                            </div>
                            <div>
                                <h3 className="font-bold text-white uppercase text-sm">Khách hàng</h3>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Thành viên</p>
                            </div>
                        </div>
                        <nav className="space-y-2">
                            <button className="w-full text-left px-4 py-3 bg-[#D70018]/10 text-[#D70018] rounded-xl font-bold text-sm border border-[#D70018]/20 flex items-center gap-3">
                                <Package size={16} /> Lịch sử đơn hàng
                            </button>
                            <button className="w-full text-left px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition text-sm font-medium flex items-center gap-3">
                                <MapPin size={16} /> Vị trí & Địa chỉ
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <h2 className="text-xl font-black text-white mb-6 uppercase italic flex items-center gap-2">
                        <Package className="text-[#D70018]" />
                        Lịch sử mua hàng
                    </h2>

                    {error ? (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 font-medium">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-bold text-white mb-2">Chưa có đơn hàng nào</h3>
                            <p className="text-gray-400 text-sm">Hãy mua sắm để nhận được nhiều ưu đãi hấp dẫn.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 overflow-hidden hover:border-[#D70018]/30 transition group relative">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-[#D70018]/10 rounded-xl group-hover:bg-[#D70018]/20 transition text-[#D70018]">
                                                <Hash className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Mã đơn hàng</div>
                                                <div className="text-white font-mono font-bold text-lg">#{order.orderNumber}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${getStatusColor(order.status)} border-current/20`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                                {order.status === 'Delivered' ? 'Đã giao hàng' :
                                                    order.status === 'Pending' ? 'Chờ xử lý' :
                                                        order.status === 'Confirmed' ? 'Đã xác nhận' :
                                                            order.status === 'Shipped' ? 'Đang vận chuyển' :
                                                                order.status === 'Cancelled' ? 'Đã hủy' : order.status}
                                            </div>
                                            <div className="px-4 py-1.5 bg-white/5 rounded-full text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-white/5">
                                                <Clock className="w-3 h-3" />
                                                {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <MapPin className="w-3 h-3" /> Địa chỉ nhận hàng
                                            </div>
                                            <p className="text-gray-200 bg-black/20 p-3 rounded-xl text-sm font-medium">{order.shippingAddress}</p>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <DollarSign className="w-3 h-3" /> Tổng tiền
                                            </div>
                                            <p className="text-[#D70018] text-2xl font-black tracking-tighter">{order.totalAmount.toLocaleString()}đ</p>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 rounded-xl p-4">
                                        <h4 className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest">Sản phẩm</h4>
                                        <div className="space-y-3">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-6 min-w-[24px] rounded-md bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                                                            {item.quantity}x
                                                        </div>
                                                        <span className="text-gray-200 font-medium">{item.productName}</span>
                                                    </div>
                                                    <span className="text-gray-400 font-mono font-bold text-xs">{(item.unitPrice * item.quantity).toLocaleString()}đ</span>
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

