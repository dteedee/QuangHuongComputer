import { describe, expect, it } from 'vitest';
import { initialLines, repairQuoteFormSchema, toFormPath, toUpsertInput } from './repair-quote-form-schema';

const service = { id: 's1', code: 'VE_SINH', name: 'Vệ sinh laptop', description: null, basePrice: 150000, estimatedMinutes: 45, isOnSite: false };

describe('repair-quote-form-schema', () => {
    it('điền sẵn dịch vụ đã đặt, phí tận nơi và linh kiện đã dùng', () => {
        const lines = initialLines({
            serviceTypeId: 's1', serviceFee: 50000,
            parts: [{ inventoryItemId: null, partName: 'Bản lề', quantity: 2, unitPrice: 350000, serialNumber: 'BL-1' }],
        }, [service]);
        expect(lines.map((l) => [l.kind, l.unitPrice])).toEqual([['Service', 150000], ['Service', 50000], ['Part', 350000]]);
        expect(lines[0].serviceTypeId).toBe('s1');
        expect(lines[2].description).toContain('BL-1');
    });

    it('không có gì để điền thì có một dòng công trống', () => {
        expect(initialLines({}, [])).toHaveLength(1);
    });

    it('từ chối đơn giá lẻ đồng và số lượng 3 chữ số thập phân', () => {
        const base = { lines: [{ kind: 'Labor' as const, description: 'Công', quantity: 1, unitPrice: 1000 }] };
        expect(repairQuoteFormSchema.safeParse(base).success).toBe(true);
        expect(repairQuoteFormSchema.safeParse({ lines: [{ ...base.lines[0], unitPrice: 1000.5 }] }).success).toBe(false);
        expect(repairQuoteFormSchema.safeParse({ lines: [{ ...base.lines[0], quantity: 1.234 }] }).success).toBe(false);
        expect(repairQuoteFormSchema.safeParse({ lines: [] }).success).toBe(false);
    });

    it('toUpsertInput chỉ chép giá trị, không tự cộng tiền', () => {
        const input = toUpsertInput({ lines: [{ kind: 'Part', description: ' RAM ', quantity: 2, unitPrice: 500000 }] });
        expect(input).toEqual({
            lines: [{ kind: 'Part', description: 'RAM', quantity: 2, unitPrice: 500000, lineDiscount: 0,
                inventoryItemId: undefined, productId: undefined, serviceTypeId: undefined }],
            discountAmount: 0, estimatedHours: 0, hourlyRate: 0, description: undefined, notes: undefined,
        });
        expect(input).not.toHaveProperty('totalCost');
    });

    it('đổi đường dẫn lỗi của server sang đường dẫn form', () => {
        expect(toFormPath('lines[2].unitPrice')).toBe('lines.2.unitPrice');
        expect(toFormPath('discountAmount')).toBe('discountAmount');
    });
});
