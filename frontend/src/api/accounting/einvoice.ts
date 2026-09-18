/**
 * E-invoice (hoá đơn điện tử) — `docs/api-contracts/accounting-einvoice.md`.
 * The wave-0 module called `/einvoice/cancel/{id}` and `/einvoice/pdf/{id}`,
 * which W2-24 deleted (they pointed at a MISA API that never existed). Gone here.
 */
import { client } from '../client';
import type { EInvoiceModeInfo, EInvoiceQueueItem, EInvoiceResult, InvoiceBuyer, PagedResult } from './types';

export const einvoiceApi = {
    /** Drives the SANDBOX / EXTERNAL / LIVE badge — never hide the sandbox notice. */
    mode: async (): Promise<EInvoiceModeInfo> => {
        const { data } = await client.get('/accounting/einvoice/mode');
        return data;
    },
    queue: async (params: { page?: number; pageSize?: number; onlyLate?: boolean } = {}):
        Promise<PagedResult<EInvoiceQueueItem>> => {
        const { data } = await client.get('/accounting/einvoice/queue', { params });
        return data;
    },
    /** Excel of the queue: `cho-xuat-hddt-YYYYMMDD.xlsx`, max 5000 rows. */
    exportQueue: async (onlyLate = false): Promise<Blob> => {
        const { data } = await client.get('/accounting/einvoice/export', {
            params: { onlyLate },
            responseType: 'blob',
        });
        return data;
    },
    issue: async (invoiceId: string): Promise<EInvoiceResult> => {
        const { data } = await client.post(`/accounting/einvoice/issue/${invoiceId}`, {});
        return data;
    },
    issueByOrder: async (orderId: string): Promise<EInvoiceResult> => {
        const { data } = await client.post(`/accounting/einvoice/issue/by-order/${orderId}`, {});
        return data;
    },
    /** Record an invoice that was actually issued in the provider's own software. */
    recordExternal: async (
        invoiceId: string,
        payload: { series: string; number: string; lookupCode?: string; issuedAt?: string },
    ): Promise<EInvoiceResult> => {
        const { data } = await client.post(`/accounting/einvoice/${invoiceId}/record-external`, payload);
        return data;
    },
    /** 409 once the e-invoice is issued — the buyer block is locked from then on. */
    updateBuyer: async (invoiceId: string, buyer: InvoiceBuyer): Promise<EInvoiceResult> => {
        const { data } = await client.put(`/accounting/einvoice/${invoiceId}/buyer`, buyer);
        return data;
    },
    status: async (invoiceId: string): Promise<EInvoiceResult> => {
        const { data } = await client.get(`/accounting/einvoice/status/${invoiceId}`);
        return data;
    },
};
