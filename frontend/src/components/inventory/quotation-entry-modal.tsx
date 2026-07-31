import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { rfqApi, inventoryApi, paymentTermLabels } from '../../api/inventory';
import type {
    CreateQuotationDto,
    QuotationItemInput,
    QuotationComparisonRow,
    SupplierDropdownItem,
    PaymentTermType,
} from '../../api/inventory';

interface Props {
    rfqId: string;
    items: QuotationComparisonRow[];
    onClose: () => void;
    onAdded: () => void;
}

/**
 * Modal nhập báo giá tay cho 1 NCC (Giai đoạn 1: NCC VN hiếm có API).
 */
export default function QuotationEntryModal({ rfqId, items, onClose, onAdded }: Props) {
    const [suppliers, setSuppliers] = useState<SupplierDropdownItem[]>([]);
    const [supplierId, setSupplierId] = useState('');
    const [paymentTerm, setPaymentTerm] = useState<PaymentTermType>('NET30');
    const [deliveryDays, setDeliveryDays] = useState<number>(7);
    const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [priceNotes, setPriceNotes] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void (async () => {
            try {
                const list = await inventoryApi.getSuppliersDropdown();
                setSuppliers(list);
            } catch {
                toast.error('Lỗi tải NCC');
            }
        })();
    }, []);

    const handleSubmit = async () => {
        if (!supplierId) { toast.error('Chọn NCC'); return; }
        const quoteItems: QuotationItemInput[] = items
            .map(row => ({
                productId: row.productId,
                unitPrice: prices[row.productId] || 0,
                notes: priceNotes[row.productId] || undefined,
            }))
            .filter(x => x.unitPrice > 0);
        if (!quoteItems.length) { toast.error('Nhập ít nhất 1 giá'); return; }

        setSaving(true);
        try {
            const dto: CreateQuotationDto = {
                supplierId,
                paymentTerm,
                deliveryDays,
                warrantyMonths,
                validUntil: validUntil || undefined,
                notes: notes || undefined,
                items: quoteItems,
            };
            await rfqApi.addQuotation(rfqId, dto);
            toast.success('Đã lưu báo giá');
            onAdded();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi lưu báo giá');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Nhập báo giá</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Nhà cung cấp</label>
                            <select
                                value={supplierId}
                                onChange={e => setSupplierId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value="">-- Chọn NCC --</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Điều khoản thanh toán</label>
                            <select
                                value={paymentTerm}
                                onChange={e => setPaymentTerm(e.target.value as PaymentTermType)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                {(Object.keys(paymentTermLabels) as PaymentTermType[]).map(t => (
                                    <option key={t} value={t}>{paymentTermLabels[t]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Hạn báo giá đến</label>
                            <input
                                type="date"
                                value={validUntil}
                                onChange={e => setValidUntil(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Thời gian giao (ngày)</label>
                            <input
                                type="number"
                                min={0}
                                value={deliveryDays}
                                onChange={e => setDeliveryDays(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Bảo hành (tháng)</label>
                            <input
                                type="number"
                                min={0}
                                value={warrantyMonths}
                                onChange={e => setWarrantyMonths(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú chung</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Sản phẩm</th>
                                    <th className="text-center px-3 py-2 font-semibold text-gray-600 w-16">SL</th>
                                    <th className="text-right px-3 py-2 font-semibold text-gray-600 w-32">Đơn giá</th>
                                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(row => (
                                    <tr key={row.productId} className="border-b border-gray-100">
                                        <td className="px-3 py-2">
                                            <div className="font-medium">{row.productName}</div>
                                            {row.sku && <div className="text-xs text-gray-500">{row.sku}</div>}
                                        </td>
                                        <td className="px-3 py-2 text-center text-gray-700">{row.quantity}</td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min={0}
                                                value={prices[row.productId] || ''}
                                                onChange={e => setPrices(p => ({ ...p, [row.productId]: parseFloat(e.target.value) || 0 }))}
                                                className="w-full text-right px-2 py-1 border border-gray-300 rounded"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={priceNotes[row.productId] || ''}
                                                onChange={e => setPriceNotes(p => ({ ...p, [row.productId]: e.target.value }))}
                                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        Hủy
                    </button>
                    <button
                        onClick={() => void handleSubmit()}
                        disabled={saving}
                        className="px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? 'Đang lưu...' : 'Lưu báo giá'}
                    </button>
                </div>
            </div>
        </div>
    );
}
