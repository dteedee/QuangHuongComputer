import { describe, expect, it } from 'vitest';
import { intakeFormSchema, parseAccessories, toIntakeInput } from './work-order-intake-schema';

describe('work-order-intake-schema', () => {
    it('tách phụ kiện theo dòng/dấu phẩy, bỏ trùng và rỗng', () => {
        expect(parseAccessories('Sạc\nTúi chống sốc, Sạc ;  \n')).toEqual(['Sạc', 'Túi chống sốc']);
    });

    it('chỉ nhận 4 mức ưu tiên', () => {
        expect(intakeFormSchema.safeParse({ priority: 'Urgent' }).success).toBe(true);
        expect(intakeFormSchema.safeParse({ priority: 'Critical' }).success).toBe(false);
    });

    it('ô trống thành null khi gửi', () => {
        expect(toIntakeInput({ priority: 'High', deviceType: '', accessoriesText: 'Sạc' })).toMatchObject({
            priority: 'High', deviceType: null, deviceBrand: null, accessoriesReceived: ['Sạc'], serviceTypeId: null,
        });
    });
});
