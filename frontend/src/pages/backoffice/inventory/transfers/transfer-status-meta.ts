/**
 * Status badge + "which buttons may this user press now" for a stock transfer. Pure functions so
 * the rules are unit-tested once instead of being re-derived in JSX.
 *
 * Mirrors TransferEndpoints.cs policies: approve/complete need `Inventory.Approve`, ship/receive/
 * cancel need `Inventory.ManageStock`. Cancel only before the goods leave (the server returns 409
 * afterwards — the old build let a shipped transfer be cancelled and the stock vanished).
 */
import { createStatusMap } from '../../../../components/ui';
import { PERMISSIONS } from '../../../../constants/permissions';
import type { TransferStatus } from '../../../../api/inventory-transfers';

export const transferStatusBadge = createStatusMap<TransferStatus>({
    Pending: ['warning', 'Chờ duyệt'],
    Approved: ['info', 'Đã duyệt'],
    Shipped: ['violet', 'Đang vận chuyển'],
    Received: ['success', 'Đã nhận'],
    Cancelled: ['neutral', 'Đã huỷ'],
});

export type TransferAction = 'approve' | 'ship' | 'receive' | 'complete' | 'cancel';

const RULES: Record<TransferAction, { from: TransferStatus[]; permission: string }> = {
    approve: { from: ['Pending'], permission: PERMISSIONS.INVENTORY_APPROVE },
    complete: { from: ['Pending', 'Approved'], permission: PERMISSIONS.INVENTORY_APPROVE },
    ship: { from: ['Approved'], permission: PERMISSIONS.INVENTORY_MANAGE_STOCK },
    receive: { from: ['Shipped'], permission: PERMISSIONS.INVENTORY_MANAGE_STOCK },
    cancel: { from: ['Pending', 'Approved'], permission: PERMISSIONS.INVENTORY_MANAGE_STOCK },
};

/** Actions available for `status`, in the order the buttons are shown (primary first). */
export function allowedTransferActions(
    status: TransferStatus, hasPermission: (permission: string) => boolean,
): TransferAction[] {
    const order: TransferAction[] = ['approve', 'ship', 'receive', 'complete', 'cancel'];
    return order.filter((a) => RULES[a].from.includes(status) && hasPermission(RULES[a].permission));
}

export const transferActionLabels: Record<TransferAction, string> = {
    approve: 'Duyệt phiếu',
    ship: 'Xuất kho',
    receive: 'Nhận hàng',
    complete: 'Chuyển ngay (duyệt + xuất + nhận)',
    cancel: 'Huỷ phiếu',
};

/** Confirmation copy — each of these moves real stock or closes the document. */
export const transferActionConfirm: Record<Exclude<TransferAction, 'receive'>, string> = {
    approve: 'Duyệt phiếu này? Sau khi duyệt, kho xuất có thể xuất hàng.',
    ship: 'Xuất kho? Tồn kho xuất bị trừ ngay, serial chuyển sang "Đang chuyển kho" và không bán được cho tới khi kho nhận xác nhận.',
    complete: 'Chuyển ngay? Duyệt, xuất và nhận ĐỦ hàng trong một bước — chỉ dùng khi hai kho ở cùng nơi.',
    cancel: 'Huỷ phiếu chuyển kho? Không thể hoàn tác.',
};
