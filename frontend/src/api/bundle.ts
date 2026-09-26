/**
 * Combo sản phẩm ("Combo tiết kiệm") — hợp đồng: `docs/api-contracts/catalog.md` §Combo.
 *
 * Mọi con số tiền do SERVER tính lại từ giá hiện hành (`BundleViewBuilder`); FE chỉ hiển thị.
 * Giá có thẩm quyền khi mua do Sales tính lại lúc đọc giỏ / chốt đơn (`BundleCartPricer`).
 */
import { client } from './client';

export type BundlePricingMode = 'fixed' | 'percent';

export interface BundleItemView {
    id: string;
    productId: string;
    productName: string;
    productSlug?: string | null;
    productImage?: string | null;
    productSku?: string | null;
    isMainItem: boolean;
    quantity: number;
    /** Giá lẻ HIỆN HÀNH của một đơn vị. */
    unitPrice: number;
    isPublished: boolean;
    inStock: boolean;
}

export interface BundleView {
    id: string;
    name: string;
    description: string;
    imageUrl?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    isActive: boolean;
    pricingMode: BundlePricingMode;
    discountPercent?: number | null;
    /** Giá cố định đã lưu (0 khi chế độ %). */
    fixedPrice: number;
    /** Tổng giá lẻ hiện hành của một bộ. */
    originalPrice: number;
    /** Giá một bộ combo. */
    bundlePrice: number;
    savings: number;
    isPurchasable: boolean;
    /** Tên cũ của `bundlePrice`. */
    totalPrice: number;
    items: BundleItemView[];
}

/** Đồng nghĩa giữ cho nơi gọi cũ. */
export type ProductBundle = BundleView;

export interface BundleItemWrite {
    productId: string;
    isMainItem: boolean;
    quantity: number;
}

export interface BundleWriteRequest {
    name: string;
    description?: string;
    /** Giá cố định một bộ — gửi 0 khi dùng `discountPercent`. */
    totalPrice: number;
    /** Server tự tính; luôn gửi 0. */
    originalPrice: number;
    imageUrl?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    items: BundleItemWrite[];
    discountPercent?: number | null;
    isActive?: boolean;
}

export const bundleApi = {
    /** Combo đang bán (bật, trong hạn, mọi món đã đăng web). */
    getActiveBundles: async (): Promise<BundleView[]> =>
        (await client.get<BundleView[]>('/catalog/bundles')).data,

    getBundleById: async (id: string): Promise<BundleView> =>
        (await client.get<BundleView>(`/catalog/bundles/${id}`)).data,

    /** "Combo tiết kiệm" trên trang sản phẩm. */
    getBundlesByProduct: async (productId: string): Promise<BundleView[]> =>
        (await client.get<BundleView[]>(`/catalog/bundles/product/${productId}`)).data,
};

export const bundleAdminApi = {
    list: async (): Promise<BundleView[]> =>
        (await client.get<BundleView[]>('/catalog/bundles/admin')).data,

    get: async (id: string): Promise<BundleView> =>
        (await client.get<BundleView>(`/catalog/bundles/admin/${id}`)).data,

    create: async (data: BundleWriteRequest): Promise<{ id: string }> =>
        (await client.post<{ id: string }>('/catalog/bundles', data)).data,

    update: async (id: string, data: BundleWriteRequest): Promise<{ id: string }> =>
        (await client.put<{ id: string }>(`/catalog/bundles/${id}`, data)).data,

    setActive: async (id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> =>
        (await client.patch<{ id: string; isActive: boolean }>(`/catalog/bundles/${id}/active`, { isActive })).data,

    remove: async (id: string): Promise<void> => {
        await client.delete(`/catalog/bundles/${id}`);
    },
};
