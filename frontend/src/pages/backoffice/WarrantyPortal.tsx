import { useState, useEffect } from 'react';
import {
    ShieldCheck, Search, FileText, CheckCircle,
    XCircle, Clock, AlertCircle, ArrowUpRight, Filter
} from 'lucide-react';
import { warrantyApi } from '../../api/warranty';
import type { WarrantyClaim } from '../../api/warranty';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

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
            if (result.isValid) {
                toast.success('Sản phẩm còn bảo hành!', { icon: '✅' });
            } else {
                toast.error('Sản phẩm đã hết hạn hoặc không tồn tại', { icon: '❌' });
            }
        } catch (error) {
            toast.error('Lỗi khi tra cứu thông tin');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Bảo hành & <span className="text-[#D70018]">RMA</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Tra cứu bảo hành và xử lý yêu cầu đổi trả
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coverage Lookup */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-1 premium-card p-8 flex flex-col h-fit"
                >
                    <h3 className="text-lg font-black text-gray-900 mb-8 uppercase italic italic border-b border-gray-100 pb-4">Kiểm tra bảo hành</h3>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Số Serial (S/N)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={serialLookup}
                                    onChange={(e) => setSerialLookup(e.target.value)}
                                    placeholder="Vd: SN-123456"
                                    className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#D70018] transition-all font-mono uppercase font-bold"
                                />
                                <button
                                    onClick={handleLookup}
                                    disabled={isLoading}
                                    className="w-14 h-14 bg-[#D70018] hover:bg-[#b50014] text-white rounded-2xl shadow-lg shadow-red-500/20 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                                >
                                    <Search size={22} />
                                </button>
                            </div>
                        </div>

                        {lookupResult && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-6 rounded-3xl border-2 ${lookupResult.isValid ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${lookupResult.isValid ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-red-500 text-white shadow-red-500/20'}`}>
                                        {lookupResult.isValid ? <CheckCircle size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div>
                                        <h4 className={`font-black uppercase italic tracking-tighter ${lookupResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                                            {lookupResult.isValid ? 'Còn bảo hành' : 'Hết hạn bảo hành'}
                                        </h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Trạng thái xác thực</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tình trạng</span>
                                        <span className="text-xs font-black text-gray-800 uppercase">{lookupResult.status}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Ngày hết hạn</span>
                                        <span className="text-xs font-black text-gray-800">{new Date(lookupResult.expirationDate).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                                {lookupResult.isValid && (
                                    <button className="w-full mt-6 py-4 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl">
                                        Khởi tạo yêu cầu RMA
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {!lookupResult && (
                            <div className="p-10 bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl text-center">
                                <ShieldCheck className="mx-auto text-gray-200 mb-4" size={50} />
                                <p className="text-[11px] text-gray-400 font-black uppercase italic">Nhập số Serial để tra cứu ngay</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Active Claims List */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 premium-card overflow-hidden h-fit"
                >
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                        <h3 className="text-lg font-black text-gray-900 uppercase italic">Danh sách yêu cầu RMA</h3>
                        <div className="flex gap-2">
                            <button className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors border border-gray-100"><Filter size={18} /></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#D70018]/5 text-[#D70018] text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Mã yêu cầu</th>
                                    <th className="px-8 py-5">Số Serial</th>
                                    <th className="px-8 py-5">Lỗi kỹ thuật</th>
                                    <th className="px-8 py-5">Trạng thái</th>
                                    <th className="px-8 py-5 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {claims.map((claim) => (
                                    <tr key={claim.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] font-black text-[#D70018] bg-red-50 px-2 py-1 rounded-lg uppercase">#{claim.id.substring(0, 6)}</span>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-black text-gray-800 uppercase italic">
                                            {claim.serialNumber}
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs text-gray-500 font-medium truncate max-w-[150px]">{claim.issueDescription}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${claim.status === 'Resolved' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {claim.status === 'Resolved' ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                {claim.status === 'Resolved' ? 'Hoàn tất' : 'Đang xử lý'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-[#D70018] hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                                <ArrowUpRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {claims.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <ShieldCheck className="mx-auto text-gray-100 mb-4" size={60} />
                                            <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Không có yêu cầu bảo hành nào trong hàng đợi.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            {/* Support Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Thời gian xử lý TB', value: '3.2 Ngày', icon: <Clock className="text-blue-500" /> },
                    { label: 'Tỉ lệ chấp thuận', value: '98.5%', icon: <ShieldCheck className="text-green-500" /> },
                    { label: 'Linh kiện đổi mới', value: '45', icon: <FileText className="text-purple-500" /> },
                    { label: 'Từ chối bảo hành', value: '2', icon: <AlertCircle className="text-red-500" /> },
                ].map((m, i) => (
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        key={i}
                        className="premium-card p-6 flex items-center gap-5 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-inner">
                            {m.icon}
                        </div>
                        <div>
                            <p className="text-gray-400 text-[9px] uppercase font-black tracking-widest mb-1">{m.label}</p>
                            <h4 className="text-xl font-black text-gray-900 tracking-tighter italic">{m.value}</h4>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
