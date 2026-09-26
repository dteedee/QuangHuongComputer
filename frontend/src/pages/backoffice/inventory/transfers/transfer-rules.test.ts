import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '../../../../constants/permissions';
import type { TransferDetail } from '../../../../api/inventory-transfers';
import { allowedTransferActions } from './transfer-status-meta';
import { transferTimelineSteps } from './transfer-timeline-steps';
import { emptyTransferLine, toCreateTransferRequest, transferFormSchema } from './transfer-schemas';

const all = () => true;
const only = (...granted: string[]) => (p: string) => granted.includes(p);

describe('allowedTransferActions', () => {
    it('Chờ duyệt: người có quyền duyệt thấy Duyệt + Chuyển ngay + Huỷ, không thấy Xuất/Nhận', () => {
        expect(allowedTransferActions('Pending', all)).toEqual(['approve', 'complete', 'cancel']);
    });

    it('nhân viên kho (ManageStock, không Approve) không thấy nút Duyệt', () => {
        const staff = only(PERMISSIONS.INVENTORY_MANAGE_STOCK);
        expect(allowedTransferActions('Pending', staff)).toEqual(['cancel']);
        expect(allowedTransferActions('Approved', staff)).toEqual(['ship', 'cancel']);
        expect(allowedTransferActions('Shipped', staff)).toEqual(['receive']);
    });

    it('đang vận chuyển thì KHÔNG còn Huỷ; đã nhận / đã huỷ thì không còn thao tác nào', () => {
        expect(allowedTransferActions('Shipped', all)).not.toContain('cancel');
        expect(allowedTransferActions('Received', all)).toEqual([]);
        expect(allowedTransferActions('Cancelled', all)).toEqual([]);
    });
});

describe('transferTimelineSteps', () => {
    const base: TransferDetail = {
        id: 't1', transferNumber: 'CK-1', status: 'Shipped', fromWarehouseId: 'a', toWarehouseId: 'b',
        hasDiscrepancy: false, items: [],
        requestedAt: '2026-09-20T01:00:00Z', requestedBy: 'Lan',
        approvedAt: '2026-09-20T02:00:00Z', approvedBy: 'Hưởng',
        shippedAt: '2026-09-20T03:00:00Z', shippedBy: 'Minh',
    };

    it('bước chưa làm hiện "todo", bước đã làm có người thực hiện', () => {
        const steps = transferTimelineSteps(base);
        expect(steps.map((s) => [s.label, s.tone])).toEqual([
            ['Lập phiếu', 'done'], ['Duyệt', 'done'], ['Xuất kho', 'done'], ['Nhận hàng', 'todo'],
        ]);
        expect(steps[2].by).toBe('Minh');
    });

    it('phiếu huỷ kết thúc bằng bước Huỷ, không có Xuất/Nhận', () => {
        const steps = transferTimelineSteps({
            ...base, status: 'Cancelled', shippedAt: null, approvedAt: null, cancelledAt: '2026-09-20T04:00:00Z',
        });
        expect(steps.map((s) => s.label)).toEqual(['Lập phiếu', 'Huỷ phiếu']);
        expect(steps[1].tone).toBe('cancelled');
    });
});

describe('transferFormSchema', () => {
    const line = (over: Partial<ReturnType<typeof emptyTransferLine>> = {}) => ({
        ...emptyTransferLine(), productId: 'p1', productName: 'Laptop', inventoryItemId: 'i1', available: 5, ...over,
    });

    it('hàng serial phải chọn đúng số serial bằng số lượng', () => {
        const result = transferFormSchema.safeParse({
            fromWarehouseId: 'a', toWarehouseId: 'b',
            items: [line({ serialTracked: true, quantity: 2, serialNumbers: ['S1'] })],
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].path).toEqual(['items', 0, 'serialNumbers']);
    });

    it('kho nhận trùng kho xuất, hoặc vượt tồn khả dụng, đều bị chặn', () => {
        const result = transferFormSchema.safeParse({
            fromWarehouseId: 'a', toWarehouseId: 'a', items: [line({ quantity: 9 })],
        });
        const paths = result.error?.issues.map((i) => i.path.join('.'));
        expect(paths).toEqual(expect.arrayContaining(['toWarehouseId', 'items.0.quantity']));
    });

    it('body gửi server chỉ mang serial cho hàng theo dõi serial', () => {
        const body = toCreateTransferRequest({
            fromWarehouseId: 'a', toWarehouseId: 'b', notes: '  ',
            items: [line({ quantity: 1 }), line({ inventoryItemId: 'i2', serialTracked: true, quantity: 1, serialNumbers: ['S9'] })],
        });
        expect(body).toEqual({
            fromWarehouseId: 'a', toWarehouseId: 'b', notes: undefined,
            items: [
                { inventoryItemId: 'i1', quantity: 1, serialNumbers: undefined },
                { inventoryItemId: 'i2', quantity: 1, serialNumbers: ['S9'] },
            ],
        });
    });
});
