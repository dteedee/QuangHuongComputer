import client from './client';
import { QueryParams, PagedResult } from '../hooks/useCrudList';

export interface OrganizationAccount {
    id: string;
    organizationName: string;
    contactEmail: string;
    creditLimit: number;
    balance: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    accountId: string;
    amount: number;
    dueDate: string;
    status: string;
}

export interface ARInvoice {
    id: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    outstanding: number;
    agingDays: number;
    dueDate: string;
    issueDate: string;
    status: 'current' | 'overdue';
}

export interface APInvoice {
    id: string;
    invoiceNumber: string;
    supplierName: string;
    amount: number;
    poReference?: string;
    status: 'pending' | 'approved' | 'paid';
    dueDate: string;
    issueDate: string;
}

export interface Shift {
    id: string;
    employeeId: string;
    employeeName: string;
    startTime: string;
    endTime?: string;
    startingCash: number;
    endingCash?: number;
    expectedCash?: number;
    variance?: number;
    status: 'open' | 'closed';
}

export interface OpenShiftDto {
    employeeId: string;
    startingCash: number;
}

export const accountingApi = {
    // Legacy endpoints
    getAccounts: async () => {
        const response = await client.get<OrganizationAccount[]>('/accounting/accounts');
        return response.data;
    },
    getInvoices: async () => {
        const response = await client.get<Invoice[]>('/accounting/invoices');
        return response.data;
    },
    createAccount: async (data: any) => {
        const response = await client.post('/accounting/accounts', data);
        return response.data;
    },
    createInvoice: async (data: any) => {
        const response = await client.post('/accounting/invoices', data);
        return response.data;
    },
    recordPayment: async (invoiceId: string, amount: number) => {
        const response = await client.post(`/accounting/invoices/${invoiceId}/payments`, { amount });
        return response.data;
    },
    getStats: async () => {
        const response = await client.get('/accounting/stats');
        return response.data;
    },

    // AR (Accounts Receivable) endpoints
    getARList: async (params?: QueryParams) => {
        const response = await client.get<PagedResult<ARInvoice>>('/accounting/ar', { params });
        return response.data;
    },
    applyPayment: async (invoiceId: string, amount: number) => {
        const response = await client.post(`/accounting/ar/${invoiceId}/payment`, { amount });
        return response.data;
    },

    // AP (Accounts Payable) endpoints
    getAPList: async (params?: QueryParams) => {
        const response = await client.get<PagedResult<APInvoice>>('/accounting/ap', { params });
        return response.data;
    },

    // Shift Management endpoints
    getShifts: async (params?: QueryParams) => {
        const response = await client.get<PagedResult<Shift>>('/accounting/shifts', { params });
        return response.data;
    },
    getCurrentShift: async () => {
        const response = await client.get<Shift | null>('/accounting/shifts/current');
        return response.data;
    },
    openShift: async (data: OpenShiftDto) => {
        const response = await client.post<Shift>('/accounting/shifts/open', data);
        return response.data;
    },
    closeShift: async (shiftId: string, actualCash: number) => {
        const response = await client.post(`/accounting/shifts/${shiftId}/close`, { actualCash });
        return response.data;
    },
};
