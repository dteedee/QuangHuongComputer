/**
 * Form combo — schema + chuyển đổi form ⇄ API. Kiểm tra ở đây chỉ là UX; server kiểm lại tất
 * cả (`BundleRequestRules`) và trả lỗi theo trường qua hợp đồng lỗi chung.
 */
import { z } from 'zod';
import type { BundleView, BundleWriteRequest } from '../../../api/bundle';

export const bundleItemSchema = z.object({
    productId: z.string().min(1),
    productName: z.string(),
    /** Giá lẻ hiện hành — chỉ để hiển thị tổng/tiết kiệm, không gửi lên server. */
    unitPrice: z.number(),
    imageUrl: z.string().optional(),
    quantity: z.number({ invalid_type_error: 'Nhập số lượng' }).int().min(1, 'Tối thiểu 1').max(20, 'Tối đa 20'),
    isMainItem: z.boolean(),
});

export const bundleEditorSchema = z.object({
    name: z.string().trim().min(1, 'Nhập tên combo').max(200, 'Tối đa 200 ký tự'),
    description: z.string().max(2000, 'Tối đa 2000 ký tự'),
    pricingMode: z.enum(['fixed', 'percent']),
    fixedPrice: z.number().optional(),
    discountPercent: z.number().optional(),
    validFrom: z.string(),
    validTo: z.string(),
    isActive: z.boolean(),
    imageUrl: z.string(),
    items: z.array(bundleItemSchema).min(1, 'Chọn ít nhất một sản phẩm').max(10, 'Tối đa 10 sản phẩm'),
}).superRefine((v, ctx) => {
    const units = v.items.reduce((s, i) => s + (i.quantity || 0), 0);
    if (v.items.length > 0 && units < 2) {
        ctx.addIssue({ code: 'custom', path: ['items'], message: 'Combo cần ít nhất 2 sản phẩm (hoặc 1 sản phẩm số lượng 2)' });
    }
    if (new Set(v.items.map(i => i.productId)).size !== v.items.length) {
        ctx.addIssue({ code: 'custom', path: ['items'], message: 'Mỗi sản phẩm chỉ xuất hiện một lần' });
    }
    const list = listTotal(v.items);
    if (v.pricingMode === 'fixed') {
        if (!v.fixedPrice || v.fixedPrice <= 0) {
            ctx.addIssue({ code: 'custom', path: ['fixedPrice'], message: 'Nhập giá combo' });
        } else if (list > 0 && v.fixedPrice >= list) {
            ctx.addIssue({ code: 'custom', path: ['fixedPrice'], message: 'Giá combo phải thấp hơn tổng giá lẻ' });
        }
    } else if (!v.discountPercent || v.discountPercent <= 0 || v.discountPercent >= 100) {
        ctx.addIssue({ code: 'custom', path: ['discountPercent'], message: 'Phần trăm giảm từ 0 đến dưới 100' });
    }
    if (v.validFrom && v.validTo && v.validTo < v.validFrom) {
        ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'Ngày kết thúc phải sau ngày bắt đầu' });
    }
});

export type BundleEditorValues = z.infer<typeof bundleEditorSchema>;
export type BundleItemValues = z.infer<typeof bundleItemSchema>;

export const BUNDLE_EDITOR_FIELDS = [
    'name', 'description', 'fixedPrice', 'discountPercent', 'validFrom', 'validTo', 'imageUrl', 'items',
] as const;

export const listTotal = (items: Pick<BundleItemValues, 'unitPrice' | 'quantity'>[]) =>
    items.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0);

/** Giá một bộ để HIỂN THỊ trong trình soạn — cùng công thức làm tròn đồng với server. */
export function previewBundlePrice(v: Pick<BundleEditorValues, 'pricingMode' | 'fixedPrice' | 'discountPercent' | 'items'>): number {
    const list = listTotal(v.items);
    if (list <= 0) return 0;
    const price = v.pricingMode === 'percent'
        ? list - Math.round((list * (v.discountPercent ?? 0)) / 100)
        : (v.fixedPrice ?? 0);
    return Math.min(Math.max(price, 0), list);
}

/** `yyyy-mm-dd` giờ Việt Nam ⇄ ISO UTC. Ngày kết thúc tính hết 23:59:59 của ngày đó. */
const VN = '+07:00';
export const dateToIso = (d: string, endOfDay: boolean) =>
    (d ? new Date(`${d}T${endOfDay ? '23:59:59' : '00:00:00'}${VN}`).toISOString() : null);
export const isoToDate = (iso?: string | null) => {
    if (!iso) return '';
    const utc = iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`;
    return new Date(new Date(utc).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
};

export function emptyBundleValues(): BundleEditorValues {
    return {
        name: '', description: '', pricingMode: 'fixed', fixedPrice: undefined, discountPercent: undefined,
        validFrom: '', validTo: '', isActive: true, imageUrl: '', items: [],
    };
}

export function bundleToFormValues(b: BundleView): BundleEditorValues {
    return {
        name: b.name,
        description: b.description ?? '',
        pricingMode: b.pricingMode,
        fixedPrice: b.pricingMode === 'fixed' ? b.fixedPrice : undefined,
        discountPercent: b.discountPercent ?? undefined,
        validFrom: isoToDate(b.validFrom),
        validTo: isoToDate(b.validTo),
        isActive: b.isActive,
        imageUrl: b.imageUrl ?? '',
        items: b.items.map(i => ({
            productId: i.productId, productName: i.productName, unitPrice: i.unitPrice,
            imageUrl: i.productImage ?? undefined, quantity: i.quantity, isMainItem: i.isMainItem,
        })),
    };
}

export function toBundleWriteRequest(v: BundleEditorValues): BundleWriteRequest {
    const percent = v.pricingMode === 'percent';
    return {
        name: v.name.trim(),
        description: v.description.trim(),
        totalPrice: percent ? 0 : Math.round(v.fixedPrice ?? 0),
        originalPrice: 0,
        discountPercent: percent ? v.discountPercent ?? null : null,
        imageUrl: v.imageUrl || null,
        validFrom: dateToIso(v.validFrom, false),
        validTo: dateToIso(v.validTo, true),
        isActive: v.isActive,
        items: v.items.map(i => ({ productId: i.productId, quantity: i.quantity, isMainItem: i.isMainItem })),
    };
}
