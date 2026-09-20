/**
 * Ngăn chi tiết đơn hàng (phase spec bước 2): khách hàng, hàng hoá kèm VAT +
 * giảm giá phân bổ theo dòng (D01, khớp với hoá đơn in), thu tiền, vận chuyển,
 * lịch sử, ghi chú nội bộ, thông tin hoá đơn (D07), nút in.
 *
 * design-guidelines §9.3: overlay lấy từ `components/ui` (`Drawer`), không tự
 * dựng scrim/motion. Chữ ký props giữ NGUYÊN vì `OrdersPage.tsx` đang gọi.
 */
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Drawer, QueryBoundary, Skeleton, StatusBadge, buttonVariants } from '../../../components/ui';
import { useOrderDetailQuery, useOrderTransitionsQuery } from './use-order-actions';
import { getOrderStatusInfo, getChannelLabel } from './order-status-badges';
import { OrderActionBar } from './order-action-bar';
import { OrderTimeline } from './order-timeline';
import { OrderInvoicePanel } from './order-invoice-panel';
import { OrderDetailMoneySummary } from './order-detail-money-summary';
import { OrderInternalNoteForm } from './order-internal-note-form';

const formatDateTime = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
        : '—';

export const OrderDetailDrawer = ({ orderId, onClose }: { orderId: string | null; onClose: () => void }) => {
    const detailQuery = useOrderDetailQuery(orderId);
    const transitionsQuery = useOrderTransitionsQuery(orderId);
    const order = detailQuery.data;
    const status = order ? getOrderStatusInfo(order.status) : null;

    return (
        <Drawer
            open={!!orderId}
            onOpenChange={(open) => { if (!open) onClose(); }}
            side="right"
            className="w-[min(56rem,100vw-3rem)]"
            title={order ? `Đơn hàng #${order.orderNumber}` : 'Đơn hàng'}
            description={
                order
                    ? `${getChannelLabel(order.channel)} · ${formatDateTime(order.dates.orderDate)}`
                    : undefined
            }
        >
            <QueryBoundary
                query={detailQuery}
                skeleton={
                    <div className="flex flex-col gap-3">
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                }
                errorTitle="Không tải được đơn hàng"
            >
                {(detail) => (
                    <div className="flex flex-col gap-4">
                        {status && (
                            <div>
                                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            </div>
                        )}

                        <QueryBoundary query={transitionsQuery} skeleton={<Skeleton className="h-8 w-2/3" />}>
                            {(transitions) => <OrderActionBar order={detail} transitions={transitions} />}
                        </QueryBoundary>

                        <OrderDetailMoneySummary order={detail} />

                        <OrderInvoicePanel orderNumber={detail.orderNumber} />

                        <OrderInternalNoteForm orderId={detail.id} internalNotes={detail.internalNotes} />

                        <div className="flex flex-col gap-2">
                            <h3 className="text-13 font-semibold uppercase tracking-wider text-fg-subtle">
                                Lịch sử đơn hàng
                            </h3>
                            <OrderTimeline history={detail.history} />
                        </div>

                        {/* D10: khổ A5 phiếu giao hàng do W3-16 dựng; nút mở đặt sẵn ở đây. */}
                        <Link
                            to={`/backoffice/print/delivery-note/${detail.id}`}
                            className={`${buttonVariants({ variant: 'outline', size: 'sm' })} self-start gap-2`}
                        >
                            <Printer size={15} aria-hidden /> In phiếu giao hàng
                        </Link>
                    </div>
                )}
            </QueryBoundary>
        </Drawer>
    );
};
