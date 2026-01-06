import { useState, useEffect } from 'react';
import {
    ShoppingCart, Plus, CreditCard, ArrowRight,
    Tag, Star, TrendingUp, Clock
} from 'lucide-react';
import { salesApi } from '../../../api/sales';
import type { Order } from '../../../api/sales';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const SalePortal = () => {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const fetchRecentOrders = async () => {
            try {
                const data = await salesApi.admin.getOrders(1, 10);
                setOrders(data.orders);
            } catch (error) {
                console.error('Failed to fetch orders', error);
            }
        };
        fetchRecentOrders();
    }, []);

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Trung tâm <span className="text-[#D70018]">Bán hàng</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Quản lý đơn hàng, khách hàng và chương trình khuyến mãi
                    </p>
                </div>
                <button className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95">
                    <Plus size={18} />
                    Tạo đơn hàng mới
                </button>
            </div>

            {/* Quick Actions & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="premium-card p-8 group cursor-pointer"
                    >
                        <div className="p-4 bg-red-50 text-[#D70018] rounded-2xl w-fit mb-6 group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-inner">
                            <Tag size={28} />
                        </div>
                        <h4 className="text-gray-900 font-black uppercase italic tracking-tighter text-xl">Chiến dịch</h4>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Quản lý mã giảm giá và coupon</p>
                    </motion.div>
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="premium-card p-8 group cursor-pointer"
                    >
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-inner">
                            <Star size={28} />
                        </div>
                        <h4 className="text-gray-900 font-black uppercase italic tracking-tighter text-xl">Thành viên</h4>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Điểm thưởng và hạng khách hàng</p>
                    </motion.div>
                </div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gray-900 p-10 rounded-[30px] lg:col-span-2 relative overflow-hidden flex flex-col justify-between group shadow-2xl"
                >
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingUp className="text-red-500" size={20} />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Hệ thống Realtime</span>
                        </div>
                        <h3 className="text-3xl font-black text-white mb-3 uppercase italic italic tracking-tighter">Giao diện POS</h3>
                        <p className="text-gray-400 text-xs font-medium max-w-[300px] leading-relaxed">Khởi động terminal bán hàng trực tiếp tại quầy. Tối ưu hóa cho tốc độ và chính xác.</p>
                    </div>
                    <button className="relative z-10 mt-10 flex items-center gap-3 bg-[#D70018] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#b50014] transition-all w-fit shadow-xl shadow-red-500/10">
                        Mở Terminal <ArrowRight size={16} />
                    </button>
                    <CreditCard className="absolute -right-12 -bottom-12 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" size={250} />
                </motion.div>
            </div>

            {/* Recent Orders */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card overflow-hidden"
            >
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic">Đơn hàng gần đây</h3>
                    <Link to="/backoffice/orders" className="text-[10px] font-black text-[#D70018] uppercase tracking-widest hover:underline flex items-center gap-1">
                        Xem tất cả <ArrowRight size={14} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Mã đơn</th>
                                <th className="px-8 py-5">Khách hàng</th>
                                <th className="px-8 py-5">Trạng thái</th>
                                <th className="px-8 py-5">Thanh toán</th>
                                <th className="px-8 py-5">Ngày tạo</th>
                                <th className="px-8 py-5 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <span className="font-black text-gray-900 group-hover:text-[#D70018] transition-colors">#{order.orderNumber}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-[#D70018] text-xs shadow-inner">
                                                {order.customerId.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs text-gray-600 font-black uppercase tracking-tight">{order.customerId.substring(0, 8)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-tight ${order.status === 'Delivered' ? 'bg-green-50 text-green-600' :
                                            order.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            {order.status === 'Delivered' ? 'Đã giao' : order.status === 'Pending' ? 'Chờ xử lý' : 'Đang xử lý'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="font-black text-gray-900 tracking-tighter text-base">${order.totalAmount.toLocaleString()}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase">
                                            <Clock size={12} />
                                            {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-300 hover:text-[#D70018] hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-gray-100">
                                            <ArrowRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <ShoppingCart className="mx-auto text-gray-100 mb-4" size={60} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Không có đơn hàng nào trong hệ thống.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};
