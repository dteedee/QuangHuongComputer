/**
 * Quote editor form: zod schema + mapping to/from the API. Only field
 * validation and copying values happen here — totals, discount allocation and
 * VAT are computed by the server (`quote/preview`, then the saved quote).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../../../../lib/validation/messages';
import type { RepairQuote, RepairQuoteLineKind, UpsertRepairQuoteInput } from '../../../../api/repair/quote-types';
import type { PublicRepairServiceType } from '../../../../api/repair/service-types';

const wholeDong = (label: string) =>
    z.number({ invalid_type_error: msg.requireInput(label) }).int(`${label} phải là số đồng nguyên`).min(0, msg.min(label, 0));

export const quoteLineSchema = z.object({
    kind: z.enum(['Part', 'Labor', 'Service', 'Other']),
    description: z.string().trim().min(1, msg.requireInput('Nội dung')).max(500, msg.maxLength('Nội dung', 500)),
    quantity: z.number({ invalid_type_error: msg.requireInput('Số lượng') })
        .positive('Số lượng phải lớn hơn 0')
        .max(10000, msg.max('Số lượng', 10000))
        .refine((q) => Math.round(q * 100) === q * 100, 'Tối đa 2 chữ số thập phân'),
    unitPrice: wholeDong('Đơn giá'),
    lineDiscount: wholeDong('Giảm giá').optional(),
    inventoryItemId: z.string().optional(),
    productId: z.string().optional(),
    serviceTypeId: z.string().optional(),
});

export const repairQuoteFormSchema = z.object({
    lines: z.array(quoteLineSchema).min(1, 'Báo giá phải có ít nhất một dòng').max(100, 'Tối đa 100 dòng'),
    discountAmount: wholeDong('Giảm giá cả phiếu').optional(),
    estimatedHours: z.number().min(0, msg.min('Số giờ', 0)).optional(),
    hourlyRate: wholeDong('Đơn giá giờ công').optional(),
    description: z.string().max(1000, msg.maxLength('Mô tả', 1000)).optional(),
    notes: z.string().max(1000, msg.maxLength('Ghi chú', 1000)).optional(),
});

export type RepairQuoteFormValues = z.infer<typeof repairQuoteFormSchema>;
export type RepairQuoteLineValues = z.infer<typeof quoteLineSchema>;

export const KIND_OPTIONS: { value: RepairQuoteLineKind; label: string }[] = [
    { value: 'Part', label: 'Linh kiện' },
    { value: 'Labor', label: 'Công sửa' },
    { value: 'Service', label: 'Dịch vụ' },
    { value: 'Other', label: 'Khác' },
];

export const emptyLine = (kind: RepairQuoteLineKind = 'Labor'): RepairQuoteLineValues =>
    ({ kind, description: '', quantity: 1, unitPrice: 0, lineDiscount: 0 });

export const serviceLine = (s: Pick<PublicRepairServiceType, 'id' | 'name' | 'basePrice'>): RepairQuoteLineValues =>
    ({ kind: 'Service', description: s.name, quantity: 1, unitPrice: s.basePrice, lineDiscount: 0, serviceTypeId: s.id });

interface WorkOrderLike {
    serviceFee?: number | null;
    serviceTypeId?: string | null;
    parts?: Array<{ inventoryItemId?: string | null; partName: string; quantity: number; unitPrice: number; serialNumber?: string | null }>;
}

/**
 * Starting lines for a NEW quote: the booked service (catalog price), the
 * configured on-site fee already on the work order, and every part used so
 * far. Values are copied as-is from the server; the technician edits freely.
 */
export function initialLines(workOrder: WorkOrderLike, services: PublicRepairServiceType[]): RepairQuoteLineValues[] {
    const lines: RepairQuoteLineValues[] = [];
    const booked = services.find((s) => s.id === workOrder.serviceTypeId);
    if (booked && booked.basePrice > 0) lines.push(serviceLine(booked));
    if ((workOrder.serviceFee ?? 0) > 0)
        lines.push({ kind: 'Service', description: 'Phí dịch vụ tận nơi', quantity: 1, unitPrice: workOrder.serviceFee!, lineDiscount: 0 });
    for (const p of workOrder.parts ?? []) {
        lines.push({
            kind: 'Part',
            description: p.serialNumber ? `${p.partName} (S/N ${p.serialNumber})` : p.partName,
            quantity: p.quantity, unitPrice: p.unitPrice, lineDiscount: 0,
            inventoryItemId: p.inventoryItemId ?? undefined,
        });
    }
    return lines.length > 0 ? lines : [emptyLine('Labor')];
}

export const valuesFromQuote = (q: RepairQuote): RepairQuoteFormValues => ({
    lines: q.lines.map((l) => ({
        kind: l.kind, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
        lineDiscount: l.lineDiscount, inventoryItemId: l.inventoryItemId ?? undefined,
        productId: l.productId ?? undefined, serviceTypeId: l.serviceTypeId ?? undefined,
    })),
    discountAmount: q.discountAmount,
    estimatedHours: q.estimatedHours,
    hourlyRate: q.hourlyRate,
    description: q.description ?? '',
    notes: q.notes ?? '',
});

export const toUpsertInput = (v: RepairQuoteFormValues): UpsertRepairQuoteInput => ({
    lines: v.lines.map((l) => ({
        kind: l.kind, description: l.description.trim(), quantity: l.quantity, unitPrice: l.unitPrice,
        lineDiscount: l.lineDiscount ?? 0, inventoryItemId: l.inventoryItemId, productId: l.productId,
        serviceTypeId: l.serviceTypeId,
    })),
    discountAmount: v.discountAmount ?? 0,
    estimatedHours: v.estimatedHours ?? 0,
    hourlyRate: v.hourlyRate ?? 0,
    description: v.description?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
});

/** Server field paths use `lines[0].unitPrice`; react-hook-form uses `lines.0.unitPrice`. */
export const toFormPath = (serverField: string) => serverField.replace(/\[(\d+)\]/g, '.$1');
