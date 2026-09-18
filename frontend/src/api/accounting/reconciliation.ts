/**
 * Đối soát thu tiền (D04) — `docs/api-contracts/payments.md` §5.
 *
 * These are Payments routes, consumed by the accountant workspace. They live
 * here rather than in `api/payment.ts` because that file belongs to another
 * track right now (integration request W3-13 #7 asks for them to be folded in
 * once ownership allows). Paths and bodies are exactly as the contract states.
 *
 * Luật D04: một khoản tiền về khớp số tiền trong cửa sổ giữ chỗ chỉ là GỢI Ý —
 * `GET /reconciliation/unassigned` không bao giờ tự gán; con người phải bấm
 * `POST /reconciliation/assign`.
 */
import { client } from '../client';
import type { PagedResult } from './types';

export type PaymentSettlement = 'NotApplicable' | 'AwaitingRemittance' | 'Remitted';

export interface PaymentIntentRow {
    id: string;
    orderId?: string | null;
    amount: number;
    amountRefunded: number;
    status: 'Pending' | 'Processing' | 'Succeeded' | 'Failed' | 'Cancelled' | 'PartiallyRefunded' | 'Refunded';
    provider: string;
    paymentCode?: string | null;
    externalId?: string | null;
    reconciliationReference?: string | null;
    settlement: PaymentSettlement;
    confirmedAt?: string | null;
    createdAt: string;
}

export interface UnassignedTransaction {
    transactionId: string;
    amount: number;
    bankReference?: string | null;
    content?: string | null;
    receivedAt: string;
    /** At most one, and only ever a suggestion (D04) — the API never applies it. */
    suggestion?: { paymentId: string; orderId?: string | null; amount: number; paymentCode?: string | null } | null;
}

export interface RefundRow {
    id: string;
    paymentIntentId: string;
    orderId?: string | null;
    amount: number;
    channel?: string | null;
    status: 'Requested' | 'Approved' | 'Completed' | 'Rejected' | 'Failed';
    reason?: string | null;
    reference?: string | null;
    requestedAt: string;
    approvedAt?: string | null;
    completedAt?: string | null;
    failureReason?: string | null;
}

export const reconciliationApi = {
    unassigned: async (): Promise<UnassignedTransaction[]> => {
        const { data } = await client.get('/payments/admin/reconciliation/unassigned');
        return Array.isArray(data) ? data : (data?.items ?? []);
    },
    /** 409 when the intent is not Pending or the amounts differ. */
    assign: async (payload: { transactionId: string; paymentId: string }): Promise<void> => {
        await client.post('/payments/admin/reconciliation/assign', payload);
    },
    /** `bankReference` is mandatory — it is the audit evidence for a manual confirmation. */
    confirm: async (paymentId: string, bankReference: string): Promise<void> => {
        await client.post(`/payments/admin/reconciliation/confirm/${paymentId}`, { bankReference });
    },
    /** Batch tick of collected COD as remitted to the company. */
    settleCod: async (paymentIds: string[]): Promise<void> => {
        await client.post('/payments/admin/reconciliation/cod/settle', { paymentIds });
    },
    payments: async (params: { provider?: string; status?: string; search?: string; page?: number; pageSize?: number } = {}):
        Promise<PagedResult<PaymentIntentRow>> => {
        const { data } = await client.get('/payments/admin/payments', { params });
        return data;
    },
    refunds: async (params: { status?: string; page?: number; pageSize?: number } = {}): Promise<PagedResult<RefundRow>> => {
        const { data } = await client.get('/payments/admin/refunds', { params });
        return data;
    },
    approveRefund: async (id: string): Promise<void> => {
        await client.post(`/payments/admin/refunds/${id}/approve`, {});
    },
    /** `reference` is required by the contract — a completed refund must be traceable. */
    completeRefund: async (id: string, payload: { reference: string; channel?: string }): Promise<void> => {
        await client.post(`/payments/admin/refunds/${id}/complete`, payload);
    },
    rejectRefund: async (id: string, reason: string): Promise<void> => {
        await client.post(`/payments/admin/refunds/${id}/reject`, { reason });
    },
};
