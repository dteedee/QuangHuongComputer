/**
 * Receivables / payables / organisation accounts / KPI stats —
 * `docs/api-contracts/accounting.md` §2, §3, §8, §1(`/stats`).
 */
import { client } from '../client';
import type {
    AccountingStats, AgingBucket, AgingSummary, InvoiceDetail,
    InvoiceListItem, InvoiceStatus, PagedResult,
} from './types';

export interface DebtListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: InvoiceStatus;
    aging?: AgingBucket;
    customerId?: string;
    supplierId?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export const arApi = {
    list: async (params: DebtListParams = {}): Promise<PagedResult<InvoiceListItem>> => {
        const { data } = await client.get('/accounting/ar', { params });
        return data;
    },
    get: async (id: string): Promise<InvoiceDetail> => {
        const { data } = await client.get(`/accounting/ar/${id}`);
        return data;
    },
    agingSummary: async (): Promise<AgingSummary> => {
        const { data } = await client.get('/accounting/ar/aging-summary');
        return data;
    },
    applyPayment: async (
        id: string,
        payload: { paymentIntentId?: string; amount: number; notes?: string },
    ): Promise<{ message: string; outstandingAmount: number; status: InvoiceStatus }> => {
        const { data } = await client.post(`/accounting/ar/${id}/apply-payment`, payload);
        return data;
    },
};

export interface CreateApInvoiceRequest {
    supplierId: string;
    dueDate: string;
    /** Supplier prices are NET of VAT — tax is added on top (contract §3). */
    lines: { description: string; quantity: number; unitPrice: number; vatRate: number }[];
    purchaseOrderId?: string;
    goodsReceiptId?: string;
    notes?: string;
}

export const apApi = {
    list: async (params: DebtListParams = {}): Promise<PagedResult<InvoiceListItem>> => {
        const { data } = await client.get('/accounting/ap', { params });
        return data;
    },
    get: async (id: string): Promise<InvoiceDetail> => {
        const { data } = await client.get(`/accounting/ap/${id}`);
        return data;
    },
    agingSummary: async (): Promise<AgingSummary> => {
        const { data } = await client.get('/accounting/ap/aging-summary');
        return data;
    },
    create: async (payload: CreateApInvoiceRequest): Promise<{ id: string; invoiceNumber: string; totalAmount: number }> => {
        const { data } = await client.post('/accounting/ap', payload);
        return data;
    },
    applyPayment: async (
        id: string,
        payload: { amount: number; paymentMethod: string; reference?: string },
    ): Promise<{ message?: string; outstandingAmount?: number; status?: InvoiceStatus }> => {
        const { data } = await client.post(`/accounting/ap/${id}/apply-payment`, payload);
        return data;
    },
};

export interface OrganizationAccount {
    id: string;
    name: string;
    creditLimit: number;
    balance: number;
    isActive?: boolean;
}

export const accountsApi = {
    list: async (params: { page?: number; pageSize?: number; search?: string; sortBy?: string } = {}):
        Promise<PagedResult<OrganizationAccount>> => {
        const { data } = await client.get('/accounting/accounts', { params });
        return data;
    },
    get: async (id: string): Promise<OrganizationAccount> => {
        const { data } = await client.get(`/accounting/accounts/${id}`);
        return data;
    },
    create: async (payload: { name: string; creditLimit: number }): Promise<OrganizationAccount> => {
        const { data } = await client.post('/accounting/accounts', payload);
        return data;
    },
};

export const statsApi = {
    get: async (): Promise<AccountingStats> => {
        const { data } = await client.get('/accounting/stats');
        return data;
    },
};
