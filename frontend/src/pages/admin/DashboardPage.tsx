import { Package, ShoppingCart, Users, DollarSign, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../../api/sales';

export const AdminDashboard = () => {

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: salesApi.admin.getStats
    });

    const { data: ordersData, isLoading: ordersLoading } = useQuery({
        queryKey: ['admin-recent-orders'],
        queryFn: () => salesApi.admin.getOrders(1, 5)
    });

    if (statsLoading || ordersLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Revenue', value: `$${stats?.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
        { label: 'Total Orders', value: stats?.totalOrders, icon: ShoppingCart, color: 'bg-blue-500' },
        // We don't have product/user count in sales stats yet, use placeholders or fetch from other APIS
        { label: 'Pending Orders', value: stats?.pendingOrders, icon: Package, color: 'bg-purple-500' },
        { label: 'Completed Orders', value: stats?.completedOrders, icon: Users, color: 'bg-orange-500' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.color} p-3 rounded-lg`}>
                                <stat.icon className="text-white" size={24} />
                            </div>
                            {/* <TrendingUp className="text-green-400" size={20} /> */}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                        <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
                <div className="space-y-3">
                    {ordersData?.orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition">
                            <div>
                                <p className="text-white font-medium">Order #{order.orderNumber}</p>
                                <p className="text-sm text-gray-400">{order.shippingAddress?.substring(0, 30)}... • {order.items?.length || 0} items</p>
                            </div>
                            <div className="text-right">
                                <p className="text-white font-medium">${order.totalAmount.toLocaleString()}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                    order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>{order.status}</span>
                            </div>
                        </div>
                    ))}
                    {ordersData?.orders.length === 0 && (
                        <p className="text-gray-400 text-center py-4">No recent orders</p>
                    )}
                </div>
            </div>
        </div>
    );
};

