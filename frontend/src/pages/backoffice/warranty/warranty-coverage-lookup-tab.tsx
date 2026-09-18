/**
 * Warranty coverage lookup + list tab — extracted from `WarrantyPortal.tsx`
 * (W3-15) to keep that file under the 200-LOC guideline.
 */
import { Search, CheckCircle, XCircle, Clock, AlertCircle, Package, Shield } from 'lucide-react';

const isExpired = (expirationDate: string) => new Date(expirationDate) < new Date();

const getStatusBadge = (status: number) => {
    switch (status) {
        case 0: return <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">Hiệu lực</span>;
        case 1: return <span className="px-4 py-1.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl text-xs font-semibold">Hết hạn</span>;
        case 2: return <span className="px-4 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">Đã hủy</span>;
        default: return <span className="px-4 py-1.5 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl text-xs font-semibold">N/A</span>;
    }
};

export interface WarrantyCoverageLookupTabProps {
    warranties: any[];
    loading: boolean;
    searchSerial: string;
    setSearchSerial: (v: string) => void;
    searchResult: any;
    onSearch: () => void;
}

export function WarrantyCoverageLookupTab({
    warranties, loading, searchSerial, setSearchSerial, searchResult, onSearch,
}: WarrantyCoverageLookupTabProps) {
    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Search className="text-accent" size={20} />
                    <h3 className="text-lg font-bold text-gray-900">Tra cứu bảo hành</h3>
                </div>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={searchSerial}
                        onChange={(e) => setSearchSerial(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        placeholder="Nhập số Serial..."
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-mono focus:border-accent focus:outline-none transition-colors"
                    />
                    <button
                        onClick={onSearch}
                        disabled={loading}
                        className="px-8 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                        Tra cứu
                    </button>
                </div>

                {searchResult && (
                    <div className="mt-6 p-6 bg-gray-50 rounded-xl">
                        {searchResult.error ? (
                            <div className="flex items-center gap-3 text-red-600">
                                <XCircle size={24} />
                                <span className="font-bold">{searchResult.error}</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Serial</p>
                                    <p className="font-mono font-bold text-gray-900">{searchResult.serialNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Trạng thái</p>
                                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${searchResult.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {searchResult.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Ngày hết hạn</p>
                                    <p className="font-bold text-gray-900">{new Date(searchResult.expirationDate).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Mã sản phẩm</p>
                                    <p className="font-mono text-xs text-gray-500">{searchResult.productId?.substring(0, 12)}...</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl w-fit mb-4"><CheckCircle className="w-6 h-6" /></div>
                    <h3 className="text-4xl font-semibold text-gray-900">
                        {warranties.filter(w => !isExpired(w.expirationDate) && w.status === 0).length}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Đang hiệu lực</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl w-fit mb-4"><AlertCircle className="w-6 h-6" /></div>
                    <h3 className="text-4xl font-semibold text-gray-900">
                        {warranties.filter(w => {
                            const daysLeft = Math.ceil((new Date(w.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            return daysLeft > 0 && daysLeft <= 30;
                        }).length}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Sắp hết hạn</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="p-3 bg-gray-100 text-gray-600 rounded-xl w-fit mb-4"><Clock className="w-6 h-6" /></div>
                    <h3 className="text-4xl font-semibold text-gray-900">
                        {warranties.filter(w => isExpired(w.expirationDate) || w.status === 1).length}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Đã hết hạn</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl w-fit mb-4"><Package className="w-6 h-6" /></div>
                    <h3 className="text-4xl font-semibold text-gray-900">{warranties.length}</h3>
                    <p className="text-sm text-gray-500 mt-1">Tổng số bảo hành</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Danh sách bảo hành</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="px-6 py-4 text-left">Serial</th>
                                <th className="px-6 py-4 text-left">Mã SP</th>
                                <th className="px-6 py-4 text-left">Ngày kích hoạt</th>
                                <th className="px-6 py-4 text-left">Hạn bảo hành</th>
                                <th className="px-6 py-4 text-left">Thời gian</th>
                                <th className="px-6 py-4 text-left">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Đang tải...</td></tr>
                            ) : warranties.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-500">Chưa có thông tin bảo hành nào</p>
                                    </td>
                                </tr>
                            ) : warranties.slice(0, 20).map((warranty) => (
                                <tr key={warranty.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-50 text-accent flex items-center justify-center">
                                                <Shield size={16} />
                                            </div>
                                            <span className="font-mono font-bold text-gray-900">{warranty.serialNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-gray-500 font-mono">{warranty.productId?.substring(0, 8)}...</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-900">{new Date(warranty.purchaseDate).toLocaleDateString('vi-VN')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-bold ${isExpired(warranty.expirationDate) ? 'text-red-600' : 'text-gray-900'}`}>
                                            {new Date(warranty.expirationDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-600">{warranty.warrantyPeriodMonths} tháng</span>
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(warranty.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

export default WarrantyCoverageLookupTab;
