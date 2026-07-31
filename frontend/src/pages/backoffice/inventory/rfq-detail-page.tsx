import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import QuotationComparisonTable from '../../../components/inventory/quotation-comparison-table';
import QuotationEntryModal from '../../../components/inventory/quotation-entry-modal';
import { rfqApi } from '../../../api/inventory';
import type { QuotationComparison } from '../../../api/inventory';

/**
 * Trang chi tiết 1 RFQ:
 * - Bảng so sánh báo giá (component đã có).
 * - Nút "Nhập báo giá" mở modal nhập tay.
 * - Nút "Chọn NCC" trong bảng → award → tạo PO.
 */
export default function RfqDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [comparison, setComparison] = useState<QuotationComparison | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEntry, setShowEntry] = useState(false);
    const [awardingQid, setAwardingQid] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await rfqApi.getComparison(id);
            setComparison(data);
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tải so sánh báo giá');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { void load(); }, [load]);

    const handleAward = async (quotationId: string) => {
        if (!id) return;
        setAwardingQid(quotationId);
        try {
            const res = await rfqApi.award(id, quotationId);
            toast.success(`Đã chọn NCC và tạo PO ${res.poNumber}`);
            navigate('/backoffice/inventory/purchase-orders');
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi award RFQ');
        } finally {
            setAwardingQid(null);
        }
    };

    if (!id) return null;

    return (
        <div className="p-6 max-w-[1500px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/backoffice/rfq')}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft size={16} /> Quay lại danh sách RFQ
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => void load()}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
                    </button>
                    <button
                        onClick={() => setShowEntry(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90"
                    >
                        <Plus size={14} /> Nhập báo giá
                    </button>
                </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900">So sánh báo giá</h1>

            {loading || !comparison ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                    <RefreshCw size={22} className="animate-spin mr-2" /> Đang tải...
                </div>
            ) : (
                <QuotationComparisonTable
                    comparison={comparison}
                    onAward={handleAward}
                    isAwarding={awardingQid}
                />
            )}

            {showEntry && (
                <QuotationEntryModal
                    rfqId={id}
                    items={comparison?.items || []}
                    onClose={() => setShowEntry(false)}
                    onAdded={() => { setShowEntry(false); void load(); }}
                />
            )}
        </div>
    );
}
