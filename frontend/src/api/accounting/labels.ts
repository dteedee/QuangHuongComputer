/**
 * Vietnamese labels + status tones for accounting screens.
 * Tones map onto the UI kit's `StatusBadge` (`createStatusMap`) — colour is
 * never the only channel, every badge carries its own word.
 */
import type {
    AgingBucket, CashVoucherKind, CashVoucherSource, CreditNoteReason,
    ExpenseStatus, InvoiceStatus, InvoiceType, ShiftTransactionSource,
} from './types';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

export const invoiceStatusLabel: Record<InvoiceStatus, { label: string; tone: Tone }> = {
    Draft: { label: 'Nháp', tone: 'neutral' },
    Issued: { label: 'Đã phát hành', tone: 'info' },
    PartiallyPaid: { label: 'Thu một phần', tone: 'warning' },
    Paid: { label: 'Đã thanh toán', tone: 'success' },
    Overdue: { label: 'Quá hạn', tone: 'danger' },
    Cancelled: { label: 'Đã huỷ', tone: 'neutral' },
};

export const invoiceTypeLabel: Record<InvoiceType, string> = {
    Receivable: 'Phải thu',
    Payable: 'Phải trả',
};

export const agingBucketLabel: Record<AgingBucket, { label: string; tone: Tone }> = {
    Current: { label: 'Trong hạn', tone: 'success' },
    Days1To30: { label: '1–30 ngày', tone: 'info' },
    Days31To60: { label: '31–60 ngày', tone: 'warning' },
    Days61To90: { label: '61–90 ngày', tone: 'warning' },
    Over90Days: { label: 'Trên 90 ngày', tone: 'danger' },
};

export const expenseStatusLabel: Record<ExpenseStatus, { label: string; tone: Tone }> = {
    Draft: { label: 'Nháp', tone: 'neutral' },
    Pending: { label: 'Chờ duyệt', tone: 'warning' },
    Approved: { label: 'Đã duyệt', tone: 'info' },
    Rejected: { label: 'Từ chối', tone: 'danger' },
    Paid: { label: 'Đã chi', tone: 'success' },
};

export const creditNoteReasonLabel: Record<CreditNoteReason, string> = {
    OrderCancelled: 'Huỷ đơn hàng',
    Refund: 'Hoàn tiền',
    Return: 'Trả hàng',
    PriceAdjustment: 'Điều chỉnh giá',
    Other: 'Khác',
};

export const cashVoucherKindLabel: Record<CashVoucherKind, { label: string; tone: Tone }> = {
    Receipt: { label: 'Phiếu thu', tone: 'success' },
    Payment: { label: 'Phiếu chi', tone: 'danger' },
};

export const cashVoucherSourceLabel: Record<CashVoucherSource, string> = {
    Manual: 'Lập tay',
    ShiftClose: 'Chốt ca',
    Expense: 'Khoản chi',
    SupplierPayment: 'Trả nhà cung cấp',
    CustomerDeposit: 'Khách đặt cọc',
    InvoiceSettlement: 'Tất toán hoá đơn',
};

export const shiftSourceLabel: Record<ShiftTransactionSource, string> = {
    Manual: 'Ghi tay',
    PosSale: 'Bán tại quầy',
    PosRefund: 'Hoàn tại quầy',
    Deposit: 'Đặt cọc',
    CashDrop: 'Nộp về két',
    ExpensePayout: 'Chi tại quầy',
};

/** `1.234.567 ₫` — VND has no minor unit, so never show decimals. */
export const formatCurrency = (amount: number | null | undefined): string =>
    amount === null || amount === undefined
        ? '—'
        : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

/** `18/09/2026` in Asia/Ho_Chi_Minh, the only business day the back office uses. */
export const formatVnDate = (iso: string | null | undefined): string =>
    !iso ? '—' : new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

export const formatVnDateTime = (iso: string | null | undefined): string =>
    !iso
        ? '—'
        : new Date(iso).toLocaleString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
          });

/** `yyyy-MM-dd` of a Date in VN time — what every period picker sends up. */
export const toVnDateInput = (d: Date): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
