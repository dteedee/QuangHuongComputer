import { useState, useEffect } from 'react';
import {
    Receipt, Landmark, Landmark as Bank,
    FileText, ArrowUpRight, ArrowDownRight, Search, Filter
} from 'lucide-react';
import client from '../../../api/client';

export const AccountingPortal = () => {
    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await client.get('/reports/ar-aging');
                setAccounts(response.data);
            } catch (error) {
                console.error('Failed to fetch accounts', error);
            }
        };
        fetchAccounts();
    }, []);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Financial Operations</h1>
                    <p className="text-slate-400 mt-1">Manage corporate accounts, invoicing, and receivables.</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all">
                        <Bank size={20} />
                        Banking
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20">
                        <Receipt size={20} />
                        New Invoice
                    </button>
                </div>
            </div>

            {/* Account Balances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl group">
                    <p className="text-slate-500 text-sm font-semibold mb-2">Total Receivables</p>
                    <h3 className="text-4xl font-bold text-white flex items-baseline gap-2">
                        ${accounts.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                        <ArrowDownRight className="text-rose-400" size={24} />
                    </h3>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 w-[65%]" />
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">65% Overdue</span>
                    </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl group">
                    <p className="text-slate-500 text-sm font-semibold mb-2">Available Credit</p>
                    <h3 className="text-4xl font-bold text-white flex items-baseline gap-2">
                        ${accounts.reduce((sum, a) => sum + a.creditLimit, 0).toLocaleString()}
                        <ArrowUpRight className="text-emerald-400" size={24} />
                    </h3>
                    <p className="text-slate-500 text-xs mt-4">Extended to {accounts.length} organization accounts</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl group">
                    <p className="text-slate-500 text-sm font-semibold mb-2">Cash Flow (30d)</p>
                    <h3 className="text-4xl font-bold text-emerald-400">
                        +$42,150
                    </h3>
                    <p className="text-slate-500 text-xs mt-4">Projected based on current aging</p>
                </div>
            </div>

            {/* Corporate Accounts Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-white">Organization Accounts (AR)</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search organization..."
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
                                <th className="px-6 py-4 font-semibold">Organization</th>
                                <th className="px-6 py-4 font-semibold">Contact</th>
                                <th className="px-6 py-4 font-semibold text-right">Credit Limit</th>
                                <th className="px-6 py-4 font-semibold text-right">Current Balance</th>
                                <th className="px-6 py-4 font-semibold text-right">Last Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {accounts.map((account) => (
                                <tr key={account.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded-xl text-blue-400">
                                                <Landmark size={20} />
                                            </div>
                                            <span className="font-bold text-white text-sm">{account.organizationName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-slate-300">{account.contactEmail}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Verified Account</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-bold text-slate-400">${account.creditLimit.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-sm font-bold ${account.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            ${account.balance.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                            <FileText size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {accounts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic font-medium">
                                        No organization accounts configured.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
