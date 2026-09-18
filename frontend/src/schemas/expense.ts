/**
 * Expense schema — mirrors
 * `backend/Services/Accounting/Domain/Expense.cs`'s
 * `Expense.Create(categoryId, description, amount, vatRate, currency,
 * expenseDate, createdBy, supplierId?, employeeId?, notes?, receiptUrl?)`.
 * No FluentValidation validator exists for this DTO — required-ness matches
 * the factory method; length caps are UX-only.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const expenseSchema = z.object({
  categoryId: z.string().min(1, msg.requireSelect('Danh mục chi phí')),
  description: z
    .string()
    .min(1, msg.requireInput('Diễn giải'))
    .max(500, msg.maxLength('Diễn giải', 500)),
  amount: z.number().min(0, msg.min('Số tiền', 0)),
  vatRate: z.number().min(0, msg.min('Thuế suất', 0)).max(100, msg.max('Thuế suất', 100)).default(0),
  expenseDate: z.string().min(1, msg.requireInput('Ngày chi')),
  supplierId: z.string().optional(),
  employeeId: z.string().optional(),
  notes: z.string().max(1000, msg.maxLength('Ghi chú', 1000)).optional(),
  receiptUrl: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

/** `Expense.Reject(rejectedBy, reason)` — mirrors the guard on the backend action. */
export const expenseRejectSchema = z.object({
  reason: z.string().min(1, msg.required('Lý do từ chối')),
});

export type ExpenseRejectFormData = z.infer<typeof expenseRejectSchema>;
