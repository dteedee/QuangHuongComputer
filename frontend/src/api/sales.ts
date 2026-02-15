import client from './client';

// Types - Updated to match backend entities
export interface Order {
    id: string;
    orderNumber: string;
    customerId: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    shippingAmount: number;
    totalAmount: number;
    taxRate: number;
    couponCode?: string;
    couponSnapshot?: string;
    shippingAddress: string;
    notes?: string;

    // Enhanced fields
    customerIp?: string;
    customerUserAgent?: string;
    internalNotes?: string;
    sourceId?: string;
    affiliateId?: string;
    discountReason?: string;
    deliveryTrackingNumber?: string;
    deliveryCarrier?: string;
    retryCount: number;
    failureReason?: string;

    // Timestamps
    orderDate: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    paidAt?: string;
    fulfilledAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;

    items: OrderItem[];
}

export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    productSku?: string;
    unitPrice: number;
    originalPrice?: number;
    quantity: number;
    discountAmount: number;
    lineTotal: number;
}

export type OrderStatus = 'Pending' | 'Draft' | 'Confirmed' | 'Paid' | 'Shipped' | 'Delivered' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Refunded';
export type FulfillmentStatus = 'Pending' | 'Processing' | 'Fulfilled' | 'Shipped' | 'Delivered';

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

// Order History
export interface OrderHistory {
    id: string;
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    notes?: string;
    changedBy?: string;
    changedAt: string;
}

export interface ReturnRequest {
    id: string;
    orderId: string;
    orderItemId: string;
    reason: string;
    description?: string;
    status: ReturnStatus;
    refundAmount: number;
    refundMethod?: string;
    requestedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    refundedAt?: string;
    processedBy?: string;
    customerNotes?: string;
}

export type ReturnStatus = 'Pending' | 'Approved' | 'Rejected' | 'Refunded' | 'Completed' | 'Cancelled';

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
}

export interface SalesStats {
    totalOrders: number;
    todayOrders: number;
    monthOrders: number;
    totalRevenue: number;
    monthRevenue: number;
    pendingOrders: number;
    completedOrders: number;
}

export interface RevenueChartData {
    year: number;
    monthlyData: {
        month: number;
        revenue: number;
        orderCount: number;
    }[];
}

// API Functions
export const salesApi = {
    // Cart Endpoints
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
            const response = await client.post<{ message: string; discount: number }>('/sales/cart/apply-coupon', { couponCode });
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

    // Order Endpoints
    orders: {
        getList: async (params?: {
            page?: number;
            pageSize?: number;
            status?: OrderStatus;
            customerId?: string;
            startDate?: string;
            endDate?: string;
        }) => {
            const response = await client.get<Order[]>('/sales/orders', { params });
            return response.data;
        },

        getById: async (id: string) => {
            const response = await client.get<Order>(`/sales/orders/${id}`);
            return response.data;
        },

        create: async (data: CheckoutDto) => {
            // Log checkout data for debugging
            console.log('Checkout data:', JSON.stringify(data, null, 2));

            // Try fast checkout first for better performance
            // Try fast checkout first for better performance
            /* TEMPORARILY DISABLED TO FIX CONCURRENCY ISSUE
            try {
                const response = await client.post<{ orderId: string; orderNumber: string; totalAmount: number; status: string }>('/sales/fast-checkout', {
                    items: data.items,
                    shippingAddress: data.shippingAddress,
                    notes: data.notes,
                    customerId: data.customerId,
                    paymentMethod: data.paymentMethod,
                    isPickup: data.isPickup,
                    pickupStoreId: data.pickupStoreId,
                    pickupStoreName: data.pickupStoreName,
                    manualDiscount: data.manualDiscount,
                    couponCode: data.couponCode
                });
                return response.data;
            } catch (error: any) {
                // Log detailed error from backend
                const errorData = error.response?.data;
                const errorMessage = errorData?.error || errorData?.Error || errorData?.message || error.message || 'Unknown error';
                console.log('Fast checkout failed:', errorMessage, errorData);
            */

            // Fall back to regular checkout if fast checkout fails
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
                    pickupStoreName: data.pickupStoreName
                });
                return response.data;
            } catch (checkoutError: any) {
                // Log detailed error from regular checkout
                const checkoutErrorData = checkoutError.response?.data;
                console.log('Regular checkout also failed:', checkoutErrorData);

                // Throw with meaningful error message
                const finalError = checkoutErrorData?.error || checkoutErrorData?.Error || checkoutErrorData?.message || 'Không thể đặt hàng';
                throw new Error(finalError);
            }
            /* } */
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

        updateStatus: async (id: string, status: OrderStatus, reason?: string) => {
            // Only admins can update status via /sales/admin/orders/{id}/status
            const response = await client.put<{ message: string }>(`/sales/admin/orders/${id}/status`, { status });
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

        // Return Requests
        returns: {
            // Get my return requests
            getList: async () => {
                const response = await client.get<ReturnRequest[]>('/sales/returns');
                return response.data;
            },

            // Get return request by ID
            getById: async (id: string) => {
                const response = await client.get<ReturnRequest>(`/sales/returns/${id}`);
                return response.data;
            },

            // Create return request
            create: async (data: {
                orderId: string;
                orderItemId: string;
                reason: string;
                description?: string;
            }) => {
                const response = await client.post<{ id: string; orderId: string; status: string; message: string }>('/sales/returns', data);
                return response.data;
            },

            // Admin: Get all returns
            adminGetList: async (page = 1, pageSize = 20, status?: string) => {
                const params = new URLSearchParams();
                params.append('page', page.toString());
                params.append('pageSize', pageSize.toString());
                if (status) params.append('status', status);
                const response = await client.get<{ total: number; page: number; pageSize: number; returns: ReturnRequest[] }>(`/sales/admin/returns?${params.toString()}`);
                return response.data;
            },

            // Admin: Get return by ID
            adminGetById: async (id: string) => {
                const response = await client.get<ReturnRequest>(`/sales/admin/returns/${id}`);
                return response.data;
            },

            // Admin: Approve return
            approve: async (id: string) => {
                const response = await client.post<{ message: string; status: string }>(`/sales/admin/returns/${id}/approve`);
                return response.data;
            },

            // Admin: Reject return
            reject: async (id: string, reason: string) => {
                const response = await client.post<{ message: string; status: string }>(`/sales/admin/returns/${id}/reject`, { reason });
                return response.data;
            },

            // Admin: Process refund
            processRefund: async (id: string) => {
                const response = await client.post<{ message: string; status: string }>(`/sales/admin/returns/${id}/refund`);
                return response.data;
            },
        },
    },

    // Stats Endpoints
    stats: {
        get: async (params?: { startDate?: string; endDate?: string }) => {
            const response = await client.get<SalesStats>('/sales/admin/stats', { params });
            return response.data;
        },
        getRevenueChart: async (year?: number) => {
            const response = await client.get<RevenueChartData>('/sales/admin/stats/revenue-chart', {
                params: year ? { year } : undefined
            });
            return response.data;
        },
    },

    // Admin Endpoints alias for compatibility
    admin: {
        getOrders: async (page: number, pageSize: number) => {
            const response = await client.get<Order[]>('/sales/orders', { params: { page, pageSize } });
            // Wrap in expected structure if needed, or update SalePortal to expect just array
            return { orders: response.data, total: response.data.length };
        },
        getStats: async () => {
            const response = await client.get<SalesStats>('/sales/admin/stats');
            return response.data;
        }
    },
    // Compatibility aliases
    getMyOrders: async () => {
        const response = await client.get<Order[]>('/sales/orders');
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