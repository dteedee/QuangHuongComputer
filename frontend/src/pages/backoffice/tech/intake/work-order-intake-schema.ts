import { z } from 'zod';
import { validationMessages as msg } from '../../../../lib/validation/messages';
import type { UpdateIntakeInput } from '../../../../api/repair/intake';
import type { WorkOrderPriority } from '../../../../api/repair/work-order-priority';

const optionalText = (label: string) => z.string().trim().max(100, msg.maxLength(label, 100)).optional();

export const intakeFormSchema = z.object({
    priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
    deviceType: optionalText('Loại thiết bị'),
    deviceBrand: optionalText('Hãng'),
    deviceModel: optionalText('Model'),
    serialNumber: optionalText('Số serial'),
    /** One accessory per line (or comma-separated) — "Sạc", "Túi chống sốc"... */
    accessoriesText: z.string().max(3000, msg.maxLength('Phụ kiện', 3000)).optional(),
    serviceTypeId: z.string().optional(),
});

export type IntakeFormValues = z.infer<typeof intakeFormSchema>;

export const parseAccessories = (text?: string): string[] =>
    [...new Set((text ?? '').split(/[\n,;]/).map((s) => s.trim()).filter(Boolean))];

export const toIntakeInput = (v: IntakeFormValues): UpdateIntakeInput => ({
    priority: v.priority as WorkOrderPriority,
    deviceType: v.deviceType || null,
    deviceBrand: v.deviceBrand || null,
    deviceModel: v.deviceModel || null,
    serialNumber: v.serialNumber ?? null,
    accessoriesReceived: parseAccessories(v.accessoriesText),
    serviceTypeId: v.serviceTypeId || null,
});

export const intakeDefaults = (wo: {
    priority?: WorkOrderPriority; deviceType?: string | null; deviceBrand?: string | null; deviceModel?: string;
    serialNumber?: string; accessoriesReceived?: string[]; serviceTypeId?: string | null;
}): IntakeFormValues => ({
    priority: wo.priority ?? 'Normal',
    deviceType: wo.deviceType ?? '',
    deviceBrand: wo.deviceBrand ?? '',
    deviceModel: wo.deviceModel ?? '',
    serialNumber: wo.serialNumber ?? '',
    accessoriesText: (wo.accessoriesReceived ?? []).join('\n'),
    serviceTypeId: wo.serviceTypeId ?? '',
});
