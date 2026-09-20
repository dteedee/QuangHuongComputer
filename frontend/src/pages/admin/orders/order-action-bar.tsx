/**
 * Chỉ vẽ những hành động HỢP LỆ kế tiếp, lấy thẳng từ `allowedNext` của API
 * (phase spec bước 3) — không bao giờ là danh sách trạng thái viết cứng. Mỗi
 * nút được `<Can>` chặn theo `Sales.UpdateStatus`/`CancelOrder`/`TakeDeposit`;
 * backend vẫn kiểm tra, đây chỉ giấu thứ đằng nào cũng 403.
 *
 * design-guidelines §9.1: chỉ hành động ĐẦU TIÊN là nút đỏ (primary); phần còn
 * lại `outline`; huỷ đơn là `danger` (cảnh báo).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Landmark, Package, PackageCheck, Truck, Wallet, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import type { OrderDetail, OrderTransitionsDto } from '../../../api/sales/types';
import { useOrderActions } from './use-order-actions';
import { OrderShipModal } from './order-ship-modal';
import { OrderBankTransferModal } from './order-bank-transfer-modal';
import type { ExtendedOrderStatus } from './order-state-machine';

interface OrderActionBarProps {
    order: OrderDetail;
    transitions?: OrderTransitionsDto;
}

type IconType = typeof Package;

/** Nhãn nút theo action_map trong Todo/step 3 của phase file. */
const ACTION_META: Record<ExtendedOrderStatus, { label: string; icon: IconType }> = {
    Draft: { label: 'Lưu bản nháp', icon: Package },
    Pending: { label: 'Chờ xác nhận', icon: Package },
    Confirmed: { label: 'Xác nhận', icon: CheckCircle2 },
    Paid: { label: 'Đã thanh toán', icon: Wallet },
    Fulfilled: { label: 'Đóng gói', icon: PackageCheck },
    Shipped: { label: 'Giao hàng', icon: Truck },
    Delivered: { label: 'Đã giao', icon: PackageCheck },
    Completed: { label: 'Hoàn tất', icon: CheckCircle2 },
    Cancelled: { label: 'Huỷ', icon: XCircle },
};

export const OrderActionBar = ({ order, transitions }: OrderActionBarProps) => {
    const [shipModalOpen, setShipModalOpen] = useState(false);
    const [bankTransferModalOpen, setBankTransferModalOpen] = useState(false);
    const {
        transitionMutation, confirmCodMutation, confirmBankTransferMutation,
        runSimpleTransition, runCancel,
    } = useOrderActions(order.id);

    // `order.allowedTransitions` (bản sao trong response chi tiết) đặt khoá trạng thái là
    // `value` chứ không phải `status` — sai lệch đã kiểm chứng trên TEST :5050 — nên không
    // bao giờ dùng làm dự phòng ở đây; endpoint riêng `GET .../transitions` (prop `transitions`)
    // là nguồn sự thật duy nhất.
    const allowedNext = transitions?.allowedNext ?? [];
    const isBusy = transitionMutation.isPending;

    const handleAction = (status: ExtendedOrderStatus) => {
        if (status === 'Shipped') { setShipModalOpen(true); return; }
        if (status === 'Cancelled') { runCancel(); return; }
        runSimpleTransition(status, ACTION_META[status]?.label ?? status);
    };

    /**
     * "Xác nhận chuyển khoản" của D04 xác nhận một PAYMENT INTENT
     * (`Payments.Domain.PaymentIntent`, provider `SePay` = chuyển khoản/VietQR theo
     * `PaymentEnums.cs`), không phải một dòng `OrderPayments` — đó là các khoản đã
     * ghi nhận, bảng khác. Đã kiểm chứng trên TEST :5050 (18/09/2026).
     */
    const paymentIntentsQuery = useQuery({
        queryKey: ['order-payment-intents', order.id],
        queryFn: () => salesAdminOrdersApi.getPaymentIntentsForOrder(order.id),
    });
    const pendingBankTransferIntents = (paymentIntentsQuery.data ?? [])
        .filter((p) => p.provider === 'SePay' && p.status === 'Pending');
    const hasPendingCod = order.paymentStatus !== 'Paid' && order.money.amountDue > 0;

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {allowedNext.map((next, index) => {
                    const meta = ACTION_META[next.status];
                    const isCancel = next.status === 'Cancelled';
                    return (
                        <Can
                            key={next.status}
                            permission={isCancel ? PERMISSIONS.SALES_CANCEL_ORDER : PERMISSIONS.SALES_UPDATE_STATUS}
                        >
                            <Button
                                size="sm"
                                /* Tối đa MỘT nút đỏ: hành động kế tiếp đầu tiên. */
                                variant={isCancel ? 'danger' : index === 0 ? 'primary' : 'outline'}
                                icon={meta?.icon ?? Package}
                                loading={isBusy}
                                onClick={() => handleAction(next.status)}
                            >
                                {next.label}
                            </Button>
                        </Can>
                    );
                })}

                {/* D04: hai hành động riêng, đi qua endpoint đối soát — không đổi status trực tiếp. */}
                <Can permission={PERMISSIONS.PAYMENTS_COLLECT_COD}>
                    {hasPendingCod && (
                        <Button
                            size="sm"
                            variant="outline"
                            icon={Wallet}
                            loading={confirmCodMutation.isPending}
                            onClick={() => confirmCodMutation.mutate()}
                        >
                            Đã thu COD
                        </Button>
                    )}
                </Can>
                <Can permission={PERMISSIONS.PAYMENTS_RECONCILE}>
                    {pendingBankTransferIntents.length > 0 && (
                        <Button size="sm" variant="outline" icon={Landmark} onClick={() => setBankTransferModalOpen(true)}>
                            Xác nhận chuyển khoản
                        </Button>
                    )}
                </Can>

                {allowedNext.length === 0 && (
                    <p className="text-13 text-fg-muted">
                        Đơn hàng đã ở trạng thái cuối — không còn hành động nào.
                    </p>
                )}
            </div>

            <OrderShipModal
                open={shipModalOpen}
                onClose={() => setShipModalOpen(false)}
                isSubmitting={transitionMutation.isPending}
                onSubmit={(data) => {
                    transitionMutation.mutate({ to: 'Shipped', ...data }, { onSuccess: () => setShipModalOpen(false) });
                }}
            />
            <OrderBankTransferModal
                open={bankTransferModalOpen}
                onClose={() => setBankTransferModalOpen(false)}
                pendingPayments={pendingBankTransferIntents}
                isSubmitting={confirmBankTransferMutation.isPending}
                onSubmit={(data) => confirmBankTransferMutation.mutate(data, { onSuccess: () => setBankTransferModalOpen(false) })}
            />
        </>
    );
};
