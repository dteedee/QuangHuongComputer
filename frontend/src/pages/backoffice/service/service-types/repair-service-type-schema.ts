/** Form schema for the repair service catalog (mirrors `RepairServiceType.Update` server rules — UX only). */
import { z } from 'zod';
import { validationMessages as msg } from '../../../../lib/validation/messages';
import type { RepairServiceType, RepairServiceTypeWriteDto } from '../../../../api/repair/service-types';

export const serviceTypeFormSchema = z.object({
    code: z.string().trim().min(1, msg.requireInput('Mã dịch vụ')).max(40, msg.maxLength('Mã dịch vụ', 40))
        .regex(/^[A-Za-z0-9_-]+$/, 'Mã chỉ gồm chữ không dấu, số, "-" hoặc "_"'),
    name: z.string().trim().min(1, msg.requireInput('Tên dịch vụ')).max(150, msg.maxLength('Tên dịch vụ', 150)),
    description: z.string().max(1000, msg.maxLength('Mô tả', 1000)).optional(),
    basePrice: z.number({ invalid_type_error: msg.requireInput('Giá gốc') }).int('Giá gốc phải là số đồng nguyên').min(0, msg.min('Giá gốc', 0)),
    estimatedMinutes: z.number({ invalid_type_error: msg.requireInput('Thời gian ước tính') }).int().min(0, msg.min('Thời gian ước tính', 0)).max(43200, msg.max('Thời gian ước tính', 43200)),
    isOnSite: z.boolean(),
    sortOrder: z.number({ invalid_type_error: msg.requireInput('Thứ tự') }).int(),
    isActive: z.boolean(),
});

export type ServiceTypeFormValues = z.infer<typeof serviceTypeFormSchema>;

export const toServiceTypeFormValues = (s: RepairServiceType | null): ServiceTypeFormValues => ({
    code: s?.code ?? '',
    name: s?.name ?? '',
    description: s?.description ?? '',
    basePrice: s?.basePrice ?? 0,
    estimatedMinutes: s?.estimatedMinutes ?? 60,
    isOnSite: s?.isOnSite ?? false,
    sortOrder: s?.sortOrder ?? 100,
    isActive: s?.isActive ?? true,
});

export const toServiceTypeDto = (v: ServiceTypeFormValues): RepairServiceTypeWriteDto => ({
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    description: v.description?.trim() || null,
    basePrice: v.basePrice,
    estimatedMinutes: v.estimatedMinutes,
    isOnSite: v.isOnSite,
    sortOrder: v.sortOrder,
    isActive: v.isActive,
});

/** "1 giờ 30 phút" */
export function formatMinutes(total: number): string {
    if (total <= 0) return '—';
    const h = Math.floor(total / 60);
    const m = total % 60;
    return [h > 0 ? `${h} giờ` : '', m > 0 ? `${m} phút` : ''].filter(Boolean).join(' ');
}
