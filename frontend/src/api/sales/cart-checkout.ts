/**
 * Sales — storefront CART + CHECKOUT surface.
 *
 * Hợp đồng nguồn: `docs/api-contracts/sales-checkout-orders.md` (W2-3) và
 * `docs/api-contracts/shipping.md` (W2-11). Hai luật xuyên suốt:
 *   1. Giá đã BAO GỒM VAT (D01) — FE KHÔNG tự tính thuế, đọc `vatBreakdown`.
 *   2. Client KHÔNG quyết định tiền — không gửi price/discount/shippingFee/customerId.
 */
import client from '../client';

/** Cookie giỏ vãng lai `qh_aid` là HttpOnly ⇒ request phải đi kèm credentials. */
const guestCfg = { withCredentials: true } as const;

// ============================================
// Cart
// ============================================
export interface VatBucketDto {
    rate: number;
    net: number;
    vat: number;
}

export interface CartItemDto {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    subtotal: number;
    imageUrl?: string;
    stockQuantity?: number;
    variantId?: string;
    variantName?: string;
    variantSku?: string;
}

export interface CartDto {
    id: string;
    customerId: string;
    subtotalAmount: number;
    discountAmount: number;
    /** VAT đã TÁCH RA — đã nằm trong totalAmount, không bao giờ cộng thêm (D01). */
    taxAmount: number;
    shippingAmount: number;
    totalAmount: number;
    /** Chỉ là NHÃN; nhiều thuế suất trong giỏ ⇒ đọc `vatBreakdown` thay vì hiển thị % này. */
    taxRate: number;
    couponCode?: string;
    items: CartItemDto[];
    vatBreakdown?: VatBucketDto[];
}

export interface GuestCartLineDto {
    productId: string;
    variantId?: string;
    productName: string;
    price: number;
    quantity: number;
    isGift: boolean;
}

export interface GuestCartDto {
    cartId: string | null;
    items: GuestCartLineDto[];
    subtotalAmount: number;
}

// ============================================
// Checkout session (nơi DUY NHẤT giữ tồn kho — 15 phút, gia hạn 1 lần)
// ============================================
export interface CheckoutSessionDto {
    sessionId: string;
    expiresAt: string;
    holdMinutes: number;
}

// ============================================
// Chốt đơn
// ============================================
export interface CheckoutShippingInfo {
    recipientName: string;
    phone: string;
    streetAddress?: string;
    ward?: string;
    district?: string;
    province?: string;
    /** Server tính lại cho kênh Web/Guest; gửi 0 và đọc lại từ response. */
    shippingFee: number;
    isPickup?: boolean;
    pickupStoreId?: string;
    pickupStoreName?: string;
    notes?: string;
}

export interface OrchestrateCheckoutDto {
    cartId: string;
    shipping: CheckoutShippingInfo;
    paymentMethod?: string;
    promotionCodes?: string[];
    /** Khoá chống đặt trùng: phiên giữ chỗ đã tạo ở bước 3. */
    checkoutSessionId?: string;
    guestEmail?: string;
    guestPhone?: string;
}

export interface GuestCheckoutDto {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    items: { productId: string; productName: string; price: number; quantity: number }[];
    couponCode?: string;
    notes?: string;
    paymentMethod?: string;
}

export interface CheckoutResultDto {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    taxAmount?: number;
    orderStatus?: string;
    requiresPaymentGateway?: boolean;
}

// ============================================
// Shipping (W2-11)
// ============================================
export interface ShippingQuoteDto {
    fee: number;
    isFreeShipping: boolean;
    source: 'pickup' | 'free_threshold' | 'flat' | 'ghn_live';
    estimatedDeliveryDays: string | null;
}

export interface ProvinceDto { code: string; name: string }
export interface WardDto { code: string; name: string; provinceCode: string }

export const salesCartCheckoutApi = {
    cart: {
        get: async () => (await client.get<CartDto>('/sales/cart')).data,

        /** KHÔNG gửi price/productName — server đọc giá thật từ CSDL (W0-4). */
        addItem: async (item: { productId: string; variantId?: string; quantity: number }) =>
            (await client.post<{ message: string }>('/sales/cart/items', item)).data,

        updateQuantity: async (productId: string, quantity: number) =>
            (await client.put<{ message: string }>(`/sales/cart/items/${productId}`, { quantity })).data,

        removeItem: async (productId: string) =>
            (await client.delete<{ message: string }>(`/sales/cart/items/${productId}`)).data,

        clear: async () => (await client.delete<{ message: string }>('/sales/cart/clear')).data,

        applyCoupon: async (couponCode: string) =>
            (await client.post<{ message: string; discountAmount: number; totalAmount: number }>(
                '/sales/cart/apply-coupon', { couponCode })).data,

        removeCoupon: async () => (await client.delete<{ message: string }>('/sales/cart/remove-coupon')).data,

        /** Gộp giỏ vãng lai (cookie `qh_aid`) vào tài khoản + gắn đơn đã đặt lúc còn vãng lai. */
        merge: async () =>
            (await client.post<{ merged: boolean; cartId?: string; linkedOrders?: number; reason?: string }>(
                '/sales/cart/merge', {}, guestCfg)).data,
    },

    publicCart: {
        get: async () => (await client.get<GuestCartDto>('/sales/public/cart', guestCfg)).data,
        addItem: async (item: { productId: string; productName: string; variantId?: string; quantity: number }) =>
            (await client.post<{ id: string; itemCount: number }>('/sales/public/cart/items', item, guestCfg)).data,
    },

    checkoutSession: {
        create: async (cartId: string) =>
            (await client.post<CheckoutSessionDto>('/sales/checkout/session', { cartId })).data,
        get: async (sessionId: string) =>
            (await client.get<CheckoutSessionDto>(`/sales/checkout/session/${sessionId}`)).data,
        extend: async (sessionId: string) =>
            (await client.post<CheckoutSessionDto>(`/sales/checkout/session/${sessionId}/extend`)).data,
        cancel: async (sessionId: string) =>
            (await client.post<{ message: string }>(`/sales/checkout/session/${sessionId}/cancel`)).data,
    },

    orders: {
        /**
         * Kênh Web. Dùng `/checkout/orchestrate` chứ KHÔNG phải `/checkout`: chỉ đường này
         * nhận `checkoutSessionId` (giữ chỗ tồn kho + chống đặt trùng) và lấy dòng hàng từ
         * giỏ trên server thay vì từ body của client.
         */
        create: async (data: OrchestrateCheckoutDto) =>
            (await client.post<CheckoutResultDto>('/sales/checkout/orchestrate', data)).data,

        guestCheckout: async (data: GuestCheckoutDto) =>
            (await client.post<CheckoutResultDto>('/sales/public/guest-checkout', data, guestCfg)).data,
    },

    shipping: {
        /** Phí ship do SERVER tính từ tạm tính sau giảm giá. Client không bao giờ gửi phí. */
        quote: async (req: {
            netSubtotal: number; isPickup?: boolean;
            provinceCode?: string; wardCode?: string; weightGrams?: number;
        }) => (await client.post<ShippingQuoteDto>('/sales/shipping/quote', req)).data,

        provinces: async () =>
            (await client.get<{ version: string; provinces: ProvinceDto[] }>('/sales/shipping/provinces')).data,

        wards: async (provinceCode: string) =>
            (await client.get<{ version: string; provinceCode: string; wards: WardDto[] }>(
                `/sales/shipping/provinces/${provinceCode}/wards`)).data,
    },
};
