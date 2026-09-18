import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, CreditCard, Info, XCircle } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, ErrorState, Money, Skeleton } from '../components/ui';
import { FadeIn } from '../components/motion';
import { PaymentMethodList, usePaymentMethodChoice } from '../components/checkout/payment-method-list';
import { VietQrPanel } from '../components/checkout/vietqr-panel';
import { paymentApi, type PaymentInitiationResponse } from '../api/payment';
import { salesAccountOrdersApi } from '../api/sales/account-orders';
import { normalizeApiError } from '../lib/api-error';
import { paths } from '../routes';

/**
 * Trang thanh toán của MỘT đơn hàng (`/payment/:orderId`) — dùng cho cả lần đầu lẫn thanh toán lại.
 *
 * Phương thức lấy từ `GET /api/payments/methods` (D04 R1); số tiền lấy từ đơn ở server, frontend
 * không bao giờ gửi lên. Chuyển khoản hiện màn VietQR đầy đủ theo D04 mục 3b; cổng chuyển hướng
 * dùng `paymentUrl`; COD chỉ xác nhận lại đơn.
 */

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-[60vh] bg-bg py-8">
            <div className="mx-auto max-w-3xl px-4">{children}</div>
        </div>
    );
}

export const PaymentPage = () => {
    const { orderId = '' } = useParams<{ orderId: string }>();
    const [method, setMethod] = useState('cod');
    const [intent, setIntent] = useState<PaymentInitiationResponse | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const choice = usePaymentMethodChoice(method, setMethod);

    const orderQuery = useQuery({
        queryKey: ['sales', 'my-order', orderId],
        queryFn: () => salesAccountOrdersApi.getMyOrder(orderId),
        enabled: Boolean(orderId),
        retry: false,
    });

    const initiate = useMutation({
        mutationFn: () => paymentApi.initiateByMethodCode(orderId, method),
        onSuccess: (res) => {
            setFailure(null);
            if (res.kind === 'redirect' && res.paymentUrl) {
                window.location.href = res.paymentUrl;
                return;
            }
            setIntent(res);
        },
        // Lỗi ném tại chỗ (mã phương thức server trả về mà FE chưa map sang enum) không có
        // `response`, nên `normalizeApiError` sẽ gọi nhầm là lỗi mạng — giữ nguyên câu của nó.
        onError: (err) =>
            setFailure(
                err instanceof Error && !('response' in err)
                    ? err.message
                    : normalizeApiError(err).message,
            ),
    });

    if (orderQuery.isPending) {
        return (
            <Shell>
                <div role="status" aria-live="polite" aria-busy className="space-y-4">
                    <span className="sr-only">Đang tải đơn hàng…</span>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            </Shell>
        );
    }

    if (orderQuery.isError) {
        return (
            <Shell>
                <ErrorState
                    title="Không tải được đơn hàng"
                    error={orderQuery.error}
                    onRetry={() => void orderQuery.refetch()}
                />
            </Shell>
        );
    }

    const order = orderQuery.data!;
    const paid = order.paymentStatus === 'Paid';
    const cancelled = order.status === 'Cancelled';

    if (paid || cancelled) {
        return (
            <Shell>
                <FadeIn>
                    <Card padded className="text-center">
                        <span
                            aria-hidden
                            className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${
                                paid ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                            }`}
                        >
                            {paid ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
                        </span>
                        <h1 className="mb-3 text-2xl font-bold text-fg">
                            {paid ? 'Đơn hàng đã được thanh toán' : 'Đơn hàng đã huỷ'}
                        </h1>
                        <p className="mb-6 text-sm text-fg-muted">
                            {paid
                                ? `Đơn ${order.orderNumber} đã ghi nhận đủ tiền, bạn không cần thanh toán lại.`
                                : `Đơn ${order.orderNumber} đã bị huỷ hoặc quá hạn giữ hàng nên không thể thanh toán.`}
                        </p>
                        <Link to={paths.storefront.accountOrderDetail(order.id)}>
                            <Button icon={ArrowRight} iconPosition="right">Xem chi tiết đơn hàng</Button>
                        </Link>
                    </Card>
                </FadeIn>
            </Shell>
        );
    }

    /* --- đã tạo giao dịch chuyển khoản: hiện màn VietQR -------------------- */
    if (intent?.kind === 'bank_transfer' && intent.transfer) {
        return (
            <Shell>
                <FadeIn>
                    <Card padded>
                        <CardHeader>
                            <CardTitle>Chuyển khoản cho đơn {order.orderNumber}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <VietQrPanel paymentId={intent.paymentId} transfer={intent.transfer} />
                        </CardBody>
                    </Card>
                </FadeIn>
            </Shell>
        );
    }

    if (intent && intent.kind === 'none') {
        return (
            <Shell>
                <FadeIn>
                    <Card padded className="text-center">
                        <span aria-hidden className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-success-subtle text-success">
                            <CheckCircle2 className="h-10 w-10" />
                        </span>
                        <h1 className="mb-3 text-2xl font-bold text-fg">Đã ghi nhận yêu cầu thanh toán</h1>
                        <p className="mb-6 text-sm text-fg-muted">
                            {intent.message ?? 'Bạn sẽ thanh toán khi nhận hàng. Nhân viên giao hàng sẽ thu tiền trực tiếp.'}
                        </p>
                        <Link to={paths.storefront.accountOrderDetail(order.id)}>
                            <Button icon={ArrowRight} iconPosition="right">Xem chi tiết đơn hàng</Button>
                        </Link>
                    </Card>
                </FadeIn>
            </Shell>
        );
    }

    const selectedDirect = choice.selected?.direct !== false;

    return (
        <Shell>
            <FadeIn>
                <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-fg">
                    <CreditCard className="h-6 w-6 text-brand" aria-hidden />
                    Thanh toán đơn {order.orderNumber}
                </h1>
                <p className="mb-6 text-sm text-fg-muted">
                    Chọn phương thức bên dưới để hoàn tất. Số tiền do hệ thống tính lại từ đơn hàng.
                </p>

                <Card padded className="mb-4">
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-fg-muted">Tổng phải thanh toán</span>
                        <Money value={order.totalAmount} className="text-2xl font-bold text-brand-text" />
                    </div>
                </Card>

                <Card padded>
                    <PaymentMethodList choice={choice} value={method} onChange={setMethod} />

                    {!selectedDirect && (
                        <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-sunken p-3 text-xs text-fg-muted">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            Phương thức này cần duyệt hồ sơ trước. Nhân viên sẽ liên hệ với bạn sau khi tiếp nhận yêu cầu.
                        </p>
                    )}

                    {failure && (
                        <p className="mt-4 rounded-xl border border-danger/30 bg-danger-subtle p-3 text-sm text-fg" role="alert">
                            {failure}
                        </p>
                    )}

                    <div className="mt-6 flex gap-3">
                        <Link to={paths.storefront.accountOrderDetail(order.id)} className="flex-1">
                            <Button type="button" variant="outline" className="w-full">Để sau</Button>
                        </Link>
                        <Button
                            type="button"
                            className="flex-[2]"
                            icon={ArrowRight}
                            iconPosition="right"
                            loading={initiate.isPending}
                            disabled={initiate.isPending || choice.isPending || !choice.isSelectedAvailable || !selectedDirect}
                            onClick={() => initiate.mutate()}
                        >
                            Tiến hành thanh toán
                        </Button>
                    </div>
                </Card>
            </FadeIn>
        </Shell>
    );
};

export default PaymentPage;
