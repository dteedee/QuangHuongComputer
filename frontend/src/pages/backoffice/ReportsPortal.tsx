import { useState, useEffect } from 'react';
import {
    BarChart3, PieChart, TrendingUp, TrendingDown,
    Download, Calendar, Filter, ArrowUpRight
} from 'lucide-react';
import client from '../../api/client';

export const ReportsPortal = () => {
    const [salesStats, setSalesStats] = useState<any>(null);
    const [invValue, setInvValue] = useState<any>(null);
    const [arAging, setArAging] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            setIsLoading(true);
            try {
                const [salesRes, invRes, arRes] = await Promise.all([
                    client.get('/reports/sales-summary'),
                    client.get('/reports/inventory-value'),
                    client.get('/reports/ar-aging')
                ]);
                setSalesStats(salesRes.data);
                setInvValue(invRes.data);
                setArAging(arRes.data);
            } catch (error) {
                console.error('Failed to fetch reporting data', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReports();
    }, []);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Business Intelligence</h1>
                    <p className="text-slate-400 mt-1">Real-time insights across all business operations.</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all">
                        <Calendar size={20} />
                        Date Range
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20">
                        <Download size={20} />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500">
                        <TrendingUp size={100} />
                    </div>
                    <p className="text-slate-500 text-sm font-semibold mb-2">Total Sales Revenue</p>
                    <h3 className="text-4xl font-bold text-white flex items-baseline gap-2">
                        ${salesStats?.totalRevenue?.toLocaleString() || '0'}
                        <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                            <ArrowUpRight size={14} /> 12%
                        </span>
                    </h3>
                    <p className="text-slate-500 text-xs mt-4">Based on {salesStats?.totalOrders || 0} completed orders</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500">
                        <PieChart size={100} />
                    </div>
                    <p className="text-slate-500 text-sm font-semibold mb-2">Inventory Asset Value</p>
                    <h3 className="text-4xl font-bold text-white">
                        ${invValue?.totalValue?.toLocaleString() || '0'}
                    </h3>
                    <p className="text-slate-500 text-xs mt-4">Current stock at estimated cost price</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500">
                        <BarChart3 size={100} />
                    </div>
                    <p className="text-slate-500 text-sm font-semibold mb-2">Accounts Receivable</p>
                    <h3 className="text-4xl font-bold text-rose-400">
                        ${arAging?.reduce((acc, curr) => acc + curr.balance, 0)?.toLocaleString() || '0'}
                    </h3>
                    <p className="text-slate-500 text-xs mt-4">Pending payments from organization accounts</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AR Aging Table */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">AR Aging Summary</h3>
                        <Filter className="text-slate-500" size={20} />
                    </div>
                    <div className="space-y-4">
                        {arAging.map((account, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-slate-800/30 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                                <div>
                                    <p className="font-bold text-white text-sm">{account.organizationName}</p>
                                    <p className="text-xs text-slate-500">Limit: ${account.creditLimit?.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-rose-400">${account.balance?.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Unpaid Balance</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Growth Chart Placeholder */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Yearly Growth</h3>
                        <p className="text-slate-500 text-sm">Revenue comparison vs previous year</p>
                    </div>
                    <div className="h-48 flex items-end gap-3 mt-8">
                        {[30, 45, 25, 60, 80, 55, 90, 70, 85, 40, 65, 95].map((h, i) => (
                            <div key={i} className="flex-1 group relative">
                                <div
                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-700"
                                    style={{ height: `${h}%` }}
                                />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {h}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                        <span>Jan</span>
                        <span>Jun</span>
                        <span>Dec</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

