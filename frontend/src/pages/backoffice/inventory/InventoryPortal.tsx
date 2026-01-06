import { useState } from 'react';
import {
    Box, Package, Truck, AlertTriangle,
    Plus, Search, Filter, ArrowRight,
    Archive, FileText, X, Check, Loader2, RefreshCw
} from 'lucide-react';
import { inventoryApi, InventoryItem, PurchaseOrder } from '../../../api/inventory';
import { catalogApi } from '../../../api/catalog';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const InventoryPortal = () => {
    const [isPoModalOpen, setIsPoModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: items = [], isLoading: itemsLoading } = useQuery({
        queryKey: ['inventory-stock'],
        queryFn: inventoryApi.getInventory,
    });

    const { data: orders = [], isLoading: ordersLoading } = useQuery({
        queryKey: ['inventory-po'],
        queryFn: inventoryApi.getPurchaseOrders,
    });

    const { data: productsData } = useQuery({
        queryKey: ['products-list'],
        queryFn: () => catalogApi.getProducts({ pageSize: 100 }),
    });

    const createPoMutation = useMutation({
        mutationFn: (data: any) => inventoryApi.createPurchaseOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-po'] });
            toast.success('Tạo đơn nhập hàng thành công!');
            setIsPoModalOpen(false);
        },
        onError: () => toast.error('Tạo đơn thất bại!')
    });

    const receivePoMutation = useMutation({
        mutationFn: (id: string) => inventoryApi.receivePurchaseOrder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-stock', 'inventory-po'] });
            toast.success('Đã nhập kho thành công!');
        },
        onError: () => toast.error('Lỗi khi nhập kho!')
    });

    const handleCreatePO = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            supplierId: '00000000-0000-0000-0000-000000000000', // Placeholder
            items: [{
                productId: formData.get('productId'),
                quantity: Number(formData.get('quantity')),
                unitPrice: 0 // Will be handled by backend or defined here
            }]
        };
        createPoMutation.mutate(data);
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Kho hàng</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Theo dõi tồn kho, nhập hàng và quản lý chuỗi cung ứng
                    </p>
                </div>
                <button
                    onClick={() => setIsPoModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Tạo đơn nhập hàng (PO)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Stock Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 premium-card overflow-hidden"
                >
                    <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/50 backdrop-blur-sm">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Tình trạng tồn kho</h3>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm sản phẩm..."
                                className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-[11px] font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-red-100 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#D70018]/5 text-[#D70018] text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">SKU / ID</th>
                                    <th className="px-8 py-5">Sản phẩm</th>
                                    <th className="px-8 py-5">Số lượng</th>
                                    <th className="px-8 py-5">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {itemsLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <RefreshCw className="mx-auto text-[#D70018] animate-spin mb-4" size={40} />
                                            <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Đang tải dữ liệu kho...</p>
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-24 text-center">
                                            <Archive className="mx-auto text-gray-100 mb-4" size={60} />
                                            <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Kho đang trống hoặc đang tải dữ liệu...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-6 font-mono text-[10px] text-gray-400 font-bold">{item.sku || item.id.substring(0, 8).toUpperCase()}</td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-black text-gray-800 uppercase italic tracking-tight">
                                                    {productsData?.products.find(p => p.id === item.productId)?.name || 'Sản phẩm ' + item.productId.substring(0, 5)}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-black tracking-tighter ${item.quantity <= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                        {item.quantity}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">đơn vị</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${item.quantity <= 5
                                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                    : 'bg-green-50 text-green-600 border-green-100'
                                                    }`}>
                                                    {item.quantity <= 5 ? 'Cần nhập hàng' : 'Sẵn hàng'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Purchase Orders Sidebar */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-8 flex flex-col"
                >
                    <div className="flex justify-between items-center mb-10 border-b border-gray-50 pb-6">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Đơn nhập (PO)</h3>
                        <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-gray-400 border border-gray-100">
                            <Truck size={20} />
                        </div>
                    </div>
                    <div className="space-y-6 flex-1 overflow-y-auto max-h-[600px] pr-2">
                        {ordersLoading ? (
                            <div className="py-10 text-center"><Loader2 className="mx-auto animate-spin text-gray-200" /></div>
                        ) : orders.map((po) => (
                            <motion.div
                                key={po.id}
                                whileHover={{ x: 5 }}
                                className="p-5 bg-gray-50/50 hover:bg-white rounded-[20px] border border-transparent hover:border-red-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-black text-[#D70018] group-hover:underline">#{po.id.substring(0, 8)}</span>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${po.status === 'Received' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{po.status}</span>
                                </div>
                                <p className="text-[11px] font-black text-gray-800 italic uppercase leading-none mb-3">
                                    PO DATE: {new Date(po.orderDate).toLocaleDateString()}
                                </p>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    {po.status === 'Submitted' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                receivePoMutation.mutate(po.id);
                                            }}
                                            disabled={receivePoMutation.isPending}
                                            className="px-3 py-1.5 bg-[#D70018] text-white text-[8px] font-black uppercase rounded-lg hover:bg-black transition-all"
                                        >
                                            Nhập kho
                                        </button>
                                    )}
                                    <span className="text-sm font-black text-gray-900 tracking-tighter ml-auto">ITEMS: {po.items?.length || 0}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <button className="w-full py-4 mt-8 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3">
                        <FileText size={16} /> Xem tất cả đơn nhập
                    </button>
                </motion.div>
            </div>

            {/* Create PO Modal */}
            <AnimatePresence>
                {isPoModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPoModalOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Tạo <span className="text-[#D70018]">Đơn nhập hàng</span></h2>
                                <button onClick={() => setIsPoModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-[#D70018]"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreatePO} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sản phẩm cần nhập</label>
                                        <select name="productId" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold appearance-none">
                                            {productsData?.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số lượng nhập</label>
                                        <input name="quantity" type="number" required defaultValue={10} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsPoModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase bg-gray-50 rounded-2xl">Hủy</button>
                                    <button type="submit" disabled={createPoMutation.isPending} className="flex-[2] py-4 text-[10px] font-black uppercase bg-[#D70018] text-white rounded-2xl shadow-xl shadow-red-500/20">
                                        {createPoMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        Xác nhận tạo PO
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
