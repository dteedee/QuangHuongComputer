/**
 * Kanban view — drops restricted to legal moves (phase spec step 3). Uses
 * `isLegalTransition` (mirror of the backend state machine) to grey out and
 * refuse illegal targets client-side; the backend still enforces via 409 on
 * `POST .../transitions` regardless.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    DndContext, DragOverlay, useSensors, useSensor, PointerSensor,
    closestCorners, useDraggable, useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { Order, OrderStatus } from '../../../api/sales/types';
import { formatCurrency } from '../../../utils/format';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import { isLegalTransition } from './order-state-machine';

/**
 * `Fulfilled` (đóng gói) is not a kanban column here — it's not in the
 * shared `OrderStatus` union (see the NOTE in `api/sales/types.ts`); packing
 * status is surfaced instead as `FulfillmentStatus` on the detail drawer.
 */
const KANBAN_STAGES: { id: OrderStatus; label: string; color: string }[] = [
    { id: 'Pending', label: 'Chờ xác nhận', color: '#f97316' },
    { id: 'Confirmed', label: 'Đã xác nhận', color: '#3b82f6' },
    { id: 'Shipped', label: 'Đang giao', color: '#a855f7' },
    { id: 'Delivered', label: 'Đã giao', color: '#10b981' },
    { id: 'Completed', label: 'Hoàn tất', color: '#047857' },
];

const DroppableColumn = ({ stage, activeOrder, children, count }: { stage: typeof KANBAN_STAGES[number]; activeOrder: Order | null; children: React.ReactNode; count: number }) => {
    const { isOver, setNodeRef } = useDroppable({ id: stage.id });
    const legal = !activeOrder || isLegalTransition(activeOrder.status, stage.id);
    return (
        <div ref={setNodeRef} className={`w-80 shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex flex-col transition-colors border-2 ${isOver && legal ? 'border-accent/30 bg-accent/5' : isOver && !legal ? 'border-rose-300 bg-rose-50/50' : 'border-transparent'} ${activeOrder && !legal ? 'opacity-40' : ''}`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight text-sm">{stage.label}</h3>
                </div>
                <span className="text-xs px-2 py-0.5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-full font-semibold border border-gray-100 dark:border-gray-700">{count}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[150px] pb-2 pr-1">{children}</div>
        </div>
    );
};

const DraggableOrderCard = ({ order, onClick }: { order: Order; onClick: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id, data: { order } });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 999 : undefined, opacity: isDragging ? 0.3 : 1 } : undefined;
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
            <div className={`bg-white dark:bg-gray-900 rounded-xl p-4 border transition-all ${isDragging ? 'shadow-md ring-2 ring-accent border-transparent' : 'shadow-sm border-gray-100 dark:border-gray-700 hover:shadow-md'}`} onClick={onClick}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">#{order.orderNumber}</span>
                </div>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{order.customerName || 'Khách vãng lai'}</p>
                <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase">{order.paymentStatus === 'Paid' ? 'Đã T.Toán' : 'Chưa T.Toán'}</span>
                    <span className="text-sm font-semibold text-accent italic">{formatCurrency(order.totalAmount)}</span>
                </div>
            </div>
        </div>
    );
};

export const OrdersKanbanBoard = ({ orders, onSelect, onChanged }: { orders: Order[]; onSelect: (o: Order) => void; onChanged: () => void }) => {
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
        <div className="flex-1 overflow-x-auto pb-4">
            <DndContext sensors={sensors} collisionDetection={closestCorners}
                onDragStart={(e: DragStartEvent) => setActiveOrder((e.active.data.current?.order as Order) ?? null)}
                onDragEnd={handleDragEnd}>
                <div className="flex gap-6 min-w-max items-start h-[calc(100vh-380px)]">
                    {KANBAN_STAGES.map((stage) => {
                        const columnOrders = localOrders.filter((o) => o.status === stage.id);
                        return (
                            <DroppableColumn key={stage.id} stage={stage} activeOrder={activeOrder} count={columnOrders.length}>
                                {columnOrders.map((order) => <DraggableOrderCard key={order.id} order={order} onClick={() => onSelect(order)} />)}
                                {columnOrders.length === 0 && <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl"><p className="text-xs font-semibold text-gray-400 uppercase">Trống</p></div>}
                            </DroppableColumn>
                        );
                    })}
                </div>
                <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                    {activeOrder ? (
                        <div className="scale-105 rotate-3 shadow-md opacity-90 pointer-events-none">
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-accent ring-2 ring-accent">
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">#{activeOrder.orderNumber}</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};
