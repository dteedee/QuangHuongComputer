/**
 * Invoices + credit notes — `docs/api-contracts/accounting.md` §1 and §4.
 * Wave-0 called `POST /accounting/invoices/{id}/payments`, which does not exist:
 * a payment is applied through `/ar/{id}/apply-payment` or `/ap/{id}/apply-payment`.
 */
import { client } from '../client';
import type {
    CreateInvoiceRequest, CreditNote, CreditNoteReason,
    InvoiceDetail, InvoiceListItem, InvoiceStatus, InvoiceType, PagedResult,
} from './types';

export interface InvoiceListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: InvoiceType;
    status?: InvoiceStatus;
    sortBy?: 'invoiceNumber' | 'issueDate' | 'dueDate' | 'totalAmount';
    sortDir?: 'asc' | 'desc';
}

export const invoicesApi = {
    list: async (params: InvoiceListParams = {}): Promise<PagedResult<InvoiceListItem>> => {
        const { data } = await client.get('/accounting/invoices', { params });
        return data;
    },

    get: async (id: string): Promise<InvoiceDetail> => {
        const { data } = await client.get(`/accounting/invoices/${id}`);
        return data;
    },

    create: async (payload: CreateInvoiceRequest): Promise<InvoiceDetail> => {
        const { data } = await client.post('/accounting/invoices', payload);
        return data;
    },

    update: async (id: string, payload: CreateInvoiceRequest): Promise<InvoiceDetail> => {
        const { data } = await client.put(`/accounting/invoices/${id}`, payload);
        return data;
    },

    /** Draft -> Issued. 409 when already issued. */
    issue: async (id: string): Promise<InvoiceDetail> => {
        const { data } = await client.post(`/accounting/invoices/${id}/issue`, {});
        return data;
    },

    /** 409 when `paidAmount > 0` — a credit note is required instead. */
    cancel: async (id: string, reason: string): Promise<InvoiceDetail> => {
        const { data } = await client.post(`/accounting/invoices/${id}/cancel`, { reason });
        return data;
    },

    /** Server-rendered printable invoice (HTML string, shown through `SafeHtml`). */
    html: async (id: string): Promise<string> => {
        const { data } = await client.get(`/accounting/invoices/${id}/html`, {
            responseType: 'text',
            headers: { Accept: 'text/html' },
        });
        return typeof data === 'string' ? data : String(data);
    },
};

export interface CreditNoteListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: CreditNote['status'];
    originalInvoiceId?: string;
}

export const creditNotesApi = {
    list: async (params: CreditNoteListParams = {}): Promise<PagedResult<CreditNote>> => {
        const { data } = await client.get('/accounting/credit-notes', { params });
        return data;
    },

    get: async (id: string): Promise<CreditNote> => {
        const { data } = await client.get(`/accounting/credit-notes/${id}`);
        return data;
    },

    create: async (payload: {
        originalInvoiceId: string;
        amount: number;
        reasonCode: CreditNoteReason;
        reason: string;
    }): Promise<CreditNote> => {
        const { data } = await client.post('/accounting/credit-notes', payload);
        return data;
    },

    cancel: async (id: string, reason?: string): Promise<CreditNote> => {
        const { data } = await client.post(`/accounting/credit-notes/${id}/cancel`, { reason });
        return data;
    },
};
