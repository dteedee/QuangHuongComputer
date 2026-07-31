import { useEffect, useState } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { requisitionApi, formatCurrency } from '../../api/inventory';
import type {
    CreateRequisitionDto,
    UrgencyLevel,
    PurchaseRequisitionItemDto,
} from '../../api/inventory';
import { catalogApi } from '../../api/catalog';
import type { Product } from '../../api/catalog';

const URGENCY_META: Record<UrgencyLevel, { label: string; className: string }> = {
    Low: { label: 'Thấp', className: 'bg-gray-100 text-gray-700' },
    Normal: { label: 'Thường', className: 'bg-blue-100 text-blue-700' },
    High: { label: 'Cao', className: 'bg-orange-100 text-orange-700' },
    Urgent: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700' },
};

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

/**
 * Modal tạo đề nghị mua hàng. Chọn nhiều SP + số lượng + mức khẩn + lý do.
 */
export default function RequisitionCreateModal({ onClose, onCreated }: Props) {
    const [urgency, setUrgency] = useState<UrgencyLevel>('Normal');
    const [reason, setReason] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [productOptions, setProductOptions] = useState<Product[]>([]);
    const [selected, setSelected] = useState<PurchaseRequisitionItemDto[]>([]);
    const [saving, setSaving] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (!productSearch.trim()) { setProductOptions([]); return; }
            setLoadingProducts(true);
            try {
                const resp = await catalogApi.getProducts({ search: productSearch, pageSize: 20 });
                setProductOptions(resp.products || []);
            } catch {
                setProductOptions([]);
            } finally {
                setLoadingProducts(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [productSearch]);

    const addItem = (p: Product) => {
        if (selected.find(s => s.productId === p.id)) return;
        setSelected(prev => [
            ...prev,
            {
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                quantity: 1,
                estimatedPrice: p.costPrice ?? p.price,
            },
        ]);
    };

    const updateItem = (idx: number, patch: Partial<PurchaseRequisitionItemDto>) => {
        setSelected(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    };

    const removeItem = (idx: number) => {
        setSelected(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!selected.length) { toast.error('Chọn ít nhất 1 sản phẩm'); return; }
        setSaving(true);
        try {
            const dto: CreateRequisitionDto = { urgency, reason: reason || undefined, items: selected };
            await requisitionApi.create(dto);
            toast.success('Tạo đề nghị thành công');
            onCreated();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tạo đề nghị');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Tạo đề nghị mua hàng</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Mức khẩn</label>
                            <select
                                value={urgency}
                                onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                {(Object.keys(URGENCY_META) as UrgencyLevel[]).map(u => (
                                    <option key={u} value={u}>{URGENCY_META[u].label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Lý do</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Ví dụ: Bổ sung tồn kho iPhone 15 dịp Tết"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Chọn sản phẩm</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                                placeholder="Gõ tên hoặc SKU..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        {productSearch.length > 0 && (
                            <div className="mt-2 border border-gray-200 rounded-lg max-h-52 overflow-y-auto">
                                {loadingProducts ? (
                                    <div className="p-3 text-sm text-gray-500 flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Đang tìm...</div>
                                ) : !productOptions.length ? (
                                    <div className="p-3 text-sm text-gray-500">Không có kết quả</div>
                                ) : (
                                    productOptions.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => addItem(p)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                            <div className="text-xs text-gray-500">SKU: {p.sku} · Giá: {formatCurrency(p.price)}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {selected.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Sản phẩm</th>
                                        <th className="text-center px-3 py-2 font-semibold text-gray-600 w-24">SL</th>
                                        <th className="text-right px-3 py-2 font-semibold text-gray-600 w-32">Giá ước tính</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selected.map((it, idx) => (
                                        <tr key={it.productId} className="border-b border-gray-100">
                                            <td className="px-3 py-2">
                                                <div className="font-medium">{it.productName}</div>
                                                <div className="text-xs text-gray-500">{it.sku}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={it.quantity}
                                                    onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                                    className="w-full text-center px-2 py-1 border border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={it.estimatedPrice || 0}
                                                    onChange={e => updateItem(idx, { estimatedPrice: parseFloat(e.target.value) || 0 })}
                                                    className="w-full text-right px-2 py-1 border border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        Hủy
                    </button>
                    <button
                        onClick={() => void handleSubmit()}
                        disabled={saving || !selected.length}
                        className="px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? 'Đang lưu...' : 'Gửi đề nghị'}
                    </button>
                </div>
            </div>
        </div>
    );
}
