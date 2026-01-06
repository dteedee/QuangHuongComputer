import { useState, useEffect } from 'react';
import {
    Wrench, Clock, CheckCircle2, AlertCircle,
    Play, CheckSquare, Search, Filter
} from 'lucide-react';
import { repairApi } from '../../../api/repair';
import type { WorkOrder } from '../../../api/repair';

export const TechPortal = () => {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [ordersData, statsData] = await Promise.all([
                    repairApi.admin.getWorkOrders(),
                    repairApi.admin.getStats()
                ]);
                setWorkOrders(ordersData.workOrders);
                setStats(statsData);
            } catch (error) {
                console.error('Failed to fetch repair data', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending': return <Clock className="text-yellow-400" size={18} />;
            case 'InProgress': return <Play className="text-blue-400" size={18} />;
            case 'Completed': return <CheckCircle2 className="text-emerald-400" size={18} />;
            case 'Cancelled': return <AlertCircle className="text-rose-400" size={18} />;
            default: return <Wrench className="text-slate-400" size={18} />;
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Technician Portal</h1>
                <p className="text-slate-400 mt-1">Manage repair tickets and work orders.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-yellow-500/10 rounded-2xl">
                            <Clock className="text-yellow-400" size={24} />
                        </div>
                        <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg">Pending</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Assigned to Me</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{stats?.pendingWorkOrders || 0} Jobs</h3>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl">
                            <Play className="text-blue-400" size={24} />
                        </div>
                        <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">In Progress</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Active Tasks</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{stats?.inProgressWorkOrders || 0} Jobs</h3>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                            <CheckCircle2 className="text-emerald-400" size={24} />
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">Done</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Completed Today</p>
                    <h3 className="text-2xl font-bold text-white mt-1">12 Jobs</h3>
                </div>
            </div>

            {/* Work Orders List */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-white">Active Work Orders</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search ticket..."
                                className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            />
                        </div>
                        <button className="p-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Ticket</th>
                                <th className="px-6 py-4 font-semibold">Device</th>
                                <th className="px-6 py-4 font-semibold">Issue</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Created</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {workOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-blue-400">#{order.ticketNumber}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-white">{order.deviceModel}</p>
                                        <p className="text-xs text-slate-500">S/N: {order.serialNumber}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-300 truncate max-w-xs">{order.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(order.status)}
                                            <span className="text-xs font-semibold text-slate-300">{order.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all">
                                                <Play size={16} />
                                            </button>
                                            <button className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                                                <CheckSquare size={16} />
                                            </button>
                                        </div>
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

