import { describe, expect, it } from 'vitest';
import { formatMinutes, serviceTypeFormSchema, toServiceTypeDto, toServiceTypeFormValues } from './repair-service-type-schema';

describe('repair-service-type-schema', () => {
    const valid = toServiceTypeFormValues(null);

    it('mã chỉ nhận chữ không dấu/số/-/_ và được viết hoa khi gửi', () => {
        expect(serviceTypeFormSchema.safeParse({ ...valid, code: 've_sinh', name: 'Vệ sinh' }).success).toBe(true);
        expect(serviceTypeFormSchema.safeParse({ ...valid, code: 'vệ sinh', name: 'Vệ sinh' }).success).toBe(false);
        expect(toServiceTypeDto({ ...valid, code: ' ve_sinh ', name: ' Vệ sinh ' })).toMatchObject({ code: 'VE_SINH', name: 'Vệ sinh', description: null });
    });

    it('giá gốc phải là số đồng nguyên không âm', () => {
        expect(serviceTypeFormSchema.safeParse({ ...valid, code: 'A', name: 'A', basePrice: 1500.5 }).success).toBe(false);
        expect(serviceTypeFormSchema.safeParse({ ...valid, code: 'A', name: 'A', basePrice: -1 }).success).toBe(false);
    });

    it('hiển thị thời lượng tiếng Việt', () => {
        expect(formatMinutes(90)).toBe('1 giờ 30 phút');
        expect(formatMinutes(45)).toBe('45 phút');
        expect(formatMinutes(0)).toBe('—');
    });
});
