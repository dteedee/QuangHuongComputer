/**
 * D04 — "Xác nhận chuyển khoản" xác nhận MỘT khoản thu đang chờ (payment
 * intent), không phải cả đơn: chọn khoản thu, nhập mã tham chiếu ngân hàng,
 * `POST /payments/reconciliation/confirm/{paymentId}`.
 *
 * design-guidelines §9.3: overlay lấy từ `components/ui` (`Dialog`).
 */
import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { Button, Dialog, EmptyState, Input, Select, formatDong } from '../../../components/ui';

/** Một dòng `PaymentIntent` từ `getPaymentIntentsForOrder` (provider `SePay`, status `Pending`). */
export interface PendingBankTransferIntent {
    id: string;
    amount: number;
}

interface OrderBankTransferModalProps {
    open: boolean;
    onClose: () => void;
    pendingPayments: PendingBankTransferIntent[];
    onSubmit: (data: { paymentId: string; bankReference: string }) => void;
    isSubmitting: boolean;
}

export const OrderBankTransferModal = ({
    open, onClose, pendingPayments, onSubmit, isSubmitting,
}: OrderBankTransferModalProps) => {
    const [paymentId, setPaymentId] = useState(pendingPayments[0]?.id ?? '');
    const [bankReference, setBankReference] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentId || !bankReference.trim()) {
            setError('Vui lòng chọn khoản thu và nhập mã tham chiếu ngân hàng');
            return;
        }
        setError('');
        onSubmit({ paymentId, bankReference: bankReference.trim() });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => { if (!o) onClose(); }}
            title="Xác nhận chuyển khoản"
            description="Đối soát một khoản thu đang chờ với mã tham chiếu tiền về từ ngân hàng."
            size="sm"
        >
            {pendingPayments.length === 0 ? (
                <EmptyState
                    icon={Landmark}
                    title="Không có khoản chuyển khoản đang chờ"
                    description="Mọi khoản thu của đơn này đã được đối soát."
                />
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <Select
                        label="Khoản thu đang chờ"
                        value={paymentId}
                        onChange={(e) => setPaymentId(e.target.value)}
                        options={pendingPayments.map((p) => ({
                            value: p.id,
                            label: `${formatDong(p.amount)} ₫ — ${p.id.slice(0, 8)}`,
                        }))}
                    />
                    <Input
                        label="Mã tham chiếu ngân hàng"
                        inputSize="sm"
                        placeholder="VD: FT26091812345"
                        value={bankReference}
                        onChange={(e) => setBankReference(e.target.value)}
                        error={error || undefined}
                    />
                    <div className="mt-1 flex items-center justify-end gap-2 border-t border-line pt-3">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Huỷ</Button>
                        <Button type="submit" size="sm" icon={Landmark} loading={isSubmitting}>
                            Xác nhận đã nhận tiền
                        </Button>
                    </div>
                </form>
            )}
        </Dialog>
    );
};
