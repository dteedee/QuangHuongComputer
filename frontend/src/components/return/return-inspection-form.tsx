import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import type { ReceivedCondition } from '../../api/sales';
import { inventoryApi } from '../../api/inventory';
import type { WarehouseDropdown, WarehouseType } from '../../api/inventory';
import { formatCurrency } from '../../utils/format';

interface Props {
    returnId: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface ConditionOption {
    value: ReceivedCondition;
    label: string;
    hint: string;
    suggestedWarehouse: WarehouseType;
    color: string;
}

const CONDITION_OPTIONS: ConditionOption[] = [
    {
        value: 'Intact',
        label: 'Nguyên vẹn, còn seal',
        hint: 'Nhập lại kho chính, bán lại giá gốc.',
        suggestedWarehouse: 'Main',
        color: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    },
    {
        value: 'UsedGood',
        label: 'Đã mở, còn tốt',
        hint: 'Nhập kho Returns, bán lại dạng "hàng trưng bày".',
        suggestedWarehouse: 'Returns',
        color: 'border-blue-300 bg-blue-50 text-blue-700',
    },
    {
        value: 'DefectiveTechnical',
        label: 'Lỗi kỹ thuật',
        hint: 'Nhập kho Defective, tạo RMA gửi hãng.',
        suggestedWarehouse: 'Defective',
        color: 'border-amber-300 bg-amber-50 text-amber-700',
    },
    {
        value: 'UserDamage',
        label: 'Hỏng do người dùng',
        hint: 'Kho Defective. Có thể từ chối hoàn hoặc trừ tiền.',
        suggestedWarehouse: 'Defective',
        color: 'border-red-300 bg-red-50 text-red-700',
    },
    {
        value: 'MissingAccessories',
        label: 'Thiếu phụ kiện',
        hint: 'Kho Returns, trừ tiền phụ kiện thiếu.',
        suggestedWarehouse: 'Returns',
        color: 'border-orange-300 bg-orange-50 text-orange-700',
    },
];

/**
 * Form kiểm hàng nhận về khi khách trả (Phase 07 - Bước 3).
 * Nhân viên chọn tình trạng -> kho tự gợi ý theo `ConditionOption.suggestedWarehouse`.
 */
export default function ReturnInspectionForm({ returnId, onSuccess, onCancel }: Props) {
    const [condition, setCondition] = useState<ReceivedCondition>('Intact');
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [restockingFee, setRestockingFee] = useState<number>(0);
    const [warehouses, setWarehouses] = useState<WarehouseDropdown[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const list = await inventoryApi.warehouses.getDropdown();
                setWarehouses(list);
            } catch {
                toast.error('Không tải được danh sách kho');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, []);

    const selectedCondition = useMemo(
        () => CONDITION_OPTIONS.find(o => o.value === condition) ?? CONDITION_OPTIONS[0],
        [condition]
    );

    // Auto-suggest warehouse khi đổi condition
    useEffect(() => {
        if (!warehouses.length) return;
        const match = warehouses.find(w => w.type === selectedCondition.suggestedWarehouse);
        if (match) setWarehouseId(match.id);
    }, [selectedCondition, warehouses]);

    const requiresFee = condition === 'MissingAccessories';

    const handleSubmit = async () => {
        if (!warehouseId) {
            toast.error('Chọn kho nhập');
            return;
        }
        if (requiresFee && (!restockingFee || restockingFee <= 0)) {
            toast.error('Nhập số tiền trừ phụ kiện');
            return;
        }
        setSubmitting(true);
        try {
            await salesApi.orders.returns.inspect(returnId, {
                condition,
                warehouseId,
                notes: notes.trim() || undefined,
                restockingFee: requiresFee ? restockingFee : undefined,
            });
            toast.success('Đã ghi nhận kiểm hàng và nhập kho');
            onSuccess?.();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi khi ghi nhận kiểm hàng');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <RefreshCw size={20} className="animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500 text-sm">Đang tải kho...</span>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                    Chọn đúng tình trạng — hệ thống tự gợi ý kho nhập. Sau khi xác nhận sẽ sinh GRN
                    loại <b>CustomerReturn</b> và cập nhật tồn kho tức thì.
                </div>
            </div>

            {/* Radio group condition */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Tình trạng hàng nhận</label>
                <div className="grid gap-2 md:grid-cols-2">
                    {CONDITION_OPTIONS.map(opt => {
                        const active = condition === opt.value;
                        return (
                            <label
                                key={opt.value}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    active
                                        ? `${opt.color} border-2 font-semibold`
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="condition"
                                    value={opt.value}
                                    checked={active}
                                    onChange={() => setCondition(opt.value)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="text-sm">{opt.label}</div>
                                    <div className="text-xs mt-0.5 opacity-80">{opt.hint}</div>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Warehouse */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Kho nhập
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                        (gợi ý theo tình trạng — có thể đổi thủ công)
                    </span>
                </label>
                <select
                    value={warehouseId}
                    onChange={e => setWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] focus:border-transparent outline-none"
                >
                    <option value="">-- Chọn kho --</option>
                    {warehouses.map(w => (
                        <option key={w.id} value={w.id}>
                            {w.code} — {w.name} ({w.type})
                            {w.type === selectedCondition.suggestedWarehouse ? ' — gợi ý' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Restocking fee (chỉ hiện khi MissingAccessories) */}
            {requiresFee && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Trừ tiền phụ kiện thiếu (VNĐ)
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={restockingFee}
                        onChange={e => setRestockingFee(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Sẽ trừ vào số tiền hoàn cho khách. Xem trước:{' '}
                        <span className="font-semibold">{formatCurrency(restockingFee || 0)}</span>
                    </p>
                </div>
            )}

            {/* Notes */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú kiểm hàng</label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Mô tả tình trạng máy chi tiết, phụ kiện thiếu, vết trầy..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--accent-primary,#e11d48)] outline-none resize-none"
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !warehouseId}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                    {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Xác nhận nhập kho
                </button>
            </div>
        </div>
    );
}
