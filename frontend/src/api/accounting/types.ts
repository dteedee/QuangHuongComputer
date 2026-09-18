/**
 * Accounting DTOs — typed strictly from `docs/api-contracts/accounting.md`
 * (owner W2-14) and `docs/api-contracts/accounting-einvoice.md` (owner W2-24).
 * Every field here exists in a documented response; nothing is invented.
 * Money is VND (integer đồng); `vatRate` is a PERCENT (8 = 8%).
 */

export type InvoiceType = 'Receivable' | 'Payable';
export type InvoiceStatus = 'Draft' | 'Issued' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Cancelled';
export type AgingBucket = 'Current' | 'Days1To30' | 'Days31To60' | 'Days61To90' | 'Over90Days';

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface InvoiceBuyer {
    buyerType?: string | null;
    legalName?: string | null;
    fullName?: string | null;
    taxCode?: string | null;
    budgetUnitCode?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
}

export interface InvoiceLine {
    id: string;
    description: string;
    sku?: string | null;
    unitName?: string | null;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    grossBeforeDiscount: number;
    lineDiscount: number;
    grossAmount: number;
    netAmount: number;
    vatAmount: number;
    isPromotion: boolean;
    note?: string | null;
}

export interface PaymentApplication {
    id: string;
    paymentIntentId?: string | null;
    invoiceId: string;
    amount: number;
    appliedAt: string;
    notes?: string | null;
}

/** Row shape of `GET /invoices`, `GET /ar`, `GET /ap`. */
export interface InvoiceListItem {
    id: string;
    invoiceNumber: string;
    type?: InvoiceType;
    status: InvoiceStatus;
    customerId?: string | null;
    supplierId?: string | null;
    organizationAccountId?: string | null;
    orderId?: string | null;
    orderNumber?: string | null;
    issueDate: string;
    dueDate: string;
    subTotal?: number;
    vatAmount?: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    agingBucket: AgingBucket;
    currency: string;
}

export interface InvoiceDetail extends InvoiceListItem {
    businessDate?: string;
    vatRate: number;
    notes?: string | null;
    buyer?: InvoiceBuyer | null;
    lines: InvoiceLine[];
    paymentApplications: PaymentApplication[];
}

export interface CreateInvoiceLine {
    description: string;
    quantity: number;
    unitPriceIncludingVat: number;
    vatStatutoryRate?: number;
    vatReductionEligible?: boolean;
    discount?: number;
    sku?: string;
    unitName?: string;
}

export interface CreateInvoiceRequest {
    customerId?: string;
    organizationAccountId?: string;
    notes?: string;
    dueDate?: string;
    buyer?: InvoiceBuyer;
    lines: CreateInvoiceLine[];
}

export interface AccountingStats {
    totalReceivables: number;
    totalPayables: number;
    overdueReceivables: number;
    overduePayables: number;
    revenueToday: number;
    totalReceivableInvoices: number;
    totalPayableInvoices: number;
    activeAccounts: number;
}

export interface AgingSummary {
    current: number;
    days1To30: number;
    days31To60: number;
    days61To90: number;
    over90Days: number;
    totalOutstanding: number;
}

export type CreditNoteReason = 'OrderCancelled' | 'Refund' | 'Return' | 'PriceAdjustment' | 'Other';

export interface CreditNote {
    id: string;
    creditNoteNumber: string;
    type: 'Credit' | 'Debit';
    status: 'Draft' | 'Issued' | 'Cancelled';
    reasonCode: CreditNoteReason;
    reason: string;
    amount: number;
    netAmount: number;
    vatAmount: number;
    vatRate: number;
    issueDate: string;
    businessDate?: string;
    originalInvoiceId: string;
    originalInvoiceNumber?: string | null;
    orderId?: string | null;
    customerId?: string | null;
}

/* Cash book, shifts, expenses and e-invoice types live in `types-operations.ts`
   (200-LOC rule); they are re-exported here so `@/api/accounting` stays the
   single import path. */
export * from './types-operations';
