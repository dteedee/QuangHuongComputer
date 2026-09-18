/**
 * Sales — ADMIN order-management + dashboard-stats surface. Split out of the
 * old flat `api/sales.ts` (W1-9, step 7c). Functions moved verbatim;
 * `api/sales.ts` re-exports them.
 */
import client from '../client';
import type { Order, OrderDetail, OrderStatus, OrderTransitionsDto } from './types';

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
        /**
         * Server-side paging + filters, all of them — `docs/api-contracts/
         * sales-pos-returns-loyalty.md` §4 `GET /admin/orders`. `paymentStatus`,
         * `channel` and the date range used to be filtered client-side on the
         * one loaded page (wrong — silently hid rows on later pages); now sent
         * to the server like `status`/`search`.
         */
        getOrders: async (
            page: number,
            pageSize: number,
            search?: string,
            status?: string,
            extra?: { paymentStatus?: string; channel?: string; from?: string; to?: string }
        ) => {
            const params: Record<string, any> = { page, pageSize };
            if (search) params.search = search;
            if (status && status !== 'all') params.status = status;
            if (extra?.paymentStatus && extra.paymentStatus !== 'all') params.paymentStatus = extra.paymentStatus;
            if (extra?.channel && extra.channel !== 'all') params.channel = extra.channel;
            if (extra?.from) params.from = extra.from;
            if (extra?.to) params.to = extra.to;

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

    /**
     * Rich admin detail — `docs/api-contracts/sales-pos-returns-loyalty.md` §4.
     * `GET /admin/orders/{id}` (not the plain `/orders/{id}` used by `getById`,
     * which is the flat storefront shape) — money/shipping/pos/dates/items/
     * payments/history in one call, `Sales.ViewAll`.
     */
    getDetail: async (id: string) => {
        const response = await client.get<OrderDetail>(`/sales/admin/orders/${id}`);
        return response.data;
    },

    /**
     * The state-machine's own source of truth for legal next moves
     * (`docs/api-contracts/sales-orders.md` §2). The UI renders action
     * buttons from `allowedNext` instead of hardcoding the transition table.
     */
    getTransitions: async (id: string) => {
        const response = await client.get<OrderTransitionsDto>(`/sales/admin/orders/${id}/transitions`);
        return response.data;
    },

    /** `POST /admin/orders/{id}/transitions` — one endpoint for every status move, `Sales.UpdateStatus`. */
    transition: async (id: string, body: { to: OrderStatus; reason?: string; trackingNumber?: string; carrier?: string }) => {
        const response = await client.post<{ status: OrderStatus; statusLabel: string; paymentStatus: string; orderNumber: string }>(
            `/sales/admin/orders/${id}/transitions`,
            body
        );
        return response.data;
    },

    /** `POST /admin/orders/{id}/cancel` — `Sales.CancelOrder`, reason required. */
    cancel: async (id: string, reason: string) => {
        const response = await client.post(`/sales/admin/orders/${id}/cancel`, { reason });
        return response.data;
    },

    /**
     * One cash-in event on the order — COD collected, bank transfer already
     * reconciled, or a deposit (`docs/api-contracts/sales-orders.md` §2,
     * `Sales.TakeDeposit`). Idempotent by `reference`.
     */
    addPayment: async (id: string, body: { method: string; amount: number; reference: string; tenderedAmount?: number }) => {
        const response = await client.post(`/sales/admin/orders/${id}/payments`, body);
        return response.data;
    },

    /** `POST /admin/orders/{id}/notes` — internal note, appended to history. */
    addNote: async (id: string, note: string) => {
        const response = await client.post(`/sales/admin/orders/${id}/notes`, { note });
        return response.data;
    },

    /**
     * D04 — "Đã thu COD" hits the reconciliation endpoint, not a raw status
     * write. `docs/api-contracts/payments.md` §"cod/confirm", `Payments.CollectCod`.
     */
    confirmCodCollected: async (orderId: string) => {
        const response = await client.post(`/payments/cod/confirm/${orderId}`);
        return response.data;
    },

    /**
     * D04 — "Xác nhận chuyển khoản" confirms a specific pending payment
     * intent (bank reference), not the order status directly. Verified
     * against TEST :5050 (2026-09-18): the bare `/payments/reconciliation/...`
     * path 404s — the real route is under the admin prefix, per
     * `PaymentAdminReconcileEndpoints.cs`. `Payments.Reconcile`.
     */
    confirmBankTransfer: async (paymentId: string, bankReference: string) => {
        const response = await client.post(`/payments/admin/reconciliation/confirm/${paymentId}`, { bankReference });
        return response.data;
    },

    /**
     * Payment intents for one order — `GET /payments/admin/payments` has no
     * `orderId` filter (`docs/api-contracts/payments.md` §5 only documents
     * `status/provider/from/to/search`), so this fetches a page and filters
     * client-side. Used to find the pending bank-transfer intent to confirm
     * (D04) — verified shape against TEST :5050: `{id, orderId, amount,
     * status, provider, reconciliationReference, ...}`.
     */
    getPaymentIntentsForOrder: async (orderId: string) => {
        const response = await client.get<{ items: Array<{ id: string; orderId: string; amount: number; status: string; provider: string }> }>(
            '/payments/admin/payments',
            { params: { pageSize: 100 } }
        );
        return response.data.items.filter((p) => p.orderId === orderId);
    },
};
