import client from './client';

/**
 * Promotion API — động cơ khuyến mãi Phase 04-B.
 * Endpoint: POST /api/promotions/evaluate | GET /api/promotions/available
 * Khi backend chưa sẵn sàng, các hàm ném lỗi — nơi gọi tự fallback về giá không giảm.
 */

export type PromotionDiscountType = 'Percent' | 'Fixed' | 'FreeShip' | 'BuyXGetY' | 'Tiered';

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
