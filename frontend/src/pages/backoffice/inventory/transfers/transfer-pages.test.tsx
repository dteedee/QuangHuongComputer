import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TransferDetail, TransferListRow } from '../../../../api/inventory-transfers';
import { PERMISSIONS } from '../../../../constants/permissions';

const api = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), receive: vi.fn(), approve: vi.fn(), ship: vi.fn(), cancel: vi.fn(), complete: vi.fn(), create: vi.fn() }));
const granted = vi.hoisted(() => ({ list: [] as string[] }));

vi.mock('../../../../api/inventory-transfers', async (importActual) => ({
    ...(await importActual<typeof import('../../../../api/inventory-transfers')>()),
    inventoryTransfersApi: api,
}));
vi.mock('../../../../api/inventory', async (importActual) => ({
    ...(await importActual<typeof import('../../../../api/inventory')>()),
    inventoryApi: { warehouses: { getDropdown: vi.fn().mockResolvedValue([{ id: 'w1', code: 'KHO', name: 'Kho chính', type: 'Main', isDefault: true }]) } },
}));
vi.mock('../../../../hooks/usePermissions', () => ({
    usePermissions: () => ({ hasPermission: (p: string) => granted.list.includes(p) }),
    useCan: (p: string) => granted.list.includes(p),
}));

import TransferListPage from './transfer-list-page';
import TransferDetailPage from './transfer-detail-page';

function renderAt(url: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path="/backoffice/inventory/transfers" element={<TransferListPage />} />
                    <Route path="/backoffice/inventory/transfers/:id" element={<TransferDetailPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

const row: TransferListRow = {
    id: 't1', transferNumber: 'CK-2026-001', fromWarehouseId: 'w1', fromWarehouse: 'Kho chính',
    toWarehouseId: 'w2', toWarehouse: 'Chi nhánh Vĩnh Bảo', status: 'Received', requestedAt: '2026-09-20T01:00:00Z',
    itemCount: 1, totalQuantity: 2, hasDiscrepancy: true,
};

const shipped: TransferDetail = {
    id: 't1', transferNumber: 'CK-2026-001', status: 'Shipped', fromWarehouseId: 'w1', fromWarehouse: 'Kho chính',
    toWarehouseId: 'w2', toWarehouse: 'Chi nhánh', hasDiscrepancy: false,
    requestedAt: '2026-09-20T01:00:00Z', approvedAt: '2026-09-20T02:00:00Z', shippedAt: '2026-09-20T03:00:00Z',
    items: [{ id: 'l1', inventoryItemId: 'i1', productName: 'Laptop A', productSku: 'LA', quantity: 2, shortage: 0, serialNumbers: ['SN-1', 'SN-2'] }],
};

beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    granted.list = [PERMISSIONS.INVENTORY_VIEW_STOCK, PERMISSIONS.INVENTORY_MANAGE_STOCK];
});

describe('TransferListPage', () => {
    it('hiện phiếu kèm cờ nhận thiếu; lọc trạng thái gửi đúng status lên server', async () => {
        api.list.mockResolvedValue({ items: [row], total: 1, page: 1, pageSize: 20 });
        renderAt('/backoffice/inventory/transfers');

        const link = await screen.findByRole('link', { name: 'CK-2026-001' });
        expect(link).toHaveAttribute('href', '/backoffice/inventory/transfers/t1');
        expect(screen.getByText('Nhận thiếu')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Tạo phiếu chuyển/ })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'Đang vận chuyển' }));
        await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Shipped', page: 1 })));
    });

    it('không có quyền ManageStock thì không thấy nút tạo phiếu', async () => {
        granted.list = [PERMISSIONS.INVENTORY_VIEW_STOCK];
        api.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
        renderAt('/backoffice/inventory/transfers');

        expect(await screen.findByText('Chưa có phiếu chuyển kho nào')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Tạo phiếu chuyển/ })).not.toBeInTheDocument();
    });
});

describe('TransferDetailPage', () => {
    it('phiếu chờ duyệt: nhân viên kho không thấy nút Duyệt, vẫn huỷ được', async () => {
        api.get.mockResolvedValue({ ...shipped, status: 'Pending', approvedAt: null, shippedAt: null });
        renderAt('/backoffice/inventory/transfers/t1');

        expect(await screen.findByRole('button', { name: 'Huỷ phiếu' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Duyệt phiếu' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /In phiếu/ })).toHaveAttribute('href', '/backoffice/inventory/transfers/t1/print');
    });

    it('nhận thiếu một serial: bắt buộc ghi lý do, rồi gửi đúng serial đã nhận', async () => {
        api.get.mockResolvedValue(shipped);
        api.receive.mockResolvedValue({ message: 'Đã nhận hàng (có chênh lệch)', status: 'Received', hasDiscrepancy: true });
        renderAt('/backoffice/inventory/transfers/t1');

        await userEvent.click(await screen.findByRole('button', { name: 'Nhận hàng' }));
        const dialog = await screen.findByRole('dialog');
        await userEvent.click(within(dialog).getByRole('checkbox', { name: 'SN-2' }));

        const confirm = within(dialog).getByRole('button', { name: 'Xác nhận nhận thiếu' });
        expect(confirm).toBeDisabled();
        await userEvent.type(within(dialog).getByRole('textbox'), 'Thiếu 1 máy');
        await userEvent.click(confirm);

        await waitFor(() => expect(api.receive).toHaveBeenCalledWith('t1', {
            note: 'Thiếu 1 máy',
            lines: [{ itemId: 'l1', receivedQuantity: 1, receivedSerials: ['SN-1'] }],
        }));
    });
});
