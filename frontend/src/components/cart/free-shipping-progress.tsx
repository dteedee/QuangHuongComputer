import { Truck } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { useSystemConfig } from '../../context/SystemConfigContext';

interface FreeShippingProgressProps {
    /** Giá trị đơn hàng hiện tại (đã trừ giảm giá) dùng để tính tiến độ. */
    amount: number;
    /** Override ngưỡng miễn phí ship; mặc định đọc FREESHIP_THRESHOLD từ config public. */
    threshold?: number;
    className?: string;
}

/**
 * Thanh tiến độ "mua thêm X để miễn phí ship" — dùng chung ở CartDrawer & CartPage.
 * Ngưỡng đọc từ config public FREESHIP_THRESHOLD (admin sửa trong ConfigPortal), fallback 500K.
 */
export function FreeShippingProgress({ amount, threshold, className }: FreeShippingProgressProps) {
    const { getNumber } = useSystemConfig();
    const effectiveThreshold = threshold ?? getNumber('FREESHIP_THRESHOLD', 500000);
    const progress = Math.min((amount / effectiveThreshold) * 100, 100);
    const remaining = Math.max(0, effectiveThreshold - amount);
    const reached = progress >= 100;

    return (
        <div className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-fade-in ${className ?? ''}`}>
            <div className="flex items-center gap-2 mb-2">
                <Truck className={reached ? 'text-emerald-500' : 'text-accent'} size={18} />
                <span className="text-sm font-bold text-gray-800">
                    {reached ? (
                        <span className="text-emerald-600">Tuyệt vời! Đơn hàng được miễn phí giao hàng</span>
                    ) : (
                        <span>Mua thêm <span className="text-accent">{formatCurrency(remaining)}</span> để miễn phí giao hàng</span>
                    )}
                </span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-700 ease-out rounded-full ${reached ? 'bg-emerald-500' : 'bg-accent'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

export default FreeShippingProgress;
