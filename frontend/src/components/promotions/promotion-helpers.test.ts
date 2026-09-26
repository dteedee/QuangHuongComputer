import { describe, it, expect } from 'vitest';
import { formatCountdown, remainingParts } from './use-countdown';
import { promotionDiscountLabel, promotionEndLabel } from './promotion-code-helpers';
import { flashRowsWithPrice } from '../flash-sale/use-flash-sale-tiles';
import type { ActiveFlashSale } from '../../api/promotions/public';

describe('countdown', () => {
    const now = Date.parse('2026-10-01T00:00:00Z');

    it('tách ngày/giờ/phút/giây; hết giờ -> null', () => {
        expect(remainingParts('2026-10-02T01:02:03Z', now)).toEqual({ days: 1, hours: 1, minutes: 2, seconds: 3 });
        expect(remainingParts('2026-09-30T23:59:59Z', now)).toBeNull();
        expect(remainingParts('không-phải-ngày', now)).toBeNull();
    });

    it('định dạng chữ: có ngày thì ghi "x ngày", không thì chỉ đồng hồ', () => {
        expect(formatCountdown({ days: 2, hours: 3, minutes: 4, seconds: 5 })).toBe('2 ngày 03:04:05');
        expect(formatCountdown({ days: 0, hours: 0, minutes: 9, seconds: 0 })).toBe('00:09:00');
    });
});

describe('promotion code helpers', () => {
    it('mô tả đúng luật giảm, % luôn kèm trần giảm', () => {
        expect(promotionDiscountLabel({ discountType: 'Percent', discountValue: 10, maxDiscountAmount: 500000 })).toBe(
            'Giảm 10% (tối đa 500.000₫)',
        );
        expect(promotionDiscountLabel({ discountType: 'Fixed', discountValue: 200000, maxDiscountAmount: null })).toBe('Giảm 200.000₫');
        expect(promotionDiscountLabel({ discountType: 'FreeShip', discountValue: 0, maxDiscountAmount: null })).toBe(
            'Miễn phí vận chuyển',
        );
    });

    it('hạn dùng theo giờ Việt Nam; mã không hạn -> null', () => {
        expect(promotionEndLabel('2026-10-31T16:59:00Z')).toBe('HSD: 23:59 31/10/2026');
        expect(promotionEndLabel(null)).toBeNull();
    });
});

describe('flashRowsWithPrice', () => {
    it('bỏ dòng không có giá flash thật (null/0) — không in "0 ₫" hay "-100%" giả', () => {
        const sale = {
            id: 's',
            name: 'Giờ vàng',
            description: null,
            endAt: null,
            products: [
                { productId: 'a', variantId: null, flashPrice: 1000000, quantityLimit: 5, soldCount: 1, remaining: 4, isSoldOut: false },
                { productId: 'b', variantId: null, flashPrice: 0, quantityLimit: null, soldCount: 0, remaining: null, isSoldOut: false },
                { productId: 'c', variantId: null, flashPrice: null as unknown as number, quantityLimit: null, soldCount: 0, remaining: null, isSoldOut: false },
            ],
        } satisfies ActiveFlashSale;
        expect(flashRowsWithPrice(sale).map((r) => r.productId)).toEqual(['a']);
        expect(flashRowsWithPrice(undefined)).toEqual([]);
    });
});
