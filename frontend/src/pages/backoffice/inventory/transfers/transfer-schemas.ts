/**
 * Zod schema for "Tạo phiếu chuyển kho" — mirrors `CreateTransferDtoValidator` + the server-side
 * checks in `TransferCreation.cs` that the UI can know in advance (available quantity, serial count
 * for serial-tracked categories). The server stays the authority; this only saves a round trip.
 */
import { z } from 'zod';

export const transferLineSchema = z.object({
    /** Stable React key for the field array row. */
    key: z.string(),
    productId: z.string().min(1, 'Chọn sản phẩm'),
    productName: z.string(),
    inventoryItemId: z.string().min(1, 'Chọn dòng tồn ở kho xuất'),
    available: z.number(),
    serialTracked: z.boolean(),
    quantity: z.number({ invalid_type_error: 'Nhập số lượng' }).int('Số lượng phải là số nguyên').min(1, 'Số lượng tối thiểu là 1'),
    serialNumbers: z.array(z.string()),
}).superRefine((line, ctx) => {
    if (line.inventoryItemId && line.quantity > line.available) {
        ctx.addIssue({ code: 'custom', path: ['quantity'], message: `Chỉ còn ${line.available} khả dụng ở kho xuất` });
    }
    if (line.serialTracked && line.serialNumbers.length !== line.quantity) {
        ctx.addIssue({
            code: 'custom', path: ['serialNumbers'],
            message: `Hàng theo dõi serial: chọn đúng ${line.quantity} serial (đang chọn ${line.serialNumbers.length})`,
        });
    }
});

export const transferFormSchema = z.object({
    fromWarehouseId: z.string().min(1, 'Chọn kho xuất'),
    toWarehouseId: z.string().min(1, 'Chọn kho nhận'),
    notes: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional(),
    items: z.array(transferLineSchema).min(1, 'Thêm ít nhất một mặt hàng'),
}).superRefine((form, ctx) => {
    if (form.fromWarehouseId && form.fromWarehouseId === form.toWarehouseId) {
        ctx.addIssue({ code: 'custom', path: ['toWarehouseId'], message: 'Kho nhận phải khác kho xuất' });
    }
    const seen = new Set<string>();
    form.items.forEach((line, i) => {
        if (!line.inventoryItemId) return;
        if (seen.has(line.inventoryItemId)) {
            ctx.addIssue({ code: 'custom', path: ['items', i, 'productId'], message: 'Mặt hàng này đã có ở dòng khác' });
        }
        seen.add(line.inventoryItemId);
    });
});

export type TransferFormData = z.infer<typeof transferFormSchema>;
export type TransferLineFormData = z.infer<typeof transferLineSchema>;

let keySeq = 0;
export const emptyTransferLine = (): TransferLineFormData => ({
    key: `line-${++keySeq}`,
    productId: '',
    productName: '',
    inventoryItemId: '',
    available: 0,
    serialTracked: false,
    quantity: 1,
    serialNumbers: [],
});

/** Form → `POST /inventory/transfers` body (server snapshots names/SKU itself). */
export function toCreateTransferRequest(form: TransferFormData) {
    return {
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        notes: form.notes?.trim() || undefined,
        items: form.items.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantity: l.quantity,
            serialNumbers: l.serialTracked ? l.serialNumbers : undefined,
        })),
    };
}
