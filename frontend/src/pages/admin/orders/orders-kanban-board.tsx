/**
 * Khung nhìn Kanban — chỉ thả được sang bước hợp lệ (phase spec bước 3). Dùng
 * `isLegalTransition` (bản sao của state machine phía backend) để làm mờ và từ
 * chối đích không hợp lệ ngay ở client; backend vẫn chặn bằng 409 trên
 * `POST .../transitions` bất kể thế nào.
 *
 * design-guidelines §9.1: không hex, không `gray-*`; màu cột lấy từ token
 * nghiệp vụ (`warning`/`info`/`violet`/`success`).
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    DndContext, DragOverlay, useSensors, useSensor, PointerSensor,
    closestCorners, useDraggable, useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { formatDong } from '../../../components/ui';
import type { Order, OrderStatus } from '../../../api/sales/types';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import { isLegalTransition } from './order-state-machine';
import { getPaymentStatusLabel } from './order-status-badges';

/**
 * `Fulfilled` (đóng gói) không phải một cột kanban ở đây — nó không nằm trong
 * union `OrderStatus` dùng chung (xem NOTE trong `api/sales/types.ts`); trạng
 * thái đóng gói hiện ở ngăn chi tiết dưới dạng `FulfillmentStatus`.
 */
interface KanbanStage {
    id: OrderStatus;
    label: string;
    /** Class token cho chấm màu của cột — không dùng mã hex (§9.1). */
    dot: string;
}

const KANBAN_STAGES: KanbanStage[] = [
    { id: 'Pending', label: 'Chờ xác nhận', dot: 'bg-warning' },
    { id: 'Confirmed', label: 'Đã xác nhận', dot: 'bg-info' },
    { id: 'Shipped', label: 'Đang giao', dot: 'bg-violet' },
    { id: 'Delivered', label: 'Đã giao', dot: 'bg-success' },
    { id: 'Completed', label: 'Hoàn tất', dot: 'bg-success' },
];

const DroppableColumn = ({
    stage, activeOrder, children, count,
}: { stage: KanbanStage; activeOrder: Order | null; children: React.ReactNode; count: number }) => {
    const { isOver, setNodeRef } = useDroppable({ id: stage.id });
    const legal = !activeOrder || isLegalTransition(activeOrder.status, stage.id);
    return (
        <div
            ref={setNodeRef}
            className={[
                'flex w-72 shrink-0 flex-col rounded-xl border bg-sunken p-3 transition-colors',
                isOver && legal ? 'border-brand bg-brand-subtle/40'
                    : isOver && !legal ? 'border-danger bg-danger-subtle/40'
                        : 'border-line',
                activeOrder && !legal ? 'opacity-40' : '',
            ].join(' ')}
        >
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2">
                <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} aria-hidden />
                    <h3 className="text-13 font-semibold text-fg">{stage.label}</h3>
                </div>
                <span className="num rounded-sm bg-surface px-1.5 text-2xs font-semibold text-fg-muted">{count}</span>
            </div>
            <div className="flex min-h-[9rem] flex-1 flex-col gap-2 overflow-y-auto pb-1 pr-0.5">{children}</div>
        </div>
    );
};

const DraggableOrderCard = ({ order, onClick }: { order: Order; onClick: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id, data: { order } });
    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 999 : undefined, opacity: isDragging ? 0.3 : 1 }
        : undefined;
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab touch-none active:cursor-grabbing">
            <div
                onClick={onClick}
                className={[
                    'rounded-lg border bg-surface p-3 transition-colors',
                    isDragging ? 'border-brand shadow-lg' : 'border-line hover:border-line-strong',
                ].join(' ')}
            >
                <p className="num text-13 font-medium text-fg">#{order.orderNumber}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{order.customerName || 'Khách vãng lai'}</p>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
                    <span className="text-2xs text-fg-subtle">{getPaymentStatusLabel(order.paymentStatus)}</span>
                    {/* §9.6: mọi con số tiền phải có đơn vị. */}
                    <span className="num text-13 font-semibold text-fg">{formatDong(order.totalAmount)} ₫</span>
                </div>
            </div>
        </div>
    );
};

export const OrdersKanbanBoard = ({
    orders, onSelect, onChanged,
}: { orders: Order[]; onSelect: (o: Order) => void; onChanged: () => void }) => {
    const [localOrders, setLocalOrders] = useState(orders);
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    useEffect(() => setLocalOrders(orders), [orders]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveOrder(null);
        const { active, over } = event;
        if (!over) return;
        const orderId = String(active.id);
        const newStatus = over.id as OrderStatus;
        const current = localOrders.find((o) => o.id === orderId);
        if (!current || current.status === newStatus) return;

        if (!isLegalTransition(current.status, newStatus)) {
            toast.error('Không thể chuyển trực tiếp sang trạng thái này — không hợp lệ với quy trình đơn hàng');
            return;
        }

        setLocalOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        const toastId = toast.loading('Đang cập nhật trạng thái…');
        try {
            await salesAdminOrdersApi.transition(orderId, { to: newStatus });
            toast.success('Đã cập nhật trạng thái!', { id: toastId });
            onChanged();
        } catch (err: any) {
            setLocalOrders(orders);
            toast.error(err?.response?.data?.error || 'Chuyển trạng thái thất bại', { id: toastId });
        }
    };

    return (
        <div className="flex-1 overflow-x-auto pb-3">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={(e: DragStartEvent) => setActiveOrder((e.active.data.current?.order as Order) ?? null)}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-[calc(100vh-24rem)] min-w-max items-start gap-4">
                    {KANBAN_STAGES.map((stage) => {
                        const columnOrders = localOrders.filter((o) => o.status === stage.id);
                        return (
                            <DroppableColumn key={stage.id} stage={stage} activeOrder={activeOrder} count={columnOrders.length}>
                                {columnOrders.map((order) => (
                                    <DraggableOrderCard key={order.id} order={order} onClick={() => onSelect(order)} />
                                ))}
                                {columnOrders.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-xs text-fg-subtle">
                                        Trống
                                    </p>
                                )}
                            </DroppableColumn>
                        );
                    })}
                </div>
                <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                    {activeOrder ? (
                        <div className="pointer-events-none rounded-lg border border-brand bg-surface p-3 shadow-lg">
                            <span className="num text-13 font-medium text-fg">#{activeOrder.orderNumber}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};
