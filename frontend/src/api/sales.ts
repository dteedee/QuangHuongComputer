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
}

// Order History - NOTE: Backend doesn't have this endpoint
export interface OrderHistory {
    id: string;
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    notes?: string;
    changedBy?: string;
    changedAt: string;
}

// NOTE: Backend doesn't have return request endpoints
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
            // Backend uses /sales/checkout instead of /sales/orders
            const response = await client.post<{ orderId: string; orderNumber: string; totalAmount: number; status: string }>('/sales/checkout', {
                items: data.items,
                shippingAddress: data.shippingAddress,
                notes: data.notes,
                sourceId: data.sourceId
            });
            return response.data;
        },

        updateStatus: async (id: string, status: OrderStatus, reason?: string) => {
            // Only admins can update status via /sales/admin/orders/{id}/status
            const response = await client.put<{ message: string }>(`/sales/admin/orders/${id}/status`, { status });
            return response.data;
        },

        // NOTE: Backend doesn't have cancel endpoint
        cancel: async (_id: string, _reason: string) => {
            throw new Error('Cancel endpoint not implemented in backend');
        },

        // NOTE: Backend doesn't have history endpoint
        getHistory: async (_orderId: string) => {
            throw new Error('Order history endpoint not implemented in backend');
        },

        // Return Requests - NOTE: Backend doesn't have these endpoints
        returns: {
            create: async (_data: {
                orderId: string;
                orderItemId: string;
                reason: string;
                description?: string;
                imageUrl?: string; // Added imageUrl here based on the instruction's intent
            }) => {
                throw new Error('Return request endpoint not implemented in backend');
            },

            approve: async (_id: string) => {
                throw new Error('Return approve endpoint not implemented in backend');
            },

            reject: async (_id: string, _reason: string) => {
                throw new Error('Return reject endpoint not implemented in backend');
            },

            processRefund: async (_id: string) => {
                throw new Error('Return refund endpoint not implemented in backend');
            },
        },
    },

    // Stats Endpoints
    stats: {
        get: async (params?: { startDate?: string; endDate?: string }) => {
            const response = await client.get<SalesStats>('/sales/admin/stats', { params });
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
    }
};