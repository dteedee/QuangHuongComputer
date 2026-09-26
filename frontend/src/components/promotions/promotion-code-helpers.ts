/**
 * Pure text helpers for a running promotion code (`GET /api/promotions/available`).
 * Every amount is VND, VAT-inclusive (D01) — the FE never computes a discount, it only
 * describes the rule the server will apply at checkout.
 */
import { formatDong } from '../ui';
import type { AvailablePromotionCode } from '../../api/promotions/public';

/** "Giảm 10% (tối đa 500.000₫)", "Giảm 200.000₫", "Miễn phí vận chuyển"… */
export function promotionDiscountLabel(
    promo: Pick<AvailablePromotionCode, 'discountType' | 'discountValue' | 'maxDiscountAmount'>,
): string {
    switch (promo.discountType) {
        case 'Percent': {
            const cap = promo.maxDiscountAmount ? ` (tối đa ${formatDong(promo.maxDiscountAmount)}₫)` : '';
            return `Giảm ${promo.discountValue}%${cap}`;
        }
        case 'Fixed':
            return `Giảm ${formatDong(promo.discountValue)}₫`;
        case 'FreeShip':
            return 'Miễn phí vận chuyển';
        case 'BuyXGetY':
            return 'Mua kèm có quà';
        case 'Tiered':
            return 'Giảm theo bậc giá trị đơn';
        default:
            return 'Ưu đãi';
    }
}

const endFormat = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
});

/** "HSD: 23:59 31/10/2026" in shop time, or null for an open-ended code. */
export function promotionEndLabel(endAt: string | null | undefined): string | null {
    if (!endAt) return null;
    const date = new Date(endAt);
    return Number.isNaN(date.getTime()) ? null : `HSD: ${endFormat.format(date)}`;
}
