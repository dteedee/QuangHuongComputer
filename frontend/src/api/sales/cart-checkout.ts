/**
 * Sales — storefront CART + CHECKOUT surface (cart CRUD, stock-hold checkout
 * session, place order, guest checkout, shipping fee estimate). Split out of
 * the old flat `api/sales.ts` (W1-9, step 7c). Functions moved verbatim;
 * `api/sales.ts` re-exports them.
 */
import client from '../client';

export interface CheckoutDto {
    items: {
        productId: string;
        productName: string;
        unitPrice: number;
        quantity: number;
    }[];
    shippingAddress?: string;
    notes?: string;
    couponCode?: string;
    sourceId?: string;
    customerIp?: string;
    customerUserAgent?: string;
    paymentMethod?: string;
    isPickup?: boolean;
    pickupStoreId?: string;
    pickupStoreName?: string;
    customerId?: string;
    manualDiscount?: number;
    /** Phí vận chuyển. Backend: CheckoutDto.ShippingFee (decimal, mặc định 0). */
    shippingFee?: number;
    /** ID phiên giữ chỗ (giữ tồn 15 phút). Nếu có, backend đối chiếu và không giữ lại. */
    checkoutSessionId?: string;
}

export interface GuestCheckoutDto {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    items: {
        productId: string;
        productName: string;
        price: number;
        quantity: number;
    }[];
    couponCode?: string;
    notes?: string;
    paymentMethod?: string;
}

// Cart Types
export interface CartDto {
    id: string;
    customerId: string;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    shippingAmount: number;
    totalAmount: number;
    taxRate: number;
    couponCode?: string;
    items: CartItemDto[];
}

export interface CartItemDto {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    subtotal: number;
    imageUrl?: string;
    stockQuantity?: number;
    /** Tên biến thể (VD "16GB / 512GB / Đen"). Chỉ có khi sản phẩm có biến thể. */
    variantId?: string;
    variantName?: string;
}

// ============================================
// Checkout Session (giữ chỗ tồn kho 15 phút)
// Backend endpoints (Phase 04-B): POST /sales/checkout/session, POST /sales/checkout/session/{id}/extend
// ============================================
export interface CheckoutSession {
    id: string;
    cartId?: string;
    status: 'Active' | 'Expired' | 'Completed' | 'Cancelled';
    createdAt: string;
    expiresAt: string;
    reservationIds: string[];
}

export interface CreateCheckoutSessionDto {
    items: {
        productId: string;
        quantity: number;
        variantId?: string;
    }[];
    /** Mặc định 15 phút. Nếu backend cấu hình khác, cứ để trống. */
    holdMinutes?: number;
}

export const salesCartCheckoutApi = {
    cart: {
        get: async () => {
            const response = await client.get<CartDto>('/sales/cart');
            return response.data;
        },

        addItem: async (item: {
            productId: string;
            productName: string;
            price: number;
            quantity: number;
        }) => {
            const response = await client.post<{ message: string }>('/sales/cart/items', item);
            return response.data;
        },

        updateQuantity: async (productId: string, quantity: number) => {
            const response = await client.put<{ message: string }>(`/sales/cart/items/${productId}`, { quantity });
            return response.data;
        },

        removeItem: async (productId: string) => {
            const response = await client.delete<{ message: string }>(`/sales/cart/items/${productId}`);
            return response.data;
        },

        clear: async () => {
            const response = await client.delete<{ message: string }>('/sales/cart/clear');
            return response.data;
        },

        applyCoupon: async (couponCode: string) => {
            // Backend trả về { message, discountAmount, totalAmount } (SalesEndpoints.cs /cart/apply-coupon).
            const response = await client.post<{ message: string; discountAmount: number; totalAmount: number }>('/sales/cart/apply-coupon', { couponCode });
            return response.data;
        },

        removeCoupon: async () => {
            const response = await client.delete<{ message: string }>('/sales/cart/remove-coupon');
            return response.data;
        },

        setShipping: async (amount: number) => {
            const response = await client.post<{ message: string; totalAmount: number }>('/sales/cart/set-shipping', { shippingAmount: amount });
            return response.data;
        },
    },

    checkoutSession: {
        create: async (data: CreateCheckoutSessionDto): Promise<CheckoutSession> => {
            const response = await client.post<CheckoutSession>('/sales/checkout/session', data);
            return response.data;
        },
        extend: async (sessionId: string): Promise<CheckoutSession> => {
            const response = await client.post<CheckoutSession>(`/sales/checkout/session/${sessionId}/extend`);
            return response.data;
        },
        cancel: async (sessionId: string): Promise<{ message: string }> => {
            const response = await client.delete<{ message: string }>(`/sales/checkout/session/${sessionId}`);
            return response.data;
        },
    },

    orders: {
        create: async (data: CheckoutDto) => {
            // Luồng hợp nhất: gọi thẳng /sales/checkout (backend Phase 04-B đã gom fast-checkout vào đây).
            try {
                const response = await client.post<{ orderId: string; orderNumber: string; totalAmount: number; status: string }>('/sales/checkout', {
                    items: data.items,
                    shippingAddress: data.shippingAddress,
                    notes: data.notes,
                    sourceId: data.sourceId,
                    paymentMethod: data.paymentMethod,
                    couponCode: data.couponCode,
                    isPickup: data.isPickup,
                    pickupStoreId: data.pickupStoreId,
                    pickupStoreName: data.pickupStoreName,
                    customerId: data.customerId,
                    manualDiscount: data.manualDiscount,
                    shippingFee: data.shippingFee,
                    checkoutSessionId: data.checkoutSessionId,
                });
                return response.data;
            } catch (checkoutError: any) {
                const errorData = checkoutError.response?.data;
                const finalError = errorData?.error || errorData?.Error || errorData?.message || 'Không thể đặt hàng';
                throw new Error(finalError);
            }
        },

        guestCheckout: async (data: GuestCheckoutDto) => {
            const response = await client.post<{ orderId: string; orderNumber: string; totalAmount: number; status: string; message: string }>('/sales/public/guest-checkout', {
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                customerPhone: data.customerPhone,
                shippingAddress: data.shippingAddress,
                items: data.items,
                couponCode: data.couponCode,
                notes: data.notes,
                paymentMethod: data.paymentMethod,
            });
            return response.data;
        },
    },
};

// ============================================
// Shipping Fee API
// ============================================
export async function calculateShippingFee(
    toDistrictId: number,
    toWardCode: string,
    weight: number = 500
): Promise<{ fee: number; expectedDeliveryDays: string }> {
    const response = await client.post('/shipping/calculate-fee', { toDistrictId, toWardCode, weight });
    return response.data;
}
