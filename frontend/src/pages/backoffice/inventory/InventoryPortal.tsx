import { useState, useEffect } from 'react';
import {
    Box, Package, Truck, AlertTriangle,
    Plus, Search, Filter, ArrowRight
} from 'lucide-react';
import { inventoryApi } from '../../../api/inventory';
import type { InventoryItem, PurchaseOrder } from '../../../api/inventory';

export const InventoryPortal = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [invData, poData] = await Promise.all([
                    inventoryApi.getInventory(),
                    inventoryApi.getPurchaseOrders()
                ]);
                setItems(invData);
                setOrders(poData);
            } catch (error) {
                console.error('Failed to fetch inventory data', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const lowStockItems = items.filter(i => i.quantityOnHand <= i.reorderLevel);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Inventory Management</h1>
                    <p className="text-slate-400 mt-1">Track stock levels and manage procurement.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                    <Plus size={20} />
                    Create Purchase Order
                </button>
            </div>

            {/* Critical Alerts */}
            {lowStockItems.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-2xl">
                            <AlertTriangle className="text-amber-500" size={24} />
                        </div>
                        <div>
                            <h4 className="text-amber-500 font-bold">Low Stock Warning</h4>
                            <p className="text-amber-500/70 text-sm">{lowStockItems.length} items are below the reorder level.</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 text-amber-500 font-bold text-sm hover:underline">
                        Review Now <ArrowRight size={16} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Stock Table */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Stock Availability</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">SKU / ID</th>
                                    <th className="px-6 py-4 font-semibold">Product</th>
                                    <th className="px-6 py-4 font-semibold">Quantity</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.id.substring(0, 8)}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-white">{item.productName || 'Product Name'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className={`text-sm font-bold ${item.quantityOnHand <= item.reorderLevel ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {item.quantityOnHand} units
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider ${item.quantityOnHand <= item.reorderLevel ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {item.quantityOnHand <= item.reorderLevel ? 'Reorder Needed' : 'In Stock'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Purchase Orders Sidebar */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Recent POs</h3>
                        <Truck className="text-slate-500" size={20} />
                    </div>
                    <div className="space-y-4">
                        {orders.map((po) => (
                            <div key={po.id} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-bold text-blue-400">{po.poNumber}</span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-700 px-2 py-0.5 rounded uppercase">{po.status}</span>
                                </div>
                                <p className="text-xs text-slate-300 font-medium mb-1">{po.supplierName || 'Supplier'}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">{new Date(po.orderDate).toLocaleDateString()}</span>
                                    <span className="text-sm font-bold text-white">${po.totalAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-4 mt-6 bg-slate-800 text-slate-300 text-sm font-bold rounded-2xl hover:bg-slate-700 transition-colors">
                        View All Procurement
                    </button>
                </div>
            </div>
        </div>
    );
};

