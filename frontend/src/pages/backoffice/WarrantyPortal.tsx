import { useState, useEffect } from 'react';
import { Shield, Search, CheckCircle, XCircle, Clock, AlertCircle, Package, Calendar } from 'lucide-react';
import client from '../../api/client';

export const WarrantyPortal = () => {
    const [warranties, setWarranties] = useState<any[]>([]);
    const [searchSerial, setSearchSerial] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchWarranties();
    }, []);

    const fetchWarranties = async () => {
        try {
            const res = await client.get('/warranty/admin/warranties');
            setWarranties(res.data);
        } catch (error) {
            console.error('Failed to fetch warranties', error);
        }
    };

    const handleSearch = async () => {
        if (!searchSerial.trim()) return;
        setLoading(true);
        try {
            const res = await client.get(`/warranty/lookup/${searchSerial}`);
            setSearchResult(res.data);
        } catch (error: any) {
            setSearchResult({ error: 'Không tìm thấy số Serial này trong hệ thống' });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: // Active
                return <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest italic shadow-sm">Đang hiệu lực</span>;
            case 1: // Expired
                return <span className="px-4 py-1.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest italic shadow-sm">Hết hạn</span>;
            case 2: // Voided
                return <span className="px-4 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest italic shadow-sm">Đã hủy bỏ</span>;
            default:
                return <span className="px-4 py-1.5 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest italic shadow-sm">N/A</span>;
        }
    };

    const isExpired = (expirationDate: string) => new Date(expirationDate) < new Date();

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Quản lý <span className="text-[#D70018]">Bảo hành</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Theo dõi và xử lý bảo hành sản phẩm khách hàng
                    </p>
                </div>
            </div>

            {/* Search Box */}
            <div className="premium-card p-10 border-2 bg-white">
                <div className="flex items-center gap-3 mb-8">
                    <Search className="text-[#D70018]" size={24} />
                    <h3 className="text-2xl font-black text-gray-950 uppercase italic tracking-tighter">Tra cứu bảo hành hệ thống</h3>
                </div>
                <div className="flex gap-6">
                    <input
                        type="text"
                        value={searchSerial}
                        onChange={(e) => setSearchSerial(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Nhập số Serial (VD: SN-A1B2C3D4...)"
                        className="flex-1 px-8 py-5 border-2 border-gray-100 rounded-2xl text-base font-black text-gray-950 focus:border-[#D70018] focus:outline-none transition-all shadow-sm placeholder:text-gray-400 font-mono"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-10 py-5 bg-gray-950 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-gray-900/20 disabled:opacity-50 active:scale-95"
                    >
                        {loading ? 'Đang truy vấn...' : 'Bắt đầu tra cứu'}
                    </button>
                </div>

                {searchResult && (
                    <div className="mt-10 p-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 animate-fade-in">
                        {searchResult.error ? (
                            <div className="flex items-center gap-4 text-red-600">
                                <XCircle size={32} />
                                <span className="font-black text-lg uppercase tracking-tight">{searchResult.error}</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                                <div className="space-y-2">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Serial Number</p>
                                    <p className="text-2xl font-black text-gray-950 font-mono italic tracking-tighter">{searchResult.serialNumber}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Trạng thái BH</p>
                                    <div>
                                        <span className={`px-5 py-2 rounded-2xl text-xs font-black uppercase italic shadow-sm border-2 ${searchResult.isValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {searchResult.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Ngày hết hạn</p>
                                    <p className="text-xl font-black text-gray-950 underline decoration-[#D70018] decoration-4 underline-offset-4">{new Date(searchResult.expirationDate).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Mã sản phẩm</p>
                                    <p className="font-mono text-xs font-black text-gray-400 uppercase tracking-widest bg-white border border-gray-100 p-2 rounded-lg">{searchResult.productId}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="premium-card p-10 border-2 hover:border-emerald-500/20 group cursor-pointer transition-all active:scale-95">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform">
                            <CheckCircle size={28} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest italic">Hiệu lực</span>
                    </div>
                    <h3 className="text-5xl font-black text-gray-950 tracking-tighter italic">
                        {warranties.filter(w => !isExpired(w.expirationDate) && w.status === 0).length}
                    </h3>
                    <p className="text-xs text-gray-500 font-black uppercase tracking-widest mt-3 underline decoration-emerald-200 decoration-2">Hợp đồng hoạt động</p>
                </div>

                <div className="premium-card p-10 border-2 hover:border-amber-500/20 group cursor-pointer transition-all active:scale-95">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shadow-sm border border-amber-100 group-hover:scale-110 transition-transform">
                            <AlertCircle size={28} />
                        </div>
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest italic">Sắp hết</span>
                    </div>
                    <h3 className="text-5xl font-black text-gray-950 tracking-tighter italic">
                        {warranties.filter(w => {
                            const daysLeft = Math.ceil((new Date(w.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            return daysLeft > 0 && daysLeft <= 30;
                        }).length}
                    </h3>
                    <p className="text-xs text-gray-500 font-black uppercase tracking-widest mt-3 underline decoration-amber-200 decoration-2">Hết hạn trong 30 ngày</p>
                </div>

                <div className="premium-card p-10 border-2 hover:border-gray-500/20 group cursor-pointer transition-all active:scale-95">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-gray-950 text-white rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
                            <Clock size={28} />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Lưu trữ</span>
                    </div>
                    <h3 className="text-5xl font-black text-gray-950 tracking-tighter italic">
                        {warranties.filter(w => isExpired(w.expirationDate) || w.status === 1).length}
                    </h3>
                    <p className="text-xs text-gray-500 font-black uppercase tracking-widest mt-3 underline decoration-gray-200 decoration-2">Hồ sơ đã hết bảo hành</p>
                </div>

                <div className="premium-card p-10 border-2 hover:border-blue-500/20 group cursor-pointer transition-all active:scale-95">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
                            <Package size={28} />
                        </div>
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest italic">Quy mô</span>
                    </div>
                    <h3 className="text-5xl font-black text-gray-950 tracking-tighter italic">{warranties.length}</h3>
                    <p className="text-xs text-gray-500 font-black uppercase tracking-widest mt-3 underline decoration-blue-200 decoration-2">Tổng sản phẩm đăng ký</p>
                </div>
            </div>

            {/* Warranties Table */}
            <div className="premium-card overflow-hidden border-2 bg-white mt-12">
                <div className="p-10 border-b-2 border-gray-50 bg-gray-50/30 flex justify-between items-center">
                    <h3 className="text-3xl font-black text-gray-950 uppercase italic tracking-tighter">Danh sách bảo hành</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900 text-white text-[11px] uppercase font-black tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Số Serial (S/N)</th>
                                <th className="px-8 py-5">Mã Sản phẩm</th>
                                <th className="px-8 py-5">Ngày kích hoạt</th>
                                <th className="px-8 py-5">Hạn bảo hành</th>
                                <th className="px-8 py-5">Thời gian</th>
                                <th className="px-8 py-5">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-gray-50">
                            {warranties.slice(0, 20).map((warranty) => (
                                <tr key={warranty.id} className="hover:bg-gray-50 transition-all group">
                                    <td className="px-8 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D70018] flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform">
                                                <Shield size={20} />
                                            </div>
                                            <span className="font-black text-gray-950 font-mono text-base tracking-tighter uppercase italic">{warranty.serialNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <span className="text-xs text-gray-500 font-black uppercase tracking-widest bg-white border border-gray-100 px-3 py-1 rounded-lg italic">{warranty.productId.substring(0, 12).toUpperCase()}...</span>
                                    </td>
                                    <td className="px-8 py-8">
                                        <div className="flex items-center gap-2 text-gray-950 text-sm font-black uppercase tracking-tight">
                                            <Calendar size={16} className="text-[#D70018]" />
                                            {new Date(warranty.purchaseDate).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <span className={`text-base font-black italic tracking-tighter ${isExpired(warranty.expirationDate) ? 'text-red-600 underline decoration-red-200 decoration-4' : 'text-gray-900'}`}>
                                            {new Date(warranty.expirationDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-8">
                                        <span className="text-xs text-gray-900 font-black uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 italic">{warranty.warrantyPeriodMonths} tháng</span>
                                    </td>
                                    <td className="px-8 py-8">
                                        {getStatusBadge(warranty.status)}
                                    </td>
                                </tr>
                            ))}
                            {warranties.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-24 text-center">
                                        <Shield className="mx-auto text-gray-100 mb-6" size={80} />
                                        <p className="text-sm text-gray-400 font-black uppercase italic tracking-widest text-center px-10">
                                            Chưa có thông tin bảo hành nào được ghi nhận trong cơ sở dữ liệu.
                                        </p>
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
