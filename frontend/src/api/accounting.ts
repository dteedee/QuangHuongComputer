import client from './client';

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

export const accountingApi = {
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
    }
};
