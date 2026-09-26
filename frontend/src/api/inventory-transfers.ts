/**
 * Chuyển kho — `/api/inventory/transfers` (TransferEndpoints.cs).
 *
 * Luồng: Chờ duyệt → (duyệt: Inventory.Approve) → Đã duyệt → (xuất: ManageStock) → Đang vận chuyển
 * → (nhận: ManageStock, có thể nhận thiếu + ghi chú) → Đã nhận. Huỷ chỉ khi chưa xuất.
 * `complete` (Inventory.Approve) = duyệt + xuất + nhận đủ trong một transaction (D09).
 *
 * Hàng theo dõi serial (danh mục bật IsSerialTracked) BẮT BUỘC gửi `serialNumbers` đúng bằng số lượng.
 */
import client from './client';
import type { PagedResult } from './inventory';

export type TransferStatus = 'Pending' | 'Approved' | 'Shipped' | 'Received' | 'Cancelled';

export const TRANSFER_STATUSES: TransferStatus[] = ['Pending', 'Approved', 'Shipped', 'Received', 'Cancelled'];

export const transferStatusLabels: Record<TransferStatus, string> = {
    Pending: 'Chờ duyệt',
    Approved: 'Đã duyệt',
    Shipped: 'Đang vận chuyển',
    Received: 'Đã nhận',
    Cancelled: 'Đã huỷ',
};

export interface TransferListRow {
    id: string;
    transferNumber: string;
    fromWarehouseId: string;
    fromWarehouse?: string;
    toWarehouseId: string;
    toWarehouse?: string;
    status: TransferStatus;
    requestedAt: string;
    approvedAt?: string | null;
    shippedAt?: string | null;
    receivedAt?: string | null;
    cancelledAt?: string | null;
    notes?: string | null;
    itemCount: number;
    totalQuantity: number;
    hasDiscrepancy: boolean;
}

export interface TransferLine {
    id: string;
    inventoryItemId: string;
    productId?: string | null;
    variantId?: string | null;
    productName?: string | null;
    productSku?: string | null;
    quantity: number;
    receivedQuantity?: number | null;
    shortage: number;
    serialNumbers: string[];
}

export interface TransferDetail {
    id: string;
    transferNumber: string;
    status: TransferStatus;
    fromWarehouseId: string;
    fromWarehouse?: string;
    toWarehouseId: string;
    toWarehouse?: string;
    notes?: string | null;
    receiveNote?: string | null;
    hasDiscrepancy: boolean;
    requestedAt?: string | null; requestedBy?: string | null;
    approvedAt?: string | null; approvedBy?: string | null;
    shippedAt?: string | null; shippedBy?: string | null;
    receivedAt?: string | null; receivedBy?: string | null;
    cancelledAt?: string | null; cancelledBy?: string | null;
    items: TransferLine[];
}

export interface CreateTransferLine {
    inventoryItemId: string;
    quantity: number;
    serialNumbers?: string[];
}

export interface CreateTransferRequest {
    fromWarehouseId: string;
    toWarehouseId: string;
    items: CreateTransferLine[];
    notes?: string;
}

export interface ReceiveTransferRequest {
    lines?: { itemId: string; receivedQuantity: number; receivedSerials?: string[] }[];
    note?: string;
}

export interface TransferListQuery {
    page?: number;
    pageSize?: number;
    status?: TransferStatus;
    warehouseId?: string;
    search?: string;
}

type ActionResult = { message: string; status: TransferStatus };

export const inventoryTransfersApi = {
    list: async (params: TransferListQuery = {}): Promise<PagedResult<TransferListRow>> =>
        (await client.get<PagedResult<TransferListRow>>('/inventory/transfers', { params })).data,
    get: async (id: string): Promise<TransferDetail> =>
        (await client.get<TransferDetail>(`/inventory/transfers/${id}`)).data,
    create: async (body: CreateTransferRequest): Promise<{ id: string; transferNumber: string; status: TransferStatus }> =>
        (await client.post('/inventory/transfers', body)).data,
    approve: async (id: string): Promise<ActionResult> =>
        (await client.put(`/inventory/transfers/${id}/approve`)).data,
    ship: async (id: string): Promise<ActionResult & { shippedSerials: string[] }> =>
        (await client.put(`/inventory/transfers/${id}/ship`)).data,
    receive: async (id: string, body: ReceiveTransferRequest = {}): Promise<ActionResult & { hasDiscrepancy: boolean }> =>
        (await client.put(`/inventory/transfers/${id}/receive`, body)).data,
    complete: async (id: string): Promise<ActionResult & { movedSerials: string[] }> =>
        (await client.post(`/inventory/transfers/${id}/complete`)).data,
    cancel: async (id: string): Promise<ActionResult> =>
        (await client.put(`/inventory/transfers/${id}/cancel`)).data,
};
