import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { CreateLandedCostDto, LandedCostType, AllocationMethod } from '../../api/inventory';

interface Props {
    onSubmit: (dto: CreateLandedCostDto) => Promise<void>;
    disabled?: boolean;
}

const TYPE_OPTIONS: { value: LandedCostType; label: string }[] = [
    { value: 'Shipping', label: 'Vận chuyển' },
    { value: 'ImportTax', label: 'Thuế nhập khẩu' },
    { value: 'CustomsFee', label: 'Phí hải quan' },
    { value: 'Insurance', label: 'Bảo hiểm' },
    { value: 'Other', label: 'Khác' },
];

const METHOD_OPTIONS: { value: AllocationMethod; label: string }[] = [
    { value: 'ByValue', label: 'Theo giá trị' },
    { value: 'ByWeight', label: 'Theo khối lượng' },
    { value: 'ByQuantity', label: 'Theo số lượng' },
];

/**
 * Form thêm 1 chi phí nhập cho GRN.
 * Chọn loại (Shipping/ImportTax/...), nhập mô tả + số tiền + phương pháp phân bổ.
 */
export default function LandedCostForm({ onSubmit, disabled }: Props) {
    const [type, setType] = useState<LandedCostType>('Shipping');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [method, setMethod] = useState<AllocationMethod>('ByValue');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            toast.error('Số tiền phải lớn hơn 0');
            return;
        }
        setSaving(true);
        try {
            await onSubmit({ type, description: description || undefined, amount, allocationMethod: method });
            setAmount(0);
            setDescription('');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Loại chi phí</label>
                <select
                    value={type}
                    onChange={e => setType(e.target.value as LandedCostType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                    {TYPE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mô tả</label>
                <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ví dụ: Ship Cty Vietnam Post - vận đơn VNP123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Số tiền (đ)</label>
                <input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right"
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phân bổ</label>
                <div className="flex gap-2">
                    <select
                        value={method}
                        onChange={e => setMethod(e.target.value as AllocationMethod)}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                        {METHOD_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        disabled={disabled || saving}
                        className="px-3 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                    >
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                </div>
            </div>
        </form>
    );
}
