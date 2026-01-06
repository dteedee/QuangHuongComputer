
import { useState, useEffect } from 'react';
import { Eye, Filter, Loader2 } from 'lucide-react';
import { salesApi } from '../../api/sales';
import type { Order } from '../../api/sales';

export const AdminOrdersPage = () => {
    const [statusFilter, setStatusFilter] = useState('all');
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data = await salesApi.admin.getOrders(page, 20);
            setOrders(data.orders);
            setTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [page]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-500/20 text-yellow-400';
            case 'Confirmed': return 'bg-blue-500/20 text-blue-400';
            case 'Shipped': return 'bg-purple-500/20 text-purple-400';
            case 'Delivered': return 'bg-green-500/20 text-green-400';
            case 'Cancelled': return 'bg-red-500/20 text-red-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Orders</h1>
                    <p className="text-gray-400">Manage customer orders and fulfillment</p>
                </div>
                <div className="flex items-center gap-3">
                    <Filter className="text-gray-400" size={20} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="p-10 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Order ID</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Customer ID</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Items</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Total</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders
                                .filter(order => statusFilter === 'all' || order.status === statusFilter)
                                .map((order) => (
                                    <tr key={order.id} className="border-t border-white/10 hover:bg-white/5 transition">
                                        <td className="px-6 py-4 text-white font-medium">
                                            <span title={order.id}>#{order.orderNumber}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">
                                            <span title={order.customerId} className="cursor-help underline decoration-dotted">
                                                {order.customerId.substring(0, 8)}...
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">{order.items ? order.items.length : 0} items</td>
                                        <td className="px-6 py-4 text-white font-medium">${order.totalAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">{new Date(order.orderDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end">
                                                <button className="flex items-center gap-2 px-3 py-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition">
                                                    <Eye size={18} />
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
                {orders.length === 0 && !isLoading && (
                    <div className="p-10 text-center text-gray-400">
                        No orders found.
                    </div>
                )}
            </div>

            {/* Pagination controls could go here */}
            <div className="flex justify-between items-center text-gray-400">
                <span>Showing {orders.length} of {total} orders</span>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        disabled={orders.length < 20} // Simple check, ideally check against total
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

