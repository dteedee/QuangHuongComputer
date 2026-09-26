import { describe, it, expect } from 'vitest';
import {
    bundleEditorSchema, emptyBundleValues, previewBundlePrice, toBundleWriteRequest, type BundleEditorValues,
} from './bundle-editor-schema';

const items: BundleEditorValues['items'] = [
    { productId: 'p1', productName: 'Laptop', unitPrice: 20_000_000, quantity: 1, isMainItem: true },
    { productId: 'p2', productName: 'Chuột', unitPrice: 500_000, quantity: 1, isMainItem: false },
];
const base = (extra: Partial<BundleEditorValues>): BundleEditorValues => ({ ...emptyBundleValues(), name: 'Combo', items, ...extra });
const errorPaths = (v: BundleEditorValues) => {
    const r = bundleEditorSchema.safeParse(v);
    return r.success ? [] : r.error.issues.map(i => i.path.join('.'));
};

describe('bundle editor schema', () => {
    it('giá cố định: bắt buộc và phải thấp hơn tổng giá lẻ', () => {
        expect(errorPaths(base({ pricingMode: 'fixed' }))).toContain('fixedPrice');
        expect(errorPaths(base({ pricingMode: 'fixed', fixedPrice: 20_500_000 }))).toContain('fixedPrice');
        expect(errorPaths(base({ pricingMode: 'fixed', fixedPrice: 19_900_000 }))).toEqual([]);
    });

    it('chế độ %: bỏ qua giá cố định, % phải trong (0, 100)', () => {
        expect(errorPaths(base({ pricingMode: 'percent', fixedPrice: undefined }))).toEqual(['discountPercent']);
        expect(errorPaths(base({ pricingMode: 'percent', discountPercent: 100 }))).toEqual(['discountPercent']);
        expect(errorPaths(base({ pricingMode: 'percent', discountPercent: 10 }))).toEqual([]);
    });

    it('combo cần ít nhất 2 đơn vị và ngày kết thúc sau ngày bắt đầu', () => {
        expect(errorPaths(base({ fixedPrice: 1, items: [items[0]] }))).toContain('items');
        expect(errorPaths(base({ fixedPrice: 19_000_000, validFrom: '2026-10-10', validTo: '2026-10-01' }))).toContain('validTo');
    });

    it('payload chế độ %: totalPrice 0, gửi discountPercent, không gửi giá lẻ', () => {
        const dto = toBundleWriteRequest(base({ pricingMode: 'percent', discountPercent: 10, fixedPrice: 5, validFrom: '2026-10-01' }));
        expect(dto.totalPrice).toBe(0);
        expect(dto.discountPercent).toBe(10);
        expect(dto.originalPrice).toBe(0);
        expect(dto.items).toEqual([
            { productId: 'p1', quantity: 1, isMainItem: true },
            { productId: 'p2', quantity: 1, isMainItem: false },
        ]);
        expect(dto.validFrom).toBe('2026-09-30T17:00:00.000Z');
        expect(dto.validTo).toBeNull();
    });

    it('payload giá cố định: không gửi discountPercent', () => {
        const dto = toBundleWriteRequest(base({ pricingMode: 'fixed', fixedPrice: 19_900_000, discountPercent: 15 }));
        expect(dto.totalPrice).toBe(19_900_000);
        expect(dto.discountPercent).toBeNull();
    });

    it('xem trước giá combo làm tròn đồng như server', () => {
        expect(previewBundlePrice({ pricingMode: 'percent', discountPercent: 7, items })).toBe(20_500_000 - 1_435_000);
        expect(previewBundlePrice({ pricingMode: 'fixed', fixedPrice: 30_000_000, items })).toBe(20_500_000);
    });
});
