import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, RefreshCw, Package, User, Calendar, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { salesApi } from '../../../api/sales';
import type { ReturnRequest } from '../../../api/sales';
import ReturnInspectionForm from '../../../components/return/return-inspection-form';
import { formatCurrency } from '../../../utils/format';

/**
 * Trang danh sách Return đã Approved cần kiểm hàng nhập kho.
 * Bấm chọn -> mở modal <ReturnInspectionForm />.
 */
export default function ReturnInspectionPage() {
    const [items, setItems] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [inspecting, setInspecting] = useState<ReturnRequest | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Lấy các return đã duyệt, chưa kiểm (backend đọc status=Approved)
            const res = await salesApi.orders.returns.adminGetList(1, 100, 'Approved');
            setItems(res.returns || []);
        } catch {
            toast.error('Không tải được danh sách kiểm hàng');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const handleSuccess = () => {
        setInspecting(null);
        void load();
    };

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <ClipboardCheck size={22} className="text-white" />
                        </div>
                        Kiểm hàng nhận về
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Nhân viên kiểm tình trạng hàng khách trả, chọn kho nhập phù hợp.
                    </p>
                </div>
                <button
                    onClick={() => void load()}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        Không có yêu cầu chờ kiểm hàng.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {items.map(r => (
                            <div
                                key={r.id}
                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => setInspecting(r)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Package className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900">
                                                #{r.orderNumber || r.orderId?.slice(0, 8)}
                                            </span>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                                                {r.type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">
                                            {r.productName || 'Sản phẩm'} · SL {r.quantity ?? 1}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar size={12} />
                                                {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString('vi-VN') : ''}
                                            </span>
                                            {r.processedBy && (
                                                <span className="inline-flex items-center gap-1">
                                                    <User size={12} />
                                                    {r.processedBy}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {r.refundAmount > 0 && (
                                        <div className="text-right">
                                            <p className="font-bold text-[var(--accent-primary,#e11d48)]">
                                                {formatCurrency(r.refundAmount)}
                                            </p>
                                            <p className="text-xs text-gray-500">Hoàn dự kiến</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Inspection Form */}
            {inspecting && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Kiểm hàng nhận về</h2>
                                <p className="text-xs text-gray-500">
                                    Đơn #{inspecting.orderNumber || inspecting.orderId?.slice(0, 8)}
                                </p>
                            </div>
                            <button onClick={() => setInspecting(null)} className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <ReturnInspectionForm
                                returnId={inspecting.id}
                                onSuccess={handleSuccess}
                                onCancel={() => setInspecting(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
