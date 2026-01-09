import { useState, useEffect } from 'react';
import { Shield, Search, CheckCircle, XCircle, Clock, AlertCircle, Package, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../../api/client';

interface Warranty {
    id: string;
    productId: string;
    serialNumber: string;
    customerId: string;
    purchaseDate: string;
    expirationDate: string;
    warrantyPeriodMonths: number;
    status: number;
    notes: string | null;
}

interface WarrantyClaim {
    id: string;
    customerId: string;
    serialNumber: string;
    issueDescription: string;
    status: number;
    createdAt: string;
}

export const WarrantyPortal = () => {
    const [warranties, setWarranties] = useState<Warranty[]>([]);
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
            setSearchResult({ error: 'Serial number not found' });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: // Active
                return <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">Đang hiệu lực</span>;
            case 1: // Expired
                return <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-black uppercase">Hết hạn</span>;
            case 2: // Voided
                return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black uppercase">Đã hủy bỏ</span>;
            default:
                return <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-black uppercase">Không xác định</span>;
        }
    };

    const isExpired = (expirationDate: string) => new Date(expirationDate) < new Date();

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Bảo hành</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                        Theo dõi và xử lý bảo hành sản phẩm
                    </p>
                </div>
            </div>

            {/* Search Box */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card p-8"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Search className="text-[#D70018]" size={20} />
                    <h3 className="text-xl font-black text-gray-900 uppercase italic">Tra cứu bảo hành</h3>
                </div>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={searchSerial}
                        onChange={(e) => setSearchSerial(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Nhập số Serial (VD: SN-A1B2C3D4)"
                        className="flex-1 px-6 py-4 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:border-[#D70018] focus:outline-none transition-all"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 disabled:opacity-50"
                    >
                        {loading ? 'Đang tìm...' : 'Tra cứu'}
                    </button>
                </div>

                {searchResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-6 bg-gray-50 rounded-2xl"
                    >
                        {searchResult.error ? (
                            <div className="flex items-center gap-3 text-red-600">
                                <XCircle size={24} />
                                <span className="font-bold">{searchResult.error}</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Serial Number</p>
                                    <p className="font-black text-gray-900">{searchResult.serialNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Trạng thái</p>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${searchResult.isValid ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {searchResult.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Hết hạn</p>
                                    <p className="font-black text-gray-900">{new Date(searchResult.expirationDate).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Product ID</p>
                                    <p className="font-mono text-xs text-gray-600">{searchResult.productId.substring(0, 8)}...</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                            <CheckCircle size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Còn hạn</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                        {warranties.filter(w => !isExpired(w.expirationDate) && w.status === 0).length}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Bảo hành đang hoạt động</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <AlertCircle size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Sắp hết</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                        {warranties.filter(w => {
                            const daysLeft = Math.ceil((new Date(w.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            return daysLeft > 0 && daysLeft <= 30;
                        }).length}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Hết hạn trong 30 ngày</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gray-50 text-gray-600 rounded-2xl">
                            <Clock size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Hết hạn</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                        {warranties.filter(w => isExpired(w.expirationDate) || w.status === 1).length}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Không còn bảo hành</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Package size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tổng số</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{warranties.length}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Sản phẩm đã đăng ký</p>
                </motion.div>
            </div>

            {/* Warranties Table */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card overflow-hidden"
            >
                <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic">Danh sách bảo hành</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Serial Number</th>
                                <th className="px-8 py-5">Product ID</th>
                                <th className="px-8 py-5">Ngày mua</th>
                                <th className="px-8 py-5">Hết hạn</th>
                                <th className="px-8 py-5">Thời hạn</th>
                                <th className="px-8 py-5">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {warranties.slice(0, 20).map((warranty) => (
                                <tr key={warranty.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <Shield className="text-[#D70018]" size={18} />
                                            <span className="font-black text-gray-900 font-mono">{warranty.serialNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs text-gray-600 font-mono">{warranty.productId.substring(0, 8)}...</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-600 text-xs font-bold">
                                            <Calendar size={14} />
                                            {new Date(warranty.purchaseDate).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-xs font-bold ${isExpired(warranty.expirationDate) ? 'text-red-600' : 'text-gray-900'}`}>
                                            {new Date(warranty.expirationDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs text-gray-600 font-bold">{warranty.warrantyPeriodMonths} tháng</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        {getStatusBadge(warranty.status)}
                                    </td>
                                </tr>
                            ))}
                            {warranties.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <Shield className="mx-auto text-gray-100 mb-4" size={60} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">
                                            Chưa có bảo hành nào được đăng ký.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};
