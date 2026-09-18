/**
 * Accounting API barrel (W3-13).
 *
 * The wave-0 file was one 520-line module whose paths had drifted from the
 * backend: `POST /invoices/{id}/payments` (never existed), `einvoice/cancel`
 * and `einvoice/pdf` (deleted by W2-24), no credit notes, no cash book, no
 * shift oversight. Everything below is typed straight from
 * `docs/api-contracts/accounting.md` + `accounting-einvoice.md`; the
 * implementation lives in `api/accounting/*` (200-LOC rule) and this file is
 * the single import path:
 *
 *   import { invoicesApi, shiftsApi, type InvoiceDetail } from '@/api/accounting';
 */
export * from './accounting/types';
export * from './accounting/invoices';
export * from './accounting/ar-ap';
export * from './accounting/cash';
export * from './accounting/expenses';
export * from './accounting/einvoice';
export * from './accounting/reconciliation';
export * from './accounting/labels';
