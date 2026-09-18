import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Clock, ShoppingBag, XCircle } from 'lucide-react';
import { Button, Card, ErrorState, Money, Skeleton } from '../components/ui';
import { ROUTES, paths } from '../routes';
import { FadeIn } from '../components/motion';
import {
    PAYMENT_STATUS_LABEL,
    isTerminalPaymentStatus,
    paymentApi,
    type PaymentStatusResponse,
} from '../api/payment';

/**
 * Trang KẾT QUẢ thanh toán (`/payment/result`, cùng hai đường cũ `/payment/success|failed`).
 *
 * D04 mục 4 + `docs/api-contracts/payments.md` §2 (binding): **tham số redirect không bao giờ là
 * bằng chứng đã trả tiền**. VNPay ReturnUrl chỉ verify chữ ký rồi chuyển hướng về đây với
 * `outcome=pending|failed`; chỉ IPN mới ghi được trạng thái. Vì vậy trang này poll
 * `GET /payments/{id}` và hiển thị đúng những gì SERVER nói, không gì khác.
 */

/** Lỗi do backend gắn vào URL khi không tin được tham số nào của cổng. */
const GATEWAY_ERRORS: Record<string, string> = {
    PAYMENT_GATEWAY_NOT_CONFIGURED: 'Cổng thanh toán chưa được cấu hình. Vui lòng chọn phương thức khác hoặc liên hệ cửa hàng.',
    INVALID_SIGNATURE: 'Phản hồi từ cổng thanh toán không hợp lệ nên chúng tôi không ghi nhận kết quả này. Nếu tài khoản đã bị trừ tiền, vui lòng liên hệ cửa hàng.',
    INVALID_TXN_REF: 'Không xác định được giao dịch tương ứng với phản hồi của cổng thanh toán.',
};

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-[60vh] bg-bg py-10">
            <div className="mx-auto max-w-lg px-4">
                <FadeIn>
                    <Card padded className="text-center">{children}</Card>
                </FadeIn>
            </div>
        </div>
    );
}

function Icon({ tone }: { tone: 'success' | 'danger' | 'wait' }) {
    const map = {
        success: { C: CheckCircle2, cls: 'bg-success-subtle text-success' },
        danger: { C: XCircle, cls: 'bg-danger-subtle text-danger' },
        wait: { C: Clock, cls: 'bg-info-subtle text-info' },
    } as const;
    const { C, cls } = map[tone];
    return (
        <span aria-hidden className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${cls}`}>
            <C className="h-10 w-10" />
        </span>
    );
}

export const PaymentResultPage = () => {
    const [params] = useSearchParams();
    const paymentId = params.get('paymentId');
    const orderIdParam = params.get('orderId');
    const gatewayError = params.get('error');
    const isFailedPath = window.location.pathname.includes('/failed');

    const query = useQuery({
        queryKey: ['payments', 'intent', paymentId],
        queryFn: () => paymentApi.get(paymentId as string),
        enabled: Boolean(paymentId),
        // Cổng có thể báo về trước IPN — poll tới khi server có trạng thái cuối.
        refetchInterval: (q) => (q.state.data && isTerminalPaymentStatus(q.state.data.status) ? false : 5000),
    });

    const payment: PaymentStatusResponse | undefined = query.data;
    const orderId = payment?.orderId ?? orderIdParam ?? null;

    const orderLink = useMemo(
        () => (orderId
            ? paths.storefront.accountOrderDetail(orderId)
            : paths.storefront.accountOrders()),
        [orderId],
    );

    /* --- cổng trả về lỗi tường minh --------------------------------------- */
    if (gatewayError) {
        return (
            <Shell>
                <Icon tone="danger" />
                <h1 className="mb-3 text-2xl font-bold text-fg">Không ghi nhận được thanh toán</h1>
                <p className="mb-2 text-sm text-fg-muted">
                    {GATEWAY_ERRORS[gatewayError] ?? 'Cổng thanh toán trả về một phản hồi không hợp lệ.'}
                </p>
                <p className="text-2xs text-fg-subtle">Mã lỗi: {gatewayError}</p>
                <div className="mt-6 flex flex-col gap-2">
                    <Link to={paths.storefront.accountOrders()} className="w-full">
                        <Button className="w-full">Xem đơn hàng của tôi</Button>
                    </Link>
                    <Link to={ROUTES.HOME} className="w-full">
                        <Button variant="ghost" className="w-full" icon={ShoppingBag}>Tiếp tục mua sắm</Button>
                    </Link>
                </div>
            </Shell>
        );
    }

    /* --- không có mã giao dịch: chỉ nói được điều chắc chắn ---------------- */
    if (!paymentId) {
        return (
            <Shell>
                <Icon tone={isFailedPath ? 'danger' : 'wait'} />
                <h1 className="mb-3 text-2xl font-bold text-fg">
                    {isFailedPath ? 'Thanh toán chưa hoàn tất' : 'Không tra cứu được giao dịch'}
                </h1>
                <p className="mb-2 text-sm text-fg-muted">
                    Đường dẫn không kèm mã giao dịch nên chúng tôi không xác nhận được kết quả. Trạng thái chính xác
                    luôn hiển thị trong chi tiết đơn hàng.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                    <Link to={orderLink} className="w-full">
                        <Button className="w-full" icon={ArrowRight} iconPosition="right">Xem đơn hàng</Button>
                    </Link>
                    <Link to={ROUTES.HOME} className="w-full">
                        <Button variant="ghost" className="w-full" icon={ShoppingBag}>Tiếp tục mua sắm</Button>
                    </Link>
                </div>
            </Shell>
        );
    }

    if (query.isPending) {
        return (
            <Shell>
                <div role="status" aria-live="polite" aria-busy className="space-y-3">
                    <span className="sr-only">Đang kiểm tra trạng thái thanh toán…</span>
                    <Skeleton className="mx-auto h-20 w-20 rounded-2xl" />
                    <Skeleton className="mx-auto h-7 w-2/3" />
                    <Skeleton className="mx-auto h-4 w-1/2" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                </div>
            </Shell>
        );
    }

    if (query.isError) {
        return (
            <Shell>
                <ErrorState
                    title="Không kiểm tra được trạng thái thanh toán"
                    error={query.error}
                    onRetry={() => void query.refetch()}
                />
            </Shell>
        );
    }

    const status = payment!.status;
    const tone = status === 'Succeeded' ? 'success' : status === 'Pending' ? 'wait' : 'danger';
    const title =
        status === 'Succeeded' ? 'Thanh toán thành công'
        : status === 'Pending' ? 'Đang chờ xác nhận từ ngân hàng'
        : PAYMENT_STATUS_LABEL[status];

    return (
        <Shell>
            <Icon tone={tone} />
            <h1 className="mb-3 text-2xl font-bold text-fg">{title}</h1>
            <p className="mb-4 text-sm text-fg-muted">
                {status === 'Succeeded'
                    ? 'Chúng tôi đã nhận được tiền và đang chuẩn bị đơn hàng của bạn.'
                    : status === 'Pending'
                    ? 'Ngân hàng chưa báo có. Trang này tự cập nhật mỗi 5 giây, bạn không cần tải lại.'
                    : 'Giao dịch không hoàn tất. Bạn có thể thanh toán lại từ trang chi tiết đơn hàng.'}
            </p>

            <dl className="mx-auto mb-2 max-w-xs space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted">Số tiền</dt>
                    <dd className="font-semibold text-fg"><Money value={payment!.amount} /></dd>
                </div>
                {payment!.paymentCode && (
                    <div className="flex justify-between gap-3">
                        <dt className="text-fg-muted">Mã giao dịch</dt>
                        <dd className="select-all font-mono font-semibold text-fg">{payment!.paymentCode}</dd>
                    </div>
                )}
                <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted">Trạng thái</dt>
                    <dd className="font-semibold text-fg">{PAYMENT_STATUS_LABEL[status]}</dd>
                </div>
            </dl>

            <div className="mt-6 flex flex-col gap-2">
                <Link to={orderLink} className="w-full">
                    <Button className="w-full" icon={ArrowRight} iconPosition="right">Xem chi tiết đơn hàng</Button>
                </Link>
                {status !== 'Succeeded' && orderId && (
                    <Link to={paths.storefront.payment(orderId)} className="w-full">
                        <Button variant="outline" className="w-full">Thanh toán lại</Button>
                    </Link>
                )}
                <Link to={ROUTES.HOME} className="w-full">
                    <Button variant="ghost" className="w-full" icon={ShoppingBag}>Tiếp tục mua sắm</Button>
                </Link>
            </div>
        </Shell>
    );
};

export default PaymentResultPage;
