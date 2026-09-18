/**
 * Sổ quỹ / ca thu ngân / chi phí / hoá đơn điện tử — phần thứ hai của DTO kế toán.
 * Tách khỏi `types.ts` để giữ mỗi tệp dưới 200 dòng; import qua `@/api/accounting`.
 * Nguồn: `docs/api-contracts/accounting.md` §5-§7 và `accounting-einvoice.md`.
 */

export type CashVoucherKind = 'Receipt' | 'Payment';
export type CashVoucherSource =
    | 'Manual' | 'ShiftClose' | 'Expense' | 'SupplierPayment' | 'CustomerDeposit' | 'InvoiceSettlement';

export interface CashVoucher {
    id: string;
    voucherNumber: string;
    kind: CashVoucherKind;
    fundCode: string;
    amount: number;
    signedAmount: number;
    voucherDate: string;
    businessDate?: string;
    description: string;
    counterpartyName?: string | null;
    source: CashVoucherSource;
    shiftSessionId?: string | null;
    expenseId?: string | null;
    invoiceId?: string | null;
    orderId?: string | null;
}

export interface CashBookEntry {
    voucher: CashVoucher;
    runningBalance: number;
}

export interface CashBook {
    fundCode: string;
    from: string;
    to: string;
    openingBalance: number;
    totalIn: number;
    totalOut: number;
    closingBalance: number;
    entries: CashBookEntry[];
}

export type ShiftTransactionType = 'Debit' | 'Credit';
export type ShiftTransactionSource =
    | 'Manual' | 'PosSale' | 'PosRefund' | 'Deposit' | 'CashDrop' | 'ExpensePayout';

export interface ShiftTransaction {
    id: string;
    description: string;
    amount: number;
    type: ShiftTransactionType;
    source: ShiftTransactionSource;
    timestamp: string;
    reference?: string | null;
}

export interface ShiftSession {
    id: string;
    cashierId: string;
    warehouseId: string;
    openedAt: string;
    closedAt?: string | null;
    openingBalance: number;
    closingBalance?: number | null;
    status: 'Open' | 'Closed';
    cashIn: number;
    cashOut: number;
    expectedCash: number;
    variance: number;
    varianceReason?: string | null;
    varianceApprovedBy?: string | null;
    varianceApprovedAt?: string | null;
    duration?: string | null;
    transactions?: ShiftTransaction[];
}

export type ExpenseStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Paid';

export interface ExpenseCategory {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    isActive: boolean;
}

export interface Expense {
    id: string;
    expenseNumber: string;
    categoryId: string;
    categoryName?: string | null;
    description: string;
    amount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
    expenseDate: string;
    status: ExpenseStatus;
    supplierId?: string | null;
    employeeId?: string | null;
    notes?: string | null;
    receiptUrl?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    paidAt?: string | null;
    paymentMethod?: string | null;
}

export interface ExpenseSummary {
    totalAmount: number;
    totalCount: number;
    pendingAmount?: number;
    paidAmount?: number;
    byCategory: { categoryId: string; categoryName: string; total: number; count: number }[];
}

export type EInvoiceMode = 'External' | 'Sandbox' | 'Live' | 'Off';

export interface EInvoiceModeInfo {
    mode: EInvoiceMode;
    provider: string;
    isSandbox: boolean;
    kind: string;
    issueTrigger: string;
    series: string;
    queueWarningDays: number;
    notice: string;
}

export interface EInvoiceQueueItem {
    invoiceId: string;
    invoiceNumber: string;
    orderId?: string | null;
    orderNumber?: string | null;
    issueDate: string;
    totalAmount: number;
    totalNet: number;
    totalVat: number;
    buyerName: string;
    buyerTaxCode?: string | null;
    buyerAddress?: string | null;
    isConsumer: boolean;
    eInvoiceStatus: string;
    ageDays: number;
    isLate: boolean;
}

export interface EInvoiceResult {
    invoiceId: string;
    invoiceNumber: string;
    status: string;
    provider: string;
    isSandbox: boolean;
    series?: string | null;
    number?: string | null;
    lookupCode?: string | null;
    issuedAt?: string | null;
    notice?: string | null;
}
