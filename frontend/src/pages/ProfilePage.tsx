
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
            <h1 className="text-3xl font-bold text-white mb-8 border-b border-white/10 pb-4">My Account</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 sticky top-24">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xl font-bold text-white">
                                U
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Customer</h3>
                                <p className="text-gray-400 text-sm">Member</p>
                            </div>
                        </div>
                        <nav className="space-y-2">
                            <button className="w-full text-left px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg font-medium">
                                My Orders
                            </button>
                            <button className="w-full text-left px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition">
                                Account Settings
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <h2 className="text-xl font-bold text-white mb-6">Order History</h2>

                    {error ? (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
                            <p className="text-gray-400 text-lg">Start shopping to see your orders here.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 overflow-hidden hover:border-blue-500/30 transition group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition">
                                                <Hash className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-400">Order Number</div>
                                                <div className="text-white font-mono font-bold text-lg">#{order.orderNumber}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                            <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${getStatusColor(order.status)}`}>
                                                <div className="w-2 h-2 rounded-full bg-current"></div>
                                                {order.status}
                                            </div>
                                            <div className="px-4 py-2 bg-white/5 rounded-full text-gray-400 text-sm flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                {new Date(order.orderDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <div className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                                                <MapPin className="w-4 h-4" /> Shipping Address
                                            </div>
                                            <p className="text-white bg-black/20 p-3 rounded-lg text-sm">{order.shippingAddress}</p>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                                                <DollarSign className="w-4 h-4" /> Total Amount
                                            </div>
                                            <p className="text-white text-2xl font-bold">${order.totalAmount.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 rounded-xl p-4">
                                        <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Items</h4>
                                        <div className="space-y-3">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 min-w-[32px] rounded bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-bold">
                                                            {item.quantity}x
                                                        </div>
                                                        <span className="text-white font-medium">{item.productName}</span>
                                                    </div>
                                                    <span className="text-gray-400 font-mono">${(item.unitPrice * item.quantity).toLocaleString()}</span>
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

