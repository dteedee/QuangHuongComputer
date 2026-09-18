/**
 * Zod schemas for the accounting workspace forms.
 *
 * They live next to the screens (not in `schemas/`) because every one of them
 * mirrors a request body owned by `docs/api-contracts/accounting.md`, which is
 * this track's contract. Each field below matches a documented body field;
 * the server validates independently (form kit §10).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../../../lib/validation/messages';

/** `POST /accounting/invoices` — a manual invoice line (price INCLUDES VAT, D01). */
export const invoiceLineSchema = z.object({
    description: z.string().min(1, msg.requireInput('Diễn giải')).max(500, msg.maxLength('Diễn giải', 500)),
    quantity: z.number().positive('Số lượng phải lớn hơn 0.'),
    unitPriceIncludingVat: z.number().min(0, msg.min('Đơn giá', 0)),
    vatStatutoryRate: z.number().min(0, msg.min('Thuế suất', 0)).max(100, msg.max('Thuế suất', 100)).default(10),
    discount: z.number().min(0, msg.min('Giảm giá', 0)).default(0),
    sku: z.string().max(64).optional(),
    unitName: z.string().max(32).optional(),
});

export const manualInvoiceSchema = z.object({
    buyerLegalName: z.string().max(256).optional(),
    buyerTaxCode: z.string().max(20).optional(),
    buyerAddress: z.string().max(256).optional(),
    buyerEmail: z.string().email(msg.email).optional().or(z.literal('')),
    buyerPhone: z.string().max(20).optional(),
    dueDate: z.string().optional(),
    notes: z.string().max(1000).optional(),
    lines: z.array(invoiceLineSchema).min(1, 'Hoá đơn phải có ít nhất một dòng hàng.'),
});
export type ManualInvoiceFormData = z.infer<typeof manualInvoiceSchema>;

/** `POST /accounting/credit-notes`. */
export const creditNoteSchema = z.object({
    amount: z.number().positive('Số tiền ghi giảm phải lớn hơn 0.'),
    reasonCode: z.enum(['OrderCancelled', 'Refund', 'Return', 'PriceAdjustment', 'Other']),
    reason: z.string().min(1, msg.requireInput('Lý do')).max(500, msg.maxLength('Lý do', 500)),
});
export type CreditNoteFormData = z.infer<typeof creditNoteSchema>;

/** `POST /accounting/invoices/{id}/cancel`. */
export const cancelInvoiceSchema = z.object({
    reason: z.string().min(1, msg.requireInput('Lý do huỷ')).max(500, msg.maxLength('Lý do huỷ', 500)),
});
export type CancelInvoiceFormData = z.infer<typeof cancelInvoiceSchema>;

/** `POST /accounting/ar/{id}/apply-payment`. */
export const applyPaymentSchema = z.object({
    amount: z.number().positive('Số tiền thu phải lớn hơn 0.'),
    notes: z.string().max(500).optional(),
});
export type ApplyPaymentFormData = z.infer<typeof applyPaymentSchema>;

/** `POST /accounting/shifts/open`. */
export const openShiftSchema = z.object({
    warehouseId: z.string().min(1, msg.requireSelect('Kho / cửa hàng')),
    openingBalance: z.number().min(0, msg.min('Tiền đầu ca', 0)),
});
export type OpenShiftFormData = z.infer<typeof openShiftSchema>;

/** `POST /accounting/shifts/{id}/close` — the reason is required when there is a variance. */
export const closeShiftSchema = z.object({
    actualCash: z.number().min(0, msg.min('Tiền đếm được', 0)),
    varianceReason: z.string().max(500).optional(),
});
export type CloseShiftFormData = z.infer<typeof closeShiftSchema>;

/** `POST /accounting/shifts/{id}/transactions`. */
export const shiftTransactionSchema = z.object({
    type: z.enum(['Credit', 'Debit']),
    amount: z.number().positive('Số tiền phải lớn hơn 0.'),
    description: z.string().min(1, msg.requireInput('Diễn giải')).max(300),
    reference: z.string().max(100).optional(),
});
export type ShiftTransactionFormData = z.infer<typeof shiftTransactionSchema>;

/** `POST /accounting/cash-vouchers`. */
export const cashVoucherSchema = z.object({
    kind: z.enum(['Receipt', 'Payment']),
    fundCode: z.string().min(1, msg.requireInput('Mã quỹ')).max(32),
    amount: z.number().positive('Số tiền phải lớn hơn 0.'),
    voucherDate: z.string().optional(),
    description: z.string().min(1, msg.requireInput('Nội dung')).max(300),
    counterpartyName: z.string().max(200).optional(),
});
export type CashVoucherFormData = z.infer<typeof cashVoucherSchema>;

/** `POST /accounting/einvoice/{id}/record-external` (D07). */
export const recordExternalEInvoiceSchema = z.object({
    series: z.string().min(1, msg.requireInput('Ký hiệu')).max(20),
    number: z.string().min(1, msg.requireInput('Số hoá đơn')).max(20),
    lookupCode: z.string().max(40).optional(),
    issuedAt: z.string().optional(),
});
export type RecordExternalEInvoiceFormData = z.infer<typeof recordExternalEInvoiceSchema>;
