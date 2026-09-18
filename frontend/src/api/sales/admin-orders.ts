/**
 * Sales — ADMIN order-management + dashboard-stats surface. Split out of the
 * old flat `api/sales.ts` (W1-9, step 7c). Functions moved verbatim;
 * `api/sales.ts` re-exports them.
 */
import client from '../client';
import type { Order, OrderStatus } from './types';

export interface SalesStats {
    totalOrders: number;
    todayOrders: number;
    monthOrders: number;
    totalRevenue: number;
    monthRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    averageOrderValue: number;
    todayRevenue: number;
    orderGrowth: number;
    revenueGrowth: number;
}

export interface RevenueChartData {
    year: number;
    monthlyData: {
        month: number;
        revenue: number;
        orderCount: number;
    }[];
}

export const salesAdminOrdersApi = {
    getList: async (params?: {
        page?: number;
        pageSize?: number;
        status?: OrderStatus;
        customerId?: string;
        startDate?: string;
        endDate?: string;
    }) => {
        const response = await client.get<{ total: number; page: number; pageSize: number; orders: Order[] }>('/sales/admin/orders', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await client.get<Order>(`/sales/orders/${id}`);
        return response.data;
    },

    updateStatus: async (id: string, status: OrderStatus, reason?: string) => {
        // Only admins can update status via /sales/admin/orders/{id}/status
        const response = await client.put<{ message: string }>(`/sales/admin/orders/${id}/status`, { status });
        return response.data;
    },

    // Admin Endpoints alias for compatibility
    admin: {
        getOrders: async (page: number, pageSize: number, search?: string, status?: string) => {
            const params: Record<string, any> = { page, pageSize };
            if (search) params.search = search;
            if (status && status !== 'all') params.status = status;

            const response = await client.get<{ total: number; page: number; pageSize: number; orders: Order[] }>(
                '/sales/admin/orders',
                { params }
            );
            return { orders: response.data.orders, total: response.data.total };
        },
        getStats: async () => {
            const response = await client.get<SalesStats>('/sales/admin/stats');
            return response.data;
        }
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
};
