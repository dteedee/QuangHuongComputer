import { useState, useEffect } from 'react';
import { Package, TrendingDown, AlertTriangle, ShoppingCart, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../../../api/client';

interface InventoryItem {
    id: string;
    productId: string;
    quantityOnHand: number;
    reorderLevel: number;
}

interface PurchaseOrder {
    id: string;
    poNumber: string;
    supplierId: string;
    status: number;
    totalAmount: number;
    orderDate: string;
}

export const InventoryPortal = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [invRes, poRes] = await Promise.all([
                client.get('/inventory/items'),
                client.get('/inventory/purchase-orders')
            ]);
            setInventory(invRes.data);
            setPurchaseOrders(poRes.data);
        } catch (error) {
            console.error('Failed to fetch inventory data', error);
        } finally {
            setLoading(false);
        }
    };

    const lowStockItems = inventory.filter(item => item.quantityOnHand <= item.reorderLevel);
    const totalStock = inventory.reduce((sum, item) => sum + item.quantityOnHand, 0);

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase">Pending</span>;
            case 1: return <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">Received</span>;
            case 2: return <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-xs font-black uppercase">Cancelled</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Kho hàng</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                        Theo dõi tồn kho, đơn nhập hàng và cảnh báo hết hàng
                    </p>
                </div>
                <button className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20">
                    <Plus size={18} />
                    Tạo đơn nhập
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Package size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tổng kho</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{totalStock}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Sản phẩm trong kho</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                            <AlertTriangle size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Cảnh báo</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{lowStockItems.length}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Sắp hết hàng</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                            <ShoppingCart size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Đơn nhập</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{purchaseOrders.length}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Tổng đơn nhập hàng</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <TrendingDown size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Chờ nhận</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                        {purchaseOrders.filter(po => po.status === 0).length}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Đơn chưa nhận</p>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Low Stock Alert */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card overflow-hidden"
                >
                    <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic">Cảnh báo tồn kho thấp</h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                        {lowStockItems.length === 0 ? (
                            <div className="p-20 text-center">
                                <Package className="mx-auto text-gray-100 mb-4" size={60} />
                                <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">
                                    Tất cả sản phẩm đều đủ hàng
                                </p>
                            </div>
                        ) : (
                            lowStockItems.map((item) => (
                                <div key={item.id} className="p-6 hover:bg-red-50/50 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-all">
                                                <AlertTriangle className="text-red-600" size={20} />
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-sm uppercase italic">
                                                    Product {item.productId.substring(0, 8)}
                                                </p>
                                                <p className="text-xs text-gray-400 font-bold mt-1">
                                                    Reorder: {item.reorderLevel} units
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-red-600 tracking-tighter">
                                                {item.quantityOnHand}
                                            </p>
                                            <p className="text-xs text-gray-400 font-bold uppercase">Còn lại</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Purchase Orders */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card overflow-hidden"
                >
                    <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic">Đơn nhập hàng gần đây</h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                        {purchaseOrders.length === 0 ? (
                            <div className="p-20 text-center">
                                <ShoppingCart className="mx-auto text-gray-100 mb-4" size={60} />
                                <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">
                                    Chưa có đơn nhập hàng
                                </p>
                            </div>
                        ) : (
                            purchaseOrders.slice(0, 10).map((po) => (
                                <div key={po.id} className="p-6 hover:bg-gray-50/50 transition-colors group">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-black text-[#D70018] font-mono text-sm">
                                            {po.poNumber}
                                        </span>
                                        {getStatusBadge(po.status)}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold">
                                                Supplier: {po.supplierId.substring(0, 8)}...
                                            </p>
                                            <p className="text-xs text-gray-400 font-bold mt-1">
                                                {new Date(po.orderDate).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                        <p className="text-lg font-black text-gray-900 tracking-tighter">
                                            ${po.totalAmount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
