import client from '../client';
import type { PromotionDiscountType } from './types';

/**
 * Promotion API — động cơ khuyến mãi Phase 04-B (STOREFRONT surface: preview +
 * available list for checkout). Split out of the old flat `api/promotion.ts`
 * (W1-9, step 7c); moved verbatim. `api/promotion.ts` re-exports this file.
 * Endpoint: POST /api/promotions/evaluate | GET /api/promotions/available
 * Khi backend chưa sẵn sàng, các hàm ném lỗi — nơi gọi tự fallback về giá không giảm.
 */

export type { PromotionDiscountType };

export interface Promotion {
    id: string;
    code?: string;
    name: string;
    description?: string;
    discountType: PromotionDiscountType;
    discountValue: number;
    maxDiscountAmount?: number;
    isAutomatic: boolean;
    startAt: string;
    endAt: string;
}

export interface AppliedPromotion {
    id: string;
    code?: string;
    name: string;
    discountType: PromotionDiscountType;
    discountAmount: number;
    /** Áp cho dòng nào; null = toàn đơn */
    lineProductId?: string;
    isAutomatic: boolean;
}

export interface FreeGiftItem {
    productId: string;
    productName: string;
    quantity: number;
    imageUrl?: string;
}

export interface EvaluatePromotionRequest {
    items: {
        productId: string;
        variantId?: string;
        quantity: number;
        unitPrice: number;
    }[];
    /** Mã user nhập tay (nếu có). Tự động promotions luôn evaluate. */
    couponCode?: string;
    /** ID khách hàng (đã đăng nhập). Guest thì để trống. */
    customerId?: string;
    /** Phí vận chuyển gốc trước freeship. */
    shippingAmount?: number;
}

export interface EvaluatePromotionResponse {
    subtotal: number;
    discountTotal: number;
    /** Giảm phí ship (freeship). */
    shippingDiscount: number;
    /** Tổng sau khi trừ discount + shipping. Backend là nguồn sự thật. */
    finalTotal: number;
    appliedPromotions: AppliedPromotion[];
    freeGifts: FreeGiftItem[];
    /** Lỗi/cảnh báo nếu couponCode không dùng được. */
    warnings?: string[];
}

export const promotionApi = {
    /** Xem trước tác động của khuyến mãi lên giỏ hiện tại. Debounce 300ms ở nơi gọi. */
    evaluate: async (data: EvaluatePromotionRequest): Promise<EvaluatePromotionResponse> => {
        const response = await client.post<EvaluatePromotionResponse>('/promotions/evaluate', data);
        return response.data;
    },

    /** Danh sách promotion khách hàng hiện tại có thể dùng (đã lọc theo audience/thời gian). */
    getAvailable: async (): Promise<Promotion[]> => {
        const response = await client.get<Promotion[]>('/promotions/available');
        return response.data;
    },
};

/**
 * One row of `GET /api/promotions/available` as the server really sends it
 * (`PromotionEndpoints.cs`): running, manual-code promotions only. Note it has
 * NO `startAt` — unlike the older `Promotion` shape above.
 */
export interface AvailablePromotionCode {
    id: string;
    code: string;
    name: string;
    description: string | null;
    discountType: PromotionDiscountType | 'FixedPrice';
    discountValue: number;
    maxDiscountAmount: number | null;
    endAt: string | null;
    /** null = unlimited total usage. */
    usageRemaining: number | null;
}

export const promotionCodePublicApi = {
    /** Mã giảm giá đang chạy — trang `/khuyen-mai`. Anonymous; không truyền customerId. */
    getRunningCodes: async (): Promise<AvailablePromotionCode[]> => {
        const response = await client.get<AvailablePromotionCode[]>('/promotions/available');
        return Array.isArray(response.data) ? response.data : [];
    },
};

/* ------------------------------------------------------------------------ */
/* Storefront flash sales (W3-1)                                             */
/* ------------------------------------------------------------------------ */

/** One product's terms inside an active flash sale (content-promotions contract §1). */
export interface ActiveFlashSaleProduct {
    productId: string;
    variantId: string | null;
    flashPrice: number;
    quantityLimit: number | null;
    soldCount: number;
    remaining: number | null;
    isSoldOut: boolean;
}

/** `GET /api/content/promotions/active` — public, anonymous, FlashSale only. */
export interface ActiveFlashSale {
    id: string;
    name: string;
    description: string | null;
    /** ISO-8601 end of the sale window; drives the countdown. */
    endAt: string | null;
    products: ActiveFlashSaleProduct[];
}

export const flashSalePublicApi = {
    /**
     * The storefront flash-sale feed. Returns `[]` when nothing is running —
     * the homepage section then renders nothing at all (no fabricated deals).
     */
    getActive: async (): Promise<ActiveFlashSale[]> => {
        const response = await client.get<ActiveFlashSale[]>('/content/promotions/active');
        return Array.isArray(response.data) ? response.data : [];
    },
};
