import { RefreshCw, RotateCcw, Wallet } from 'lucide-react';
import type { ReturnType } from '../../api/sales';

/**
 * 3 card lớn: Refund / Exchange / Replace.
 * Card bị `disabled` khi không đủ điều kiện (ví dụ: Replace chỉ áp cho hàng lỗi trong
 * DaysForDefectReplace) — vẫn hiển thị nhưng mờ và không click được.
 */

export interface ReturnTypeOption {
    value: ReturnType;
    disabled?: boolean;
    /** Lý do disable — hiển thị ngay dưới tiêu đề khi card bị vô hiệu. */
    disabledReason?: string;
}

interface ReturnTypeSelectorProps {
    value: ReturnType | null;
    onChange: (value: ReturnType) => void;
    options: ReturnTypeOption[];
}

const META: Record<ReturnType, { label: string; description: string; icon: JSX.Element; accent: string }> = {
    Refund: {
        label: 'Hoàn tiền',
        description: 'Trả lại sản phẩm và nhận hoàn tiền theo phương thức thanh toán gốc.',
        icon: <Wallet className="w-5 h-5" />,
        accent: 'text-emerald-600 bg-emerald-50',
    },
    Exchange: {
        label: 'Đổi sản phẩm khác',
        description: 'Đổi sang sản phẩm khác cùng tầm giá hoặc bù/hoàn chênh lệch.',
        icon: <RefreshCw className="w-5 h-5" />,
        accent: 'text-blue-600 bg-blue-50',
    },
    Replace: {
        label: 'Đổi 1-1 cùng loại',
        description: 'Chỉ áp cho hàng lỗi trong hạn — đổi lấy sản phẩm giống hệt.',
        icon: <RotateCcw className="w-5 h-5" />,
        accent: 'text-amber-600 bg-amber-50',
    },
};

export const ReturnTypeSelector = ({ value, onChange, options }: ReturnTypeSelectorProps) => (
    <div className="grid gap-3 md:grid-cols-3">
        {options.map((opt) => {
            const meta = META[opt.value];
            const selected = value === opt.value;
            const disabled = opt.disabled ?? false;

            return (
                <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onChange(opt.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                        disabled
                            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                            : selected
                              ? 'border-accent bg-red-50/40 shadow-sm cursor-pointer'
                              : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                    }`}
                    aria-pressed={selected}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${meta.accent}`}>
                        {meta.icon}
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-1">{meta.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        {disabled && opt.disabledReason ? opt.disabledReason : meta.description}
                    </p>
                </button>
            );
        })}
    </div>
);

export default ReturnTypeSelector;
