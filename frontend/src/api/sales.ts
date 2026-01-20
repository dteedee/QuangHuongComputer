import client from './client';

// Types
export interface Order {
    id: string;
    orderNumber: string;
    customerId: string;
    status: OrderStatus;
    subtotalAmount: number;
    taxAmount: number;
    totalAmount: number;
    shippingAddress: string;
    notes?: string;
    orderDate: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
    items: OrderItem[];
}

export interface OrderItem {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Paid';

export interface CheckoutDto {
    items: {
        productId: string;
        productName: string;
        unitPrice: number;
        quantity: number;
    }[];
    shippingAddress?: string;
    notes?: string;
}

export interface OrdersResponse {
    total: number;
    page: number;
    pageSize: number;
    orders: Order[];
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
            const response = await client.put<{ message: string }>(
                `/sales/cart/items/${productId}`,
                { quantity }
            );
            return response.data;
        },

        removeItem: async (productId: string) => {
            const response = await client.delete<{ message: string }>(
                `/sales/cart/items/${productId}`
            );
            return response.data;
        },

        applyCoupon: async (couponCode: string) => {
            const response = await client.post<{
                message: string;
                discountAmount: number;
                totalAmount: number;
            }>('/sales/cart/apply-coupon', { couponCode });
            return response.data;
        },

        removeCoupon: async () => {
            const response = await client.delete<{ message: string }>('/sales/cart/remove-coupon');
            return response.data;
        },

        setShipping: async (shippingAmount: number) => {
            const response = await client.post<{ message: string; totalAmount: number }>(
                '/sales/cart/set-shipping',
                { shippingAmount }
            );
            return response.data;
        },

        clear: async () => {
            const response = await client.delete<{ message: string }>('/sales/cart/clear');
            return response.data;
        },
    },

    // Customer Endpoints
    checkout: async (data: CheckoutDto) => {
        const response = await client.post<{
            orderId: string;
            orderNumber: string;
            totalAmount: number;
            status: string;
        }>('/sales/checkout', data);
        return response.data;
    },

    getMyOrders: async () => {
        const response = await client.get<Order[]>('/sales/orders');
        return response.data;
    },

    getMyOrder: async (id: string) => {
        const response = await client.get<Order>(`/sales/orders/${id}`);
        return response.data;
    },

    // Admin Endpoints
    admin: {
        getOrders: async (page = 1, pageSize = 20) => {
            const response = await client.get<OrdersResponse>('/sales/admin/orders', {
                params: { page, pageSize },
            });
            return response.data;
        },

        getOrder: async (id: string) => {
            const response = await client.get<Order>(`/sales/admin/orders/${id}`);
            return response.data;
        },

        updateOrderStatus: async (id: string, status: string) => {
            const response = await client.put<{ message: string; status: string }>(
                `/sales/admin/orders/${id}/status`,
                { status }
            );
            return response.data;
        },

        getStats: async () => {
            const response = await client.get<SalesStats>('/sales/admin/stats');
            return response.data;
        },
    },
};
