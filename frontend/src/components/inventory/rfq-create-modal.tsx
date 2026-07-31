import { useEffect, useState } from 'react';
import { X, Search, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { rfqApi, requisitionApi } from '../../api/inventory';
import type { CreateRfqDto, RfqItemDto, PurchaseRequisition } from '../../api/inventory';
import { catalogApi } from '../../api/catalog';
import type { Product } from '../../api/catalog';

interface Props {
    onClose: () => void;
    onCreated: (rfqId: string) => void;
}

/**
 * Modal tạo RFQ:
 * - Chọn từ Requisition đã duyệt (auto-load items), hoặc
 * - Chọn SP tự do (search + add).
 */
export default function RfqCreateModal({ onClose, onCreated }: Props) {
    const [dueDate, setDueDate] = useState('');
    const [source, setSource] = useState<'requisition' | 'freeform'>('freeform');
    const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
    const [requisitionId, setRequisitionId] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [productOptions, setProductOptions] = useState<Product[]>([]);
    const [items, setItems] = useState<RfqItemDto[]>([]);
    const [saving, setSaving] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        if (source !== 'requisition') return;
        void (async () => {
            try {
                const list = await requisitionApi.getList('Approved');
                setRequisitions(list);
            } catch {
                setRequisitions([]);
            }
        })();
    }, [source]);

    useEffect(() => {
        if (source !== 'requisition' || !requisitionId) return;
        const r = requisitions.find(x => x.id === requisitionId);
        if (r?.items) {
            setItems(r.items.map(it => ({
                productId: it.productId,
                productName: it.productName,
                sku: it.sku,
                quantity: it.quantity,
            })));
        }
    }, [requisitionId, requisitions, source]);

    useEffect(() => {
        if (source !== 'freeform') return;
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
    }, [productSearch, source]);

    const addProduct = (p: Product) => {
        if (items.find(i => i.productId === p.id)) return;
        setItems(prev => [...prev, { productId: p.id, productName: p.name, sku: p.sku, quantity: 1 }]);
    };

    const updateQty = (idx: number, qty: number) => {
        setItems(prev => prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, qty) } : it)));
    };

    const remove = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (!items.length) { toast.error('Chọn ít nhất 1 sản phẩm'); return; }
        setSaving(true);
        try {
            const dto: CreateRfqDto = {
                dueDate: dueDate || undefined,
                requisitionId: source === 'requisition' ? requisitionId : undefined,
                items,
            };
            const rfq = await rfqApi.create(dto);
            toast.success(`Đã tạo RFQ ${rfq.number}`);
            onCreated(rfq.id);
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tạo RFQ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Tạo yêu cầu báo giá</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setSource('freeform'); setItems([]); setRequisitionId(''); }}
                            className={`flex-1 px-4 py-2 rounded-lg border text-sm font-semibold ${source === 'freeform' ? 'border-[var(--accent-primary,#e11d48)] bg-red-50 text-[var(--accent-primary,#e11d48)]' : 'border-gray-200 text-gray-600'}`}
                        >
                            Chọn sản phẩm tự do
                        </button>
                        <button
                            type="button"
                            onClick={() => { setSource('requisition'); setItems([]); }}
                            className={`flex-1 px-4 py-2 rounded-lg border text-sm font-semibold ${source === 'requisition' ? 'border-[var(--accent-primary,#e11d48)] bg-red-50 text-[var(--accent-primary,#e11d48)]' : 'border-gray-200 text-gray-600'}`}
                        >
                            Từ đề nghị đã duyệt
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Hạn báo giá</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        {source === 'requisition' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Đề nghị</label>
                                <select
                                    value={requisitionId}
                                    onChange={e => setRequisitionId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="">-- Chọn đề nghị --</option>
                                    {requisitions.map(r => (
                                        <option key={r.id} value={r.id}>{r.number} ({r.itemCount} SP)</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {source === 'freeform' && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Tìm sản phẩm</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    placeholder="Tên hoặc SKU..."
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            {productSearch.length > 0 && (
                                <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                                    {loadingProducts ? (
                                        <div className="p-3 text-sm text-gray-500 flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Đang tìm...</div>
                                    ) : !productOptions.length ? (
                                        <div className="p-3 text-sm text-gray-500">Không có kết quả</div>
                                    ) : (
                                        productOptions.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => addProduct(p)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                            >
                                                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                                <div className="text-xs text-gray-500">SKU: {p.sku}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {items.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Sản phẩm</th>
                                        <th className="text-center px-3 py-2 font-semibold text-gray-600 w-24">SL</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => (
                                        <tr key={it.productId} className="border-b border-gray-100">
                                            <td className="px-3 py-2">
                                                <div className="font-medium">{it.productName}</div>
                                                {it.sku && <div className="text-xs text-gray-500">{it.sku}</div>}
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={it.quantity}
                                                    onChange={e => updateQty(idx, parseInt(e.target.value) || 1)}
                                                    className="w-full text-center px-2 py-1 border border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button onClick={() => remove(idx)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
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
                        disabled={saving || !items.length}
                        className="px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? 'Đang tạo...' : 'Tạo RFQ'}
                    </button>
                </div>
            </div>
        </div>
    );
}
