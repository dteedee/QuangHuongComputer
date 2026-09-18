/**
 * Renders ONLY the legal next actions, straight from the API's
 * `allowedNext` (phase spec step 3) — never a hardcoded status list. Each
 * button is `<Can>`-gated on `Sales.UpdateStatus`/`CancelOrder`/`TakeDeposit`;
 * the backend still enforces it, this only hides what would 403 anyway.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Landmark, Loader2, Package, PackageCheck, Truck, Wallet, XCircle } from 'lucide-react';
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

/** Nhãn nút theo action_map trong Todo/step 3 của phase file. */
const ACTION_META: Record<ExtendedOrderStatus, { label: string; icon: React.ReactNode }> = {
    Draft: { label: 'Lưu bản nháp', icon: <Package size={14} /> },
    Pending: { label: 'Chờ xác nhận', icon: <Package size={14} /> },
    Confirmed: { label: 'Xác nhận', icon: <CheckCircle2 size={14} /> },
    Paid: { label: 'Đã thanh toán', icon: <Wallet size={14} /> },
    Fulfilled: { label: 'Đóng gói', icon: <PackageCheck size={14} /> },
    Shipped: { label: 'Giao hàng', icon: <Truck size={14} /> },
    Delivered: { label: 'Đã giao', icon: <PackageCheck size={14} /> },
    Completed: { label: 'Hoàn tất', icon: <CheckCircle2 size={14} /> },
    Cancelled: { label: 'Huỷ', icon: <XCircle size={14} /> },
};

export const OrderActionBar = ({ order, transitions }: OrderActionBarProps) => {
    const [shipModalOpen, setShipModalOpen] = useState(false);
    const [bankTransferModalOpen, setBankTransferModalOpen] = useState(false);
    const { transitionMutation, confirmCodMutation, confirmBankTransferMutation, runSimpleTransition, runCancel } = useOrderActions(order.id);

    // `order.allowedTransitions` (the detail response's own copy) keys the status as `value` not
    // `status` — an inconsistency verified against TEST :5050 — so it is never used as a fallback
    // here; the dedicated `GET .../transitions` endpoint (`transitions` prop) is the one source of truth.
    const allowedNext = transitions?.allowedNext ?? [];
    const isBusy = transitionMutation.isPending;

    const handleAction = (status: ExtendedOrderStatus) => {
        if (status === 'Shipped') { setShipModalOpen(true); return; }
        if (status === 'Cancelled') { runCancel(); return; }
        runSimpleTransition(status, ACTION_META[status]?.label ?? status);
    };

    /**
     * D04's "Xác nhận chuyển khoản" confirms a PAYMENT INTENT
     * (`Payments.Domain.PaymentIntent`, provider `SePay` = bank-transfer/
     * VietQR per `PaymentEnums.cs`), not an `OrderPayments` row — those are
     * already-applied receipts, a different table. Verified against TEST
     * :5050 (2026-09-18).
     */
    const paymentIntentsQuery = useQuery({
        queryKey: ['order-payment-intents', order.id],
        queryFn: () => salesAdminOrdersApi.getPaymentIntentsForOrder(order.id),
    });
    const pendingBankTransferIntents = (paymentIntentsQuery.data ?? []).filter((p) => p.provider === 'SePay' && p.status === 'Pending');
    const hasPendingCod = order.paymentStatus !== 'Paid' && order.money.amountDue > 0;

    return (
        <>
            <div className="flex flex-wrap items-center gap-3">
                {allowedNext.map((next) => (
                    <Can key={next.status} permission={next.status === 'Cancelled' ? PERMISSIONS.SALES_CANCEL_ORDER : PERMISSIONS.SALES_UPDATE_STATUS}>
                        <button
                            onClick={() => handleAction(next.status)}
                            disabled={isBusy}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase transition-all disabled:opacity-50 ${
                                next.status === 'Cancelled'
                                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                    : 'bg-accent text-white hover:bg-accent-hover shadow-sm shadow-blue-500/15'
                            }`}
                        >
                            {isBusy ? <Loader2 size={14} className="animate-spin" /> : (ACTION_META[next.status]?.icon ?? <Package size={14} />)}
                            {next.label}
                        </button>
                    </Can>
                ))}

                {/* D04: hai action riêng, đi qua endpoint đối soát — không đổi status trực tiếp. */}
                <Can permission={PERMISSIONS.PAYMENTS_COLLECT_COD}>
                    {hasPendingCod && (
                        <button
                            onClick={() => confirmCodMutation.mutate()}
                            disabled={confirmCodMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                        >
                            {confirmCodMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                            Đã thu COD
                        </button>
                    )}
                </Can>
                <Can permission={PERMISSIONS.PAYMENTS_RECONCILE}>
                    {pendingBankTransferIntents.length > 0 && (
                        <button
                            onClick={() => setBankTransferModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                            <Landmark size={14} /> Xác nhận chuyển khoản
                        </button>
                    )}
                </Can>

                {allowedNext.length === 0 && (
                    <span className="text-xs font-semibold text-gray-400 uppercase">Đơn hàng đã ở trạng thái cuối — không còn hành động nào</span>
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
