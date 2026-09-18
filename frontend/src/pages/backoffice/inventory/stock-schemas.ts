/**
 * Zod schema for the stock adjust dialog — `PUT /inventory/stock/{id}/adjust`
 * (docs/api-contracts/inventory-stock.md §2). Mirrors the request body 1:1;
 * server still enforces the same rule (empty reason → 400 VALIDATION_FAILED).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../../../lib/validation/messages';

export const stockAdjustSchema = z.object({
    amount: z.number().refine((v) => v !== 0, 'Số lượng điều chỉnh phải khác 0.'),
    reason: z.string().min(3, msg.requireInput('Lý do điều chỉnh')).max(500, msg.maxLength('Lý do', 500)),
});

export type StockAdjustFormData = z.infer<typeof stockAdjustSchema>;
