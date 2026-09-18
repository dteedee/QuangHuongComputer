import type { FlashSale } from '../../api/content';
import type { Product } from '../../api/catalog';

/**
 * W0-12 (step 4) — thay thế fake flash sale (`products.slice(0, limit)` giá nguyên).
 * Chỉ hai hàm thuần, dùng chung bởi FlashDeal.tsx (CMS) và fallback-flash-strip.tsx (fallback).
 * Không tạo entity/BE mới — FlashSale.productIds/categoryIds/discountType đã có sẵn (Content service).
 */

/** JSON array of GUID string trong FlashSale.productIds/categoryIds. Trả [] nếu rỗng/parse lỗi. */
function parseIdArray(raw?: string): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

/** Lọc sản phẩm thuộc phạm vi áp dụng của flash sale (toàn bộ / theo SP / theo danh mục). */
export function productsInFlashSale(products: Product[], sale: FlashSale): Product[] {
    if (sale.applyToAllProducts) return products;
    const productIds = parseIdArray(sale.productIds);
    const categoryIds = parseIdArray(sale.categoryIds);
    if (productIds.length === 0 && categoryIds.length === 0) return [];
    return products.filter((p) => productIds.includes(p.id) || categoryIds.includes(p.categoryId));
}

/** Giá sau khi áp discountType/discountValue/maxDiscount của flash sale — số nguyên VND, không âm. */
export function applyFlashSaleDiscount(
    price: number,
    sale: Pick<FlashSale, 'discountType' | 'discountValue' | 'maxDiscount'>
): number {
    let discount = sale.discountType === 'Percentage'
        ? price * (sale.discountValue / 100)
        : sale.discountValue;
    if (sale.maxDiscount && sale.maxDiscount > 0) discount = Math.min(discount, sale.maxDiscount);
    discount = Math.max(0, Math.min(discount, price));
    return Math.round(price - discount);
}
