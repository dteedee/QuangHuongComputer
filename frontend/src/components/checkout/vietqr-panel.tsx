import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, Copy, RefreshCw } from 'lucide-react';
import { Button, ErrorState, Money, Skeleton } from '../ui';
import {
    isTerminalPaymentStatus,
    paymentApi,
    type PaymentStatusResponse,
    type PaymentTransferInfo,
} from '../../api/payment';

/**
 * Màn chuyển khoản VietQR (D04 mục 3b — **binding**).
 *
 * Mã QR KHÔNG BAO GIỜ đứng một mình: có app ngân hàng khi quét từ màn hình chuyển tiền chỉ điền
 * số tài khoản + ngân hàng và BỎ CẢ số tiền lẫn nội dung (MBBank), app Techcombank cũ không quét
 * được VietQR. Vì vậy bên cạnh QR luôn hiện: ngân hàng, số tài khoản, chủ tài khoản, số tiền và
 * mã thanh toán dạng chữ to có nút Sao chép, kèm cảnh báo ghi đúng nội dung.
 *
 * Trạng thái "đã nhận tiền" chỉ đến từ server: poll `GET /payments/{id}` mỗi 5 giây.
 */

export interface VietQrPanelProps {
    paymentId: string;
    transfer: PaymentTransferInfo;
    /** Token đơn hàng của khách vãng lai (khi có, mọi lời gọi đi qua `/payments/guest/*`). */
    guestToken?: string;
    /** Gọi đúng một lần khi server xác nhận đã nhận tiền. */
    onConfirmed?: (payment: PaymentStatusResponse) => void;
    /** Gọi khi server báo giao dịch hết hạn / thất bại / bị huỷ. */
    onUnsuccessful?: (payment: PaymentStatusResponse) => void;
}

function useCountdown(expiresAt?: string | null): { label: string; expired: boolean } {
    const target = useMemo(() => (expiresAt ? new Date(expiresAt).getTime() : null), [expiresAt]);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!target) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [target]);

    if (!target || Number.isNaN(target)) return { label: '', expired: false };
    const left = Math.max(0, target - now);
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    const s = Math.floor((left % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return { label: `${pad(h)}:${pad(m)}:${pad(s)}`, expired: left <= 0 };
}

function CopyableCode({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Trình duyệt chặn clipboard (http, quyền bị từ chối): bôi đen sẵn để khách tự Ctrl+C.
            const el = document.getElementById('vietqr-payment-code');
            if (el) {
                const range = document.createRange();
                range.selectNodeContents(el);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        }
    };

    return (
        <div className="rounded-xl border border-brand-line bg-brand-subtle p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                Nội dung chuyển khoản
            </p>
            <div className="mt-1 flex items-center gap-2">
                <code
                    id="vietqr-payment-code"
                    className="min-w-0 flex-1 select-all break-all font-mono text-xl font-bold tracking-wider text-fg sm:text-2xl"
                >
                    {code}
                </code>
                <Button
                    type="button"
                    size="sm"
                    variant={copied ? 'outline' : 'primary'}
                    icon={copied ? CheckCircle2 : Copy}
                    onClick={copy}
                >
                    {copied ? 'Đã sao chép' : 'Sao chép'}
                </Button>
            </div>
            <p aria-live="polite" className="sr-only">
                {copied ? 'Đã sao chép nội dung chuyển khoản' : ''}
            </p>
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
            <span className="text-xs text-fg-muted">{label}</span>
            <span className="select-all text-right text-sm font-semibold text-fg">{children}</span>
        </div>
    );
}

export function VietQrPanel({
    paymentId,
    transfer,
    guestToken,
    onConfirmed,
    onUnsuccessful,
}: VietQrPanelProps) {
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [qrFailed, setQrFailed] = useState(false);
    const notified = useRef(false);
    const countdown = useCountdown(transfer.expiresAt);

    // Ảnh QR nằm sau xác thực ⇒ tải kèm token rồi dựng blob URL (không đặt thẳng vào <img src>).
    useEffect(() => {
        let revoked = false;
        let url: string | null = null;
        setQrFailed(false);
        paymentApi
            .fetchQrObjectUrl(paymentId, guestToken)
            .then((u) => {
                if (revoked) { URL.revokeObjectURL(u); return; }
                url = u;
                setQrUrl(u);
            })
            .catch(() => setQrFailed(true));
        return () => {
            revoked = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [paymentId, guestToken]);

    const statusQuery = useQuery({
        queryKey: ['payments', 'intent', paymentId, guestToken ?? 'auth'],
        queryFn: () => (guestToken ? paymentApi.guestGet(paymentId, guestToken) : paymentApi.get(paymentId)),
        // D04: chỉ SERVER xác nhận đã nhận tiền. 5 giây một lần, dừng khi đã có trạng thái cuối.
        refetchInterval: (q) => (q.state.data && isTerminalPaymentStatus(q.state.data.status) ? false : 5000),
        refetchOnWindowFocus: true,
    });

    const payment = statusQuery.data;

    useEffect(() => {
        if (!payment || notified.current) return;
        if (payment.status === 'Succeeded') {
            notified.current = true;
            onConfirmed?.(payment);
        } else if (isTerminalPaymentStatus(payment.status)) {
            notified.current = true;
            onUnsuccessful?.(payment);
        }
    }, [payment, onConfirmed, onUnsuccessful]);

    const confirmed = payment?.status === 'Succeeded';

    return (
        <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            {/* --- QR ---------------------------------------------------------- */}
            <div className="flex flex-col items-center gap-3">
                <div className="flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border border-line bg-surface p-3">
                    {qrFailed ? (
                        <div className="p-2 text-center text-xs text-fg-muted">
                            Không tải được ảnh mã QR. Bạn vẫn chuyển khoản được bằng thông tin bên cạnh.
                        </div>
                    ) : qrUrl ? (
                        <img
                            src={qrUrl}
                            alt={`Mã VietQR chuyển khoản ${transfer.paymentCode}`}
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        <Skeleton className="h-full w-full rounded-xl" />
                    )}
                </div>
                <p className="text-center text-xs text-fg-muted">
                    Mở app ngân hàng → quét mã → <span className="font-semibold text-fg">kiểm tra lại số tiền và nội dung</span>
                </p>
            </div>

            {/* --- Thông tin chuyển khoản (luôn hiện, song song với QR) --------- */}
            <div className="min-w-0 space-y-4">
                <div className="rounded-xl border border-line bg-surface p-4">
                    <Row label="Ngân hàng">{transfer.bankName}</Row>
                    <Row label="Số tài khoản">
                        <span className="font-mono text-base">{transfer.accountNumber}</span>
                    </Row>
                    <Row label="Chủ tài khoản">{transfer.accountName}</Row>
                    <Row label="Số tiền">
                        <Money value={transfer.amount} className="text-base text-brand-text" />
                    </Row>
                </div>

                <CopyableCode code={transfer.paymentCode} />

                <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-xs text-fg">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                    <span>{transfer.notice}</span>
                </div>

                {countdown.label && (
                    <p className="flex items-center gap-2 text-xs text-fg-muted">
                        <Clock className="h-4 w-4" aria-hidden />
                        {countdown.expired ? (
                            <span className="font-semibold text-danger">Đã hết thời gian giữ đơn</span>
                        ) : (
                            <>
                                Đơn được giữ thêm{' '}
                                <span className="font-mono font-semibold text-fg">{countdown.label}</span>
                            </>
                        )}
                    </p>
                )}

                {/* Trạng thái đối soát — chỉ nói điều server nói. */}
                {statusQuery.isError ? (
                    <ErrorState
                        inline
                        title="Không kiểm tra được trạng thái thanh toán"
                        error={statusQuery.error}
                        onRetry={() => void statusQuery.refetch()}
                    />
                ) : confirmed ? (
                    <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-subtle p-3 text-sm font-semibold text-fg">
                        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                        Đã nhận được thanh toán của bạn.
                    </p>
                ) : (
                    <p className="flex items-center gap-2 text-xs text-fg-muted" aria-live="polite">
                        <RefreshCw
                            className="h-4 w-4 motion-safe:animate-spin"
                            style={{ animationDuration: '1.4s' }}
                            aria-hidden
                        />
                        Đang chờ ngân hàng báo có — trang sẽ tự cập nhật, bạn không cần tải lại.
                    </p>
                )}
            </div>
        </div>
    );
}

export default VietQrPanel;
