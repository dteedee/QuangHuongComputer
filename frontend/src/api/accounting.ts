
import client from './client';

// ============================================
// Accounting API Types
// ============================================

export interface OrganizationAccount {
    id: string;
    name: string;
    creditLimit: number;
    balance: number;
    isActive: boolean;
    createdAt: string;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    customerId?: string;
    organizationAccountId?: string;
    supplierId?: string;
    type: InvoiceType;
    status: InvoiceStatus;
    currency: string;
    subtotal: number;
    vatAmount: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    issueDate: string;
    dueDate: string;
    notes?: string;
    lines: InvoiceLine[];
}

export interface InvoiceLine {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    lineTotal: number;
    vatAmount: number;
}

export type InvoiceType = 'Receivable' | 'Payable';
export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Overdue' | 'Cancelled';

export interface ARInvoice {
    id: string;
    invoiceNumber: string;
    customerId: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    status: InvoiceStatus;
    agingBucket: AgingBucket;
}

export interface APInvoice {
    id: string;
    invoiceNumber: string;
    supplierId: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    status: InvoiceStatus;
    agingBucket: AgingBucket;
}

export type AgingBucket = 'Current' | 'Days1To30' | 'Days31To60' | 'Days61To90' | 'Over90Days';

export interface ARPaymentRequest {
    paymentIntentId: string;
    amount: number;
    notes?: string;
}

export interface ShiftSession {
    id: string;
    cashierId: string;
    warehouseId: string;
    openedAt: string;
    closedAt?: string;
    openingBalance: number;
    closingBalance?: number;
    status: ShiftStatus;
    cashVariance?: number;
    duration?: string;
}

export type ShiftStatus = 'Open' | 'Closed';

export interface OpenShiftRequest {
    cashierId: string;
    warehouseId: string;
    openingBalance: number;
}

export interface CloseShiftRequest {
    actualCash: number;
}

export interface AccountingStats {
    totalReceivables: number;
    revenueToday: number;
    totalInvoices: number;
    activeAccounts: number;
}

export interface ARAgingSummary {
    current: number;
    days1To30: number;
    days31To60: number;
    days61To90: number;
    over90Days: number;
    totalOutstanding: number;
}

export interface APAgingSummary {
    current: number;
    days1To30: number;
    days31To60: number;
    days61To90: number;
    over90Days: number;
    totalPayable: number;
}

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

// ============================================
// Accounting API Functions
// ============================================

export const accountingApi = {
    // ============ Organization Accounts ============
    accounts: {
        getAll: async (): Promise<OrganizationAccount[]> => {
            const response = await client.get('/accounting/accounts');
            return response.data;
        },
        getById: async (id: string): Promise<OrganizationAccount> => {
            const response = await client.get(`/accounting/accounts/${id}`);
            return response.data;
        },
        create: async (data: { name: string; creditLimit: number }): Promise<OrganizationAccount> => {
            const response = await client.post('/accounting/accounts', data);
            return response.data;
        },
    },

    // ============ Invoices ============
    invoices: {
        getList: async (page = 1, pageSize = 20): Promise<{
            total: number;
            invoices: Invoice[];
        }> => {
            const response = await client.get('/accounting/invoices', {
                params: { page, pageSize }
            });
            return response.data;
        },
        getById: async (id: string): Promise<Invoice> => {
            const response = await client.get(`/accounting/invoices/${id}`);
            return response.data;
        },
        create: async (data: {
            customerId?: string;
            items: { description: string; quantity: number; unitPrice: number }[];
            notes?: string;
        }): Promise<Invoice> => {
            const response = await client.post('/accounting/invoices', data);
            return response.data;
        },
        recordPayment: async (id: string, data: {
            amount: number;
            reference: string;
        }): Promise<Invoice> => {
            const response = await client.post(`/accounting/invoices/${id}/payments`, data);
            return response.data;
        },
        getHtml: async (id: string): Promise<string> => {
            const response = await client.get(`/accounting/invoices/${id}/html`);
            return response.data;
        },
    },

    // ============ AR (Accounts Receivable) ============
    ar: {
        getList: async (page = 1, pageSize = 20, aging?: AgingBucket): Promise<PagedResult<ARInvoice>> => {
            const response = await client.get('/accounting/ar', {
                params: { page, pageSize, aging }
            });
            return response.data;
        },
        getById: async (id: string): Promise<Invoice> => {
            const response = await client.get(`/accounting/ar/${id}`);
            return response.data;
        },
        applyPayment: async (id: string, data: ARPaymentRequest): Promise<{
            message: string;
            outstandingAmount: number;
        }> => {
            const response = await client.post(`/accounting/ar/${id}/apply-payment`, data);
            return response.data;
        },
        getAgingSummary: async (): Promise<ARAgingSummary> => {
            const response = await client.get('/accounting/ar/aging-summary');
            return response.data;
        },
    },

    // ============ AP (Accounts Payable) ============
    ap: {
        getList: async (page = 1, pageSize = 20, aging?: AgingBucket): Promise<PagedResult<APInvoice>> => {
            const response = await client.get('/accounting/ap', {
                params: { page, pageSize, aging }
            });
            return response.data;
        },
        getById: async (id: string): Promise<Invoice> => {
            const response = await client.get(`/accounting/ap/${id}`);
            return response.data;
        },
        create: async (data: {
            supplierId: string;
            dueDate: string;
            vatRate: number;
            currency: string;
            notes?: string;
            lines: { description: string; quantity: number; unitPrice: number; vatRate: number }[];
        }): Promise<{ id: string; invoiceNumber: string }> => {
            const response = await client.post('/accounting/ap', data);
            return response.data;
        },
        getAgingSummary: async (): Promise<APAgingSummary> => {
            const response = await client.get('/accounting/ap/aging-summary');
            return response.data;
        },
        applyPayment: async (id: string, data: {
            amount: number;
            paymentMethod: string;
            reference?: string;
        }): Promise<{ message: string; outstandingAmount: number; status: string }> => {
            const response = await client.post(`/accounting/ap/${id}/apply-payment`, data);
            return response.data;
        },
    },

    // ============ Shift Management ============
    shifts: {
        getList: async (params: {
            page?: number;
            pageSize?: number;
            status?: ShiftStatus;
            cashierId?: string;
        } = {}): Promise<PagedResult<ShiftSession>> => {
            const response = await client.get('/accounting/shifts', { params });
            return response.data;
        },
        getById: async (id: string): Promise<ShiftSession> => {
            const response = await client.get(`/accounting/shifts/${id}`);
            return response.data;
        },
        open: async (data: OpenShiftRequest): Promise<ShiftSession> => {
            const response = await client.post('/accounting/shifts/open', data);
            return response.data;
        },
        close: async (id: string, data: CloseShiftRequest): Promise<{
            id: string;
            closedAt: string;
            openingBalance: number;
            closingBalance: number;
            cashVariance: number;
            duration: string;
            status: ShiftStatus;
        }> => {
            const response = await client.post(`/accounting/shifts/${id}/close`, data);
            return response.data;
        },
        recordTransaction: async (id: string, data: {
            description: string;
            amount: number;
            type: string;
            reference?: string;
        }): Promise<{ message: string }> => {
            const response = await client.post(`/accounting/shifts/${id}/transactions`, data);
            return response.data;
        },
    },

    // ============ Statistics ============
    stats: async (): Promise<AccountingStats> => {
        const response = await client.get('/accounting/stats');
        return response.data;
    },
};

// ============================================
// Helper Functions
// ============================================

export const getInvoiceStatusColor = (status: InvoiceStatus): string => {
    const colors: Record<InvoiceStatus, string> = {
        Draft: 'bg-gray-100 text-gray-800',
        Issued: 'bg-blue-100 text-blue-800',
        Paid: 'bg-green-100 text-green-800',
        Overdue: 'bg-red-100 text-red-800',
        Cancelled: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getAgingBucketLabel = (bucket: AgingBucket): string => {
    const labels: Record<AgingBucket, string> = {
        Current: 'Đúng hạn',
        Days1To30: '1-30 ngày',
        Days31To60: '31-60 ngày',
        Days61To90: '61-90 ngày',
        Over90Days: 'Trên 90 ngày',
    };
    return labels[bucket] || bucket;
};

export const formatCurrency = (amount: number, currency: string = 'VND'): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

// ============================================
// Expense Management Types
// ============================================

export interface ExpenseCategory {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
}

export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid';

export interface Expense {
    id: string;
    expenseNumber: string;
    categoryId: string;
    categoryName: string;
    description: string;
    amount: number;
    vatAmount: number;
    totalAmount: number;
    currency: string;
    expenseDate: string;
    status: ExpenseStatus;
    supplierId?: string;
    employeeId?: string;
    createdAt: string;
}

export interface ExpenseDetail extends Expense {
    paymentMethod?: string;
    createdBy: string;
    approvedBy?: string;
    approvedAt?: string;
    paidAt?: string;
    rejectionReason?: string;
    notes?: string;
    receiptUrl?: string;
}

export interface CreateExpenseRequest {
    categoryId: string;
    description: string;
    amount: number;
    vatRate: number;
    currency: string;
    expenseDate: string;
    supplierId?: string;
    employeeId?: string;
    notes?: string;
    receiptUrl?: string;
}

export interface ExpenseSummary {
    totalExpenses: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    pendingCount: number;
    approvedCount: number;
    paidCount: number;
    byCategory: CategoryExpenseSummary[];
}

export interface CategoryExpenseSummary {
    categoryId: string;
    categoryName: string;
    categoryCode: string;
    totalAmount: number;
    expenseCount: number;
}

// ============================================
// Expense API Functions
// ============================================

export const expenseApi = {
    // Categories
    categories: {
        getAll: async (): Promise<ExpenseCategory[]> => {
            const response = await client.get('/accounting/expense-categories');
            return response.data;
        },
        create: async (data: { name: string; code: string; description?: string }): Promise<ExpenseCategory> => {
            const response = await client.post('/accounting/expense-categories', data);
            return response.data;
        },
        update: async (id: string, data: { name: string; description?: string }): Promise<ExpenseCategory> => {
            const response = await client.put(`/accounting/expense-categories/${id}`, data);
            return response.data;
        },
    },

    // Expenses
    getList: async (params: {
        page?: number;
        pageSize?: number;
        status?: ExpenseStatus;
        categoryId?: string;
        startDate?: string;
        endDate?: string;
    } = {}): Promise<{ total: number; page: number; pageSize: number; expenses: Expense[] }> => {
        const response = await client.get('/accounting/expenses', { params });
        return response.data;
    },

    getById: async (id: string): Promise<ExpenseDetail> => {
        const response = await client.get(`/accounting/expenses/${id}`);
        return response.data;
    },

    create: async (data: CreateExpenseRequest): Promise<{ id: string; expenseNumber: string }> => {
        const response = await client.post('/accounting/expenses', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateExpenseRequest>): Promise<{ message: string }> => {
        const response = await client.put(`/accounting/expenses/${id}`, data);
        return response.data;
    },

    approve: async (id: string): Promise<{ message: string; status: string }> => {
        const response = await client.post(`/accounting/expenses/${id}/approve`);
        return response.data;
    },

    reject: async (id: string, reason: string): Promise<{ message: string; status: string }> => {
        const response = await client.post(`/accounting/expenses/${id}/reject`, { reason });
        return response.data;
    },

    pay: async (id: string, paymentMethod: string): Promise<{ message: string; status: string }> => {
        const response = await client.post(`/accounting/expenses/${id}/pay`, { paymentMethod });
        return response.data;
    },

    getSummary: async (startDate?: string, endDate?: string): Promise<ExpenseSummary> => {
        const params: Record<string, string> = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const response = await client.get('/accounting/expenses/summary', { params });
        return response.data;
    },
};
