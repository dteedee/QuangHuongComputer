import { useState, useEffect } from 'react';
import {
    ShieldCheck, Search, FileText, CheckCircle,
    XCircle, Clock, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { warrantyApi } from '../../api/warranty';
import type { WarrantyClaim } from '../../api/warranty';

export const WarrantyPortal = () => {
    const [claims, setClaims] = useState<WarrantyClaim[]>([]);
    const [serialLookup, setSerialLookup] = useState('');
    const [lookupResult, setLookupResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchClaims = async () => {
            try {
                const data = await warrantyApi.getMyClaims();
                setClaims(data);
            } catch (error) {
                console.error('Failed to fetch claims', error);
            }
        };
        fetchClaims();
    }, []);

    const handleLookup = async () => {
        if (!serialLookup) return;
        setIsLoading(true);
        try {
            const result = await warrantyApi.lookupCoverage(serialLookup);
            setLookupResult(result);
        } catch (error) {
            console.error('Lookup failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Warranty & RMA</h1>
                <p className="text-slate-400 mt-1">Process claims and verify product coverage.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coverage Lookup */}
                <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col h-fit">
                    <h3 className="text-lg font-bold text-white mb-6">Coverage Verification</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Serial Number</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={serialLookup}
                                    onChange={(e) => setSerialLookup(e.target.value)}
                                    placeholder="e.g. SN-123456"
                                    className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono uppercase"
                                />
                                <button
                                    onClick={handleLookup}
                                    disabled={isLoading}
                                    className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50"
                                >
                                    <Search size={20} />
                                </button>
                            </div>
                        </div>

                        {lookupResult && (
                            <div className={`p-6 rounded-2xl border animate-in zoom-in duration-300 ${lookupResult.isValid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    {lookupResult.isValid ? <CheckCircle className="text-emerald-500" size={24} /> : <XCircle className="text-rose-500" size={24} />}
                                    <h4 className={`font-bold ${lookupResult.isValid ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {lookupResult.isValid ? 'Valid Warranty' : 'Expired / Invalid'}
                                    </h4>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Status</span>
                                        <span className="text-white font-medium">{lookupResult.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Expires</span>
                                        <span className="text-white font-medium">{new Date(lookupResult.expirationDate).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {lookupResult.isValid && (
                                    <button className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-xs">
                                        Initiate RMA Claim
                                    </button>
                                )}
                            </div>
                        )}

                        {!lookupResult && (
                            <div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl text-center">
                                <ShieldCheck className="mx-auto text-slate-800 mb-2" size={40} />
                                <p className="text-xs text-slate-600">Enter a serial number to check status</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Claims List */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">RMA Claims Pipeline</h3>
                        <div className="flex gap-2">
                            <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Filter size={18} /></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Claim ID</th>
                                    <th className="px-6 py-4 font-semibold">Serial #</th>
                                    <th className="px-6 py-4 font-semibold">Issue</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {claims.map((claim) => (
                                    <tr key={claim.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono text-slate-500">{claim.id.substring(0, 8)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-white">
                                            {claim.serialNumber}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-300 truncate max-w-[200px]">{claim.issueDescription}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {claim.status === 'Resolved' ? <CheckCircle className="text-emerald-500" size={14} /> : <Clock className="text-amber-500" size={14} />}
                                                <span className={`text-xs font-semibold ${claim.status === 'Resolved' ? 'text-emerald-500' : 'text-amber-500'}`}>{claim.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                                <ArrowUpRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {claims.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic">No active claims found in queue.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Support Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Avg Resolution Time', value: '3.2 Days', icon: <Clock className="text-blue-400" /> },
                    { label: 'Approval Rate', value: '98.5%', icon: <ShieldCheck className="text-emerald-400" /> },
                    { label: 'Replacement Sent', value: '45', icon: <FileText className="text-purple-400" /> },
                    { label: 'Denied Claims', value: '2', icon: <AlertCircle className="text-rose-400" /> },
                ].map((m, i) => (
                    <div key={i} className="bg-slate-900/20 border border-slate-800/50 p-6 rounded-3xl flex items-center gap-4">
                        <div className="p-3 bg-slate-800/50 rounded-2xl">{m.icon}</div>
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{m.label}</p>
                            <h4 className="text-xl font-bold text-white leading-tight">{m.value}</h4>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

