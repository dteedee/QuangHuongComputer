import { useState, useEffect } from 'react';
import { Eye, Filter, Loader2, Search, ArrowRight, Clock, CheckCircle2, Package, XCircle, Truck, Plus, X, Check, ShoppingCart, User, MapPin, FileText } from 'lucide-react';
import { salesApi, type Order, type OrderStatus } from '../../api/sales';
import { catalogApi, type Product } from '../../api/catalog';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const AdminOrdersPage = () => {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();

    const { data: response, isLoading } = useQuery({
        queryKey: ['admin-orders', page],
        queryFn: () => salesApi.admin.getOrders(page, 20),
    });

    const { data: productsData } = useQuery({
        queryKey: ['products-list'],
        queryFn: () => catalogApi.getProducts({ pageSize: 100 }),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => salesApi.admin.updateOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            toast.success('Cập nhật trạng thái thành công!');
        },
        onError: () => toast.error('Cập nhật thất bại!')
    });

    const createOrderMutation = useMutation({
        mutationFn: (data: any) => salesApi.checkout(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            toast.success('Tạo đơn hàng thành công!');
            setIsCreateModalOpen(false);
        },
        onError: () => toast.error('Tạo đơn hàng thất bại!')
    });

    const orders = response?.orders || [];
    const total = response?.total || 0;

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'Pending': return { color: 'text-amber-500', bg: 'bg-amber-50', icon: <Clock size={16} />, label: 'Chờ duyệt' };
            case 'Confirmed': return { color: 'text-blue-500', bg: 'bg-blue-50', icon: <CheckCircle2 size={16} />, label: 'Đã xác nhận' };
            case 'Shipped': return { color: 'text-purple-500', bg: 'bg-purple-50', icon: <Truck size={16} />, label: 'Đang giao' };
            case 'Delivered': return { color: 'text-emerald-500', bg: 'bg-emerald-50', icon: <Package size={16} />, label: 'Đã giao' };
            case 'Cancelled': return { color: 'text-rose-500', bg: 'bg-rose-50', icon: <XCircle size={16} />, label: 'Đã hủy' };
            default: return { color: 'text-gray-500', bg: 'bg-gray-50', icon: <Clock size={16} />, label: status };
        }
    };

    const handleCreateOrder = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const productId = formData.get('productId') as string;
        const product = productsData?.products.find(p => p.id === productId);

        if (!product) return;

        const data = {
            items: [{
                productId: product.id,
                productName: product.name,
                unitPrice: product.price,
                quantity: Number(formData.get('quantity'))
            }],
            shippingAddress: formData.get('address') as string,
            notes: formData.get('notes') as string
        };

        createOrderMutation.mutate(data);
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Đơn hàng</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Hệ thống xử lý đơn hàng và vận chuyển toàn quốc
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Tạo đơn hàng
                    </button>
                    <div className="relative group">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-12 pr-10 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all appearance-none shadow-sm shadow-gray-200/50"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="Pending">Chờ duyệt</option>
                            <option value="Confirmed">Xác nhận</option>
                            <option value="Shipped">Đang giao</option>
                            <option value="Delivered">Hoàn tất</option>
                            <option value="Cancelled">Đã hủy</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#D70018]/5 text-[#D70018] text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Đơn hàng</th>
                                <th className="px-8 py-5">Sản phẩm</th>
                                <th className="px-8 py-5">Giá trị</th>
                                <th className="px-8 py-5">Trạng thái</th>
                                <th className="px-8 py-5">Ngày tạo</th>
                                <th className="px-8 py-5 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <Loader2 className="mx-auto text-[#D70018] animate-spin mb-4" size={40} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Đang tải dữ liệu đơn hàng...</p>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <Package className="mx-auto text-gray-100 mb-4" size={60} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Chưa có đơn hàng nào.</p>
                                    </td>
                                </tr>
                            ) : (
                                orders
                                    .filter(order => statusFilter === 'all' || order.status === statusFilter)
                                    .map((order) => {
                                        const status = getStatusInfo(order.status);
                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50/50 transition-all group cursor-pointer">
                                                <td className="px-8 py-6">
                                                    <span className="font-black text-gray-900 group-hover:text-[#D70018] transition-colors">#{order.orderNumber}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-gray-400 tabular-nums">{order.items?.[0]?.productName || 'N/A'}</span>
                                                        {order.items?.length > 1 && (
                                                            <span className="text-[9px] font-black text-[#D70018] uppercase tracking-widest leading-none">+{order.items.length - 1} khác</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-base font-black text-gray-900 tracking-tighter italic">₫{order.totalAmount.toLocaleString()}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <select
                                                        value={order.status}
                                                        disabled={updateStatusMutation.isPending}
                                                        onChange={(e) => updateStatusMutation.mutate({ id: order.id, status: e.target.value })}
                                                        className={`items-center gap-2 px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic border ${status.bg} ${status.color} border-transparent hover:border-current transition-all appearance-none cursor-pointer focus:outline-none`}
                                                    >
                                                        <option value="Pending">Chờ duyệt</option>
                                                        <option value="Confirmed">Xác nhận</option>
                                                        <option value="Shipped">Đang giao</option>
                                                        <option value="Delivered">Hoàn tất</option>
                                                        <option value="Cancelled">Đã hủy</option>
                                                    </select>
                                                </td>
                                                <td className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase">
                                                    {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-300 hover:text-[#D70018] hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-gray-100">
                                                        <ArrowRight size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-10">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                    Hiển thị <span className="text-gray-900">{orders.length}</span> / <span className="text-gray-900">{total}</span> đơn hàng toàn hệ thống
                </span>
                <div className="flex gap-3">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-6 py-3 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] hover:border-red-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                    >
                        Trang trước
                    </button>
                    <button
                        disabled={orders.length < 20}
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-3 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] hover:border-red-100 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                    >
                        Trang kế &gt;
                    </button>
                </div>
            </div>

            {/* Create Order Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-[#D70018]">
                                        <ShoppingCart size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                                            Tạo <span className="text-[#D70018]">Đơn hàng mới</span>
                                        </h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Khởi tạo đơn hàng thủ công từ Admin</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsCreateModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-[#D70018] transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateOrder} className="p-8 space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                            <Package size={14} className="text-[#D70018]" />
                                            Thông tin sản phẩm
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Chọn sản phẩm</label>
                                                <select name="productId" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-100 appearance-none">
                                                    {productsData?.products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} - ₫{p.price.toLocaleString()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Số lượng</label>
                                                <input name="quantity" type="number" defaultValue={1} min={1} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-100" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                            <MapPin size={14} className="text-[#D70018]" />
                                            Giao hàng & Ghi chú
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Địa chỉ giao hàng</label>
                                                <input name="address" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-100" placeholder="Số nhà, tên đường, phường/xã..." />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Ghi chú đơn hàng</label>
                                                <textarea name="notes" rows={3} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-100 resize-none" placeholder="Lưu ý cho đơn vị vận chuyển..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-8 py-4 bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all">
                                        Hủy
                                    </button>
                                    <button type="submit" disabled={createOrderMutation.isPending} className="flex-[2] flex items-center justify-center gap-3 px-8 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all disabled:opacity-50">
                                        {createOrderMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                        Xác nhận tạo đơn
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
