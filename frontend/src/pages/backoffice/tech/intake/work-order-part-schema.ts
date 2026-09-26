import { z } from 'zod';
import { validationMessages as msg } from '../../../../lib/validation/messages';

const dong = (label: string) =>
    z.number({ invalid_type_error: msg.requireInput(label) }).int(`${label} phải là số đồng nguyên`).min(0, msg.min(label, 0));

/**
 * Add-part form. `stock` = picked from inventory (server reserves stock);
 * `boughtIn` = bought from outside for this repair: no inventory item, cost
 * price required, never touches the stock ledger.
 */
export const addPartSchema = z.object({
    source: z.enum(['stock', 'boughtIn']),
    inventoryItemId: z.string().optional(),
    partName: z.string().trim().min(1, msg.requireInput('Tên linh kiện')).max(300, msg.maxLength('Tên linh kiện', 300)),
    partNumber: z.string().max(100, msg.maxLength('Mã linh kiện', 100)).optional(),
    serialNumber: z.string().max(100, msg.maxLength('Số serial', 100)).optional(),
    quantity: z.number({ invalid_type_error: msg.requireInput('Số lượng') }).int('Số lượng phải là số nguyên').min(1, msg.min('Số lượng', 1)),
    unitPrice: dong('Đơn giá bán'),
    unitCost: dong('Giá vốn').optional(),
}).superRefine((v, ctx) => {
    if (v.source === 'stock' && !v.inventoryItemId)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['inventoryItemId'], message: 'Chọn linh kiện trong kho' });
    if (v.source === 'boughtIn' && v.unitCost === undefined)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['unitCost'], message: 'Linh kiện mua ngoài phải có giá vốn' });
});

export type AddPartValues = z.infer<typeof addPartSchema>;

export const addPartDefaults: AddPartValues = { source: 'stock', partName: '', quantity: 1, unitPrice: 0 };

export const toAddPartInput = (v: AddPartValues) => ({
    inventoryItemId: v.source === 'stock' ? v.inventoryItemId : null,
    partName: v.partName.trim(),
    partNumber: v.partNumber?.trim() || undefined,
    serialNumber: v.serialNumber?.trim() || undefined,
    quantity: v.quantity,
    unitPrice: v.unitPrice,
    unitCost: v.source === 'boughtIn' ? v.unitCost : undefined,
});
