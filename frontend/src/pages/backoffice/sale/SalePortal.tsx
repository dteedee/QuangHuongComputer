import { useState, useEffect } from 'react';
import {
    ShoppingCart, Plus, Package, Users,
    Search, Filter, CreditCard, ArrowRight,
    Tag, Star
} from 'lucide-react';
import { salesApi } from '../../../api/sales';
import type { Order } from '../../../api/sales';
import { Link } from 'react-router-dom';

export const SalePortal = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecentOrders = async () => {
            setIsLoading(true);
            try {
                const data = await salesApi.admin.getOrders(1, 10);
                setOrders(data.orders);
            } catch (error) {
                console.error('Failed to fetch orders', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecentOrders();
    }, []);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Sales Hub</h1>
                    <p className="text-slate-400 mt-1">Manage orders, customers, and promotions.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                    <Plus size={20} />
                    New Manual Order
                </button>
            </div>

            {/* Quick Actions & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2 grid grid-cols-2 gap-6">
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl group cursor-pointer hover:border-blue-500/50 transition-all">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl w-fit mb-4 group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <Tag size={24} />
                        </div>
                        <h4 className="text-white font-bold">Campaigns</h4>
                        <p className="text-slate-500 text-sm mt-1">Manage discounts and coupons</p>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl group cursor-pointer hover:border-purple-500/50 transition-all">
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl w-fit mb-4 group-hover:bg-purple-500 group-hover:text-white transition-all">
                            <Star size={24} />
                        </div>
                        <h4 className="text-white font-bold">Loyalty</h4>
                        <p className="text-slate-500 text-sm mt-1">Customer points and rewards</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl lg:col-span-2 relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-2">POS Interface</h3>
                        <p className="text-blue-100/70 text-sm max-w-[250px]">Open the point-of-sale terminal for in-shop checkout.</p>
                    </div>
                    <button className="relative z-10 mt-6 flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all w-fit">
                        Launch Terminal <ArrowRight size={18} />
                    </button>
                    <CreditCard className="absolute -right-8 -bottom-8 text-white/10 rotate-12" size={200} />
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Recent Sales</h3>
                    <Link to="/backoffice/orders" className="text-sm font-bold text-blue-400 hover:underline">View All</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/30 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Order #</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-white">#{order.orderNumber}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs">
                                                {order.customerId.charAt(0)}
                                            </div>
                                            <span className="text-sm text-slate-300 font-medium">{order.customerId.substring(0, 8)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider ${order.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                                                order.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-white">${order.totalAmount.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {new Date(order.orderDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all">
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

