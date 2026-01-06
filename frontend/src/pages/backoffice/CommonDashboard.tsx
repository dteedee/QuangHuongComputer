import {
    ArrowUpRight, ArrowDownRight, Package,
    ShoppingCart, Users, DollarSign
} from 'lucide-react';

export const CommonDashboard = () => {
    const stats = [
        { label: 'Total Revenue', value: '$128,430', change: '+12.5%', icon: <DollarSign className="text-emerald-400" />, trend: 'up' },
        { label: 'Active Orders', value: '43', change: '+5.2%', icon: <ShoppingCart className="text-blue-400" />, trend: 'up' },
        { label: 'New Customers', value: '12', change: '-2.4%', icon: <Users className="text-purple-400" />, trend: 'down' },
        { label: 'Stock Alerts', value: '8', change: 'Critical', icon: <Package className="text-amber-400" />, trend: 'none' },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">System Dashboard</h1>
                <p className="text-slate-400 mt-1">Welcome back. Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-3xl hover:border-slate-700 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-800/50 rounded-2xl group-hover:scale-110 transition-transform">
                                {stat.icon}
                            </div>
                            {stat.trend !== 'none' && (
                                <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {stat.change}
                                </div>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 min-h-[400px] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute top-8 left-8">
                        <h3 className="text-lg font-bold text-white">Revenue Overview</h3>
                        <p className="text-sm text-slate-500">Monthly sales performance</p>
                    </div>
                    {/* Mock Chart Animation */}
                    <div className="w-full h-48 flex items-end gap-2 px-8">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 95, 60, 75, 100].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-1000 ease-out hover:from-blue-400 hover:to-blue-300"
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                    <div className="space-y-6 flex-1">
                        {[
                            { user: 'Tech Support', action: 'Resolved ticket #1204', time: '12m ago' },
                            { user: 'Sale Dept', action: 'New order #9942', time: '45m ago' },
                            { user: 'System', action: 'Database backup complete', time: '2h ago' },
                            { user: 'Accountant', action: 'Invoice #883 issued', time: '3h ago' },
                        ].map((act, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                                <div>
                                    <p className="text-sm font-semibold text-white">{act.action}</p>
                                    <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                        <span>{act.user}</span>
                                        <span>•</span>
                                        <span>{act.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-4 mt-6 bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-sm font-bold rounded-2xl transition-colors">
                        View All Activity
                    </button>
                </div>
            </div>
        </div>
    );
};

