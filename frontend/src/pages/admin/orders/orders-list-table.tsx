/**
 * Bảng đơn hàng — mã/ngày, khách hàng, kênh, giá trị, trạng thái, thanh toán.
 * Trạng thái tải/rỗng/lỗi do `QueryBoundary` ở trang cha lo; đây chỉ vẽ dữ liệu.
 *
 * design-guidelines §9.3: dùng `DataTable` dùng chung, KHÔNG tự viết thẻ bảng thô.
 * Chữ ký props giữ NGUYÊN vì `OrdersPage.tsx` (track khác) đang gọi.
 *
 * Ghi chú: `DataTable` chưa có móc "đánh dấu một hàng" (ring + cuộn tới) mà
 * luồng `?orderId=` của trang cha cần, nên hàng được tìm qua DOM trong một
 * `useEffect` và gán ngược vào `highlightedRowRef` để trang cha cuộn như cũ.
 */
import { useEffect, useRef } from 'react';
import { Eye, Package, XCircle } from 'lucide-react';
import {
    DataTable, IconButton, RowActions, StatusBadge, formatDong,
    type DataTableColumn,
} from '../../../components/ui';
import type { Order } from '../../../api/sales/types';
import {
    getOrderStatusInfo, getPaymentStatusLabel, getPaymentStatusTone, getChannelLabel,
    NON_CANCELLABLE_STATUSES,
} from './order-status-badges';

interface OrdersListTableProps {
    orders: Order[];
    highlightedOrderId: string | null;
    highlightedRowRef: React.RefObject<HTMLTableRowElement>;
    onSelect: (order: Order) => void;
    onCancel: (order: Order) => void;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const HIGHLIGHT_CLASS = ['ring-2', 'ring-inset', 'ring-brand', 'bg-brand-subtle/50'];

export const OrdersListTable = ({
    orders, highlightedOrderId, highlightedRowRef, onSelect, onCancel,
}: OrdersListTableProps) => {
    const wrapRef = useRef<HTMLDivElement>(null);

    /* Đánh dấu hàng được trỏ tới bằng `?orderId=` và trả node về cho trang cha. */
    useEffect(() => {
        const rows = wrapRef.current?.querySelectorAll<HTMLTableRowElement>('tbody > tr');
        rows?.forEach((tr) => tr.classList.remove(...HIGHLIGHT_CLASS));
        const target = highlightedRowRef as React.MutableRefObject<HTMLTableRowElement | null>;
        const index = orders.findIndex((o) => o.id === highlightedOrderId);
        if (!rows || index < 0 || !rows[index]) {
            target.current = null;
            return;
        }
        rows[index].classList.add(...HIGHLIGHT_CLASS);
        target.current = rows[index];
    }, [orders, highlightedOrderId, highlightedRowRef]);

    const columns: DataTableColumn<Order>[] = [
        {
            id: 'orderNumber', header: 'Đơn hàng', locked: true,
            cell: (o) => (
                <>
                    <span className="num font-medium text-fg">#{o.orderNumber}</span>
                    <p className="text-2xs text-fg-subtle">{formatDate(o.orderDate)}</p>
                </>
            ),
        },
        {
            id: 'customer', header: 'Khách hàng',
            cell: (o) => (
                <>
                    <p className="text-fg">{o.customerName || 'Khách vãng lai'}</p>
                    <p className="num text-2xs text-fg-subtle">{o.customerPhone || '—'}</p>
                </>
            ),
        },
        { id: 'channel', header: 'Kênh', cell: (o) => getChannelLabel(o.channel) },
        {
            id: 'total', header: 'Giá trị', align: 'right',
            /* §9.6: mọi con số tiền phải có đơn vị. */
            cell: (o) => <span className="num font-medium">{formatDong(o.totalAmount)} ₫</span>,
        },
        {
            id: 'status', header: 'Trạng thái', align: 'center',
            cell: (o) => {
                const s = getOrderStatusInfo(o.status);
                return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
            },
        },
        {
            id: 'paymentStatus', header: 'Thanh toán', align: 'center',
            cell: (o) => (
                <StatusBadge tone={getPaymentStatusTone(o.paymentStatus)}>
                    {getPaymentStatusLabel(o.paymentStatus)}
                </StatusBadge>
            ),
        },
        {
            id: 'actions', header: 'Chi tiết', align: 'right', locked: true, width: '1%',
            cell: (o) => (
                <RowActions onClick={(e) => e.stopPropagation()}>
                    {!NON_CANCELLABLE_STATUSES.includes(o.status) && (
                        <IconButton aria-label={`Huỷ đơn #${o.orderNumber}`} size="sm" variant="ghost" onClick={() => onCancel(o)}>
                            <XCircle size={15} />
                        </IconButton>
                    )}
                    <IconButton aria-label={`Xem đơn #${o.orderNumber}`} size="sm" variant="ghost" onClick={() => onSelect(o)}>
                        <Eye size={15} />
                    </IconButton>
                </RowActions>
            ),
        },
    ];

    return (
        <div ref={wrapRef}>
            <DataTable
                caption="Danh sách đơn hàng"
                columns={columns}
                rows={orders}
                rowKey={(o) => o.id}
                onRowClick={onSelect}
                enableColumnVisibility
                empty={{
                    icon: Package,
                    title: 'Chưa có đơn hàng phù hợp bộ lọc',
                    description: 'Thử bỏ bớt điều kiện lọc hoặc chọn khoảng ngày rộng hơn.',
                }}
            />
        </div>
    );
};
