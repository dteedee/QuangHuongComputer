/**
 * Expenses + expense categories — `docs/api-contracts/accounting.md` §7.
 * There is deliberately no `delete`: the backend exposes no DELETE for an
 * expense (see integration-requests-w3.md, W3-13 #3). Editing is PUT-only and
 * the UI only offers it while the row is still Draft/Pending.
 */
import { client } from '../client';
import type { Expense, ExpenseCategory, ExpenseStatus, ExpenseSummary, PagedResult } from './types';

export interface ExpenseListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ExpenseStatus;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'expenseNumber' | 'expenseDate' | 'totalAmount';
    sortDir?: 'asc' | 'desc';
}

export interface ExpenseWriteRequest {
    categoryId: string;
    description: string;
    amount: number;
    /** Percent (10 = 10%). */
    vatRate: number;
    expenseDate: string;
    supplierId?: string | null;
    employeeId?: string | null;
    notes?: string | null;
    receiptUrl?: string | null;
}

export const expensesApi = {
    list: async (params: ExpenseListParams = {}): Promise<PagedResult<Expense>> => {
        const { data } = await client.get('/accounting/expenses', { params });
        return data;
    },
    get: async (id: string): Promise<Expense> => {
        const { data } = await client.get(`/accounting/expenses/${id}`);
        return data;
    },
    summary: async (params: { startDate?: string; endDate?: string } = {}): Promise<ExpenseSummary> => {
        const { data } = await client.get('/accounting/expenses/summary', { params });
        return data;
    },
    create: async (payload: ExpenseWriteRequest): Promise<{ id: string; expenseNumber: string; totalAmount: number }> => {
        const { data } = await client.post('/accounting/expenses', payload);
        return data;
    },
    update: async (id: string, payload: ExpenseWriteRequest): Promise<{ message: string }> => {
        const { data } = await client.put(`/accounting/expenses/${id}`, payload);
        return data;
    },
    approve: async (id: string): Promise<{ message: string; status: ExpenseStatus }> => {
        const { data } = await client.post(`/accounting/expenses/${id}/approve`, {});
        return data;
    },
    reject: async (id: string, reason: string): Promise<{ message: string; status: ExpenseStatus }> => {
        const { data } = await client.post(`/accounting/expenses/${id}/reject`, { reason });
        return data;
    },
    /** Cash payments automatically post a `PC/PAY-…` voucher into the cash book. */
    pay: async (id: string, payload: { paymentMethod: string; fundCode?: string }): Promise<{ message: string }> => {
        const { data } = await client.post(`/accounting/expenses/${id}/pay`, payload);
        return data;
    },
};

export const expenseCategoriesApi = {
    list: async (includeInactive = false): Promise<ExpenseCategory[]> => {
        const { data } = await client.get('/accounting/expense-categories', { params: { includeInactive } });
        return Array.isArray(data) ? data : (data?.items ?? []);
    },
    create: async (payload: { code: string; name: string; description?: string }): Promise<ExpenseCategory> => {
        const { data } = await client.post('/accounting/expense-categories', payload);
        return data;
    },
    update: async (id: string, payload: { name: string; description?: string; isActive?: boolean }): Promise<ExpenseCategory> => {
        const { data } = await client.put(`/accounting/expense-categories/${id}`, payload);
        return data;
    },
};
