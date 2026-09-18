/**
 * Sales — customer ACCOUNT surface ("my orders", stats, verify-purchase,
 * customer-side return requests, loyalty points). Split out of the old flat
 * `api/sales.ts` (W1-9, step 7c). Functions moved verbatim; `api/sales.ts`
 * re-exports them.
 */
import client from '../client';
import type {
    CreateReturnRequestDto,
    Order,
    OrderHistory,
    ReturnPolicy,
    ReturnRequest,
    ReturnRequestDetail,
} from './types';

// Loyalty Types
export interface LoyaltyAccount {
    id: string;
    userId: string;
    totalPoints: number;
    availablePoints: number;
    lifetimePoints: number;
    tier: LoyaltyTier;
    tierName: string;
    pointsMultiplier: number;
    lastActivityAt?: string;
    tierExpiresAt?: string;
    createdAt: string;
    nextTier?: {
        nextTier: string;
        pointsNeeded: number;
    };
}

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface LoyaltyTransaction {
    id: string;
    accountId: string;
    type: LoyaltyTransactionType;
    typeName: string;
    points: number;
    description: string;
    orderId?: string;
    referenceCode?: string;
    balanceAfter: number;
    createdAt: string;
}

export type LoyaltyTransactionType = 'Earn' | 'Redeem' | 'Expired' | 'Adjustment' | 'Refund' | 'Bonus' | 'Referral';

/**
 * `GET /api/sales/public/orders/track` response (docs/api-contracts/sales-checkout-orders.md
 * "Tra cứu đơn của khách vãng lai"). Anonymous — no email, no internal notes, no promo code.
 * Lives here (not a separate file) because this track has no other owned `api/` home for a
 * guest-facing sales call; kept clearly separate from the authenticated `getMyOrders`/`getMyOrder`.
 */
export interface GuestOrderTrackingResult {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    orderDate: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
    subtotalAmount: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    totalAmount: number;
    shippingAddress?: string;
    customerName?: string;
    deliveryTrackingNumber?: string;
    deliveryCarrier?: string;
    items: Array<{
        productName: string;
        variantName?: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        isGift: boolean;
    }>;
}

export const salesAccountOrdersApi = {
    /** Guest order lookup — `pages/account/GuestOrderLookupPage.tsx` (Todo #6). Both params required. */
    trackGuestOrder: async (orderNumber: string, phone: string): Promise<GuestOrderTrackingResult> => {
        const response = await client.get<GuestOrderTrackingResult>('/sales/public/orders/track', {
            params: { orderNumber, phone },
        });
        return response.data;
    },

    getMyOrders: async () => {
        const response = await client.get<Order[]>(`/sales/orders?t=${Date.now()}`);
        return response.data;
    },
    getMyOrder: async (id: string) => {
        const response = await client.get<Order>(`/sales/orders/${id}`);
        return response.data;
    },

    // Customer Stats
    getMyStats: async () => {
        const response = await client.get<{
            totalOrders: number;
            completedOrders: number;
            pendingOrders: number;
            cancelledOrders: number;
            totalSpent: number;
            monthlySpent: number;
            yearlySpent: number;
            averageOrderValue: number;
            lastOrderDate?: string;
            firstOrderDate?: string;
            customerTier: string;
            loyaltyPoints: number;
        }>('/sales/my-stats');
        return response.data;
    },

    // Verify Purchase
    verifyPurchase: async (productId: string) => {
        const response = await client.get<{
            productId: string;
            hasPurchased: boolean;
            message: string;
        }>(`/sales/verify-purchase/${productId}`);
        return response.data;
    },

    // Cancel order (customer)
    cancel: async (id: string, reason: string) => {
        const response = await client.post<{ message: string; status: string }>(`/sales/orders/${id}/cancel`, { reason });
        return response.data;
    },

    // Get order history
    getHistory: async (orderId: string) => {
        const response = await client.get<OrderHistory[]>(`/sales/orders/${orderId}/history`);
        return response.data;
    },

    // Return Requests (customer side)
    returns: {
        // Get my return requests (Phase 07: đổi tên endpoint -> /sales/returns/mine)
        getMine: async () => {
            const response = await client.get<ReturnRequest[]>('/sales/returns/mine');
            return response.data;
        },

        // Backward-compat alias
        getList: async () => {
            const response = await client.get<ReturnRequest[]>('/sales/returns/mine');
            return response.data;
        },

        // Get return request detail (bao gồm timeline)
        getById: async (id: string) => {
            const response = await client.get<ReturnRequestDetail>(`/sales/returns/${id}`);
            return response.data;
        },

        // Create return request (3 luồng)
        create: async (data: CreateReturnRequestDto) => {
            const response = await client.post<{ id: string; orderId: string; type: string; status: string; message?: string }>('/sales/returns', data);
            return response.data;
        },

        // Cancel return request (khi Status=Pending)
        cancel: async (id: string) => {
            const response = await client.post<{ message: string; status: string }>(`/sales/returns/${id}/cancel`);
            return response.data;
        },

        // Chính sách đổi trả áp cho category — dùng để hiển thị điều kiện
        getEffectivePolicy: async (categoryId?: string) => {
            const params = categoryId ? { categoryId } : undefined;
            const response = await client.get<ReturnPolicy>('/sales/return-policies/effective', { params });
            return response.data;
        },
    },

    // Loyalty Points
    loyalty: {
        getAccount: async () => {
            const response = await client.get<LoyaltyAccount>('/sales/loyalty');
            return response.data;
        },

        getTransactions: async (page = 1, pageSize = 20) => {
            const response = await client.get<{
                total: number;
                transactions: LoyaltyTransaction[];
            }>('/sales/loyalty/transactions', { params: { page, pageSize } });
            return response.data;
        },

        redeemPoints: async (points: number, orderId?: string, description?: string) => {
            const response = await client.post<{
                message: string;
                pointsRedeemed: number;
                redemptionValue: number;
                remainingPoints: number;
            }>('/sales/loyalty/redeem', { points, orderId, description });
            return response.data;
        },

        calculateOrderPoints: async (orderAmount: number) => {
            const response = await client.get<{
                orderAmount: number;
                pointsToEarn: number;
                message: string;
            }>(`/sales/loyalty/calculate/${orderAmount}`);
            return response.data;
        },
    },
};
