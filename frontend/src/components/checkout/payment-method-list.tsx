import { useEffect } from 'react';
import { AlertTriangle, Banknote, CreditCard, QrCode, Truck, Wallet } from 'lucide-react';
import { Button, ErrorState, Skeleton } from '../ui';
import { Stagger, StaggerItem } from '../motion';
import { usePaymentMethods, type PaymentMethodDto } from '../../api/payments/methods';

/**
 * Danh sách phương thức thanh toán — render 100% từ `GET /api/payments/methods` (D04 R1).
 *
 * Không có bảng phương thức cứng ở đây: tên, mô tả và thứ tự đều của server. Thứ duy nhất do
 * frontend quyết định là ICON (API không trả icon) — và mã lạ vẫn hiện được bằng icon mặc định,
 * nên một phương thức mới ở backend không cần sửa file này.
 *
 * Gọi lỗi ⇒ chỉ còn COD kèm một dòng cảnh báo + nút Thử lại (không bao giờ danh sách trống,
 * không bao giờ ô "sắp ra mắt").
 */

const ICONS: Record<string, typeof CreditCard> = {
    cod: Truck,
    bank_transfer: QrCode,
    vnpay: CreditCard,
    momo: Wallet,
    installment: Banknote,
};

export interface PaymentMethodChoice {
    methods: PaymentMethodDto[];
    /** Danh sách đang là bản dự phòng vì gọi `/methods` thất bại. */
    degraded: boolean;
    isPending: boolean;
    /** Phương thức đang chọn có nằm trong danh sách server cho phép không. */
    isSelectedAvailable: boolean;
    selected: PaymentMethodDto | null;
    refetch: () => void;
}

/**
 * Nạp danh sách và tự sửa lựa chọn không còn hợp lệ (ví dụ khách quay lại checkout sau khi
 * quản trị tắt VNPay). Trả về đủ dữ liệu để nơi gọi CHẶN nút "Đặt hàng" (D04 R6).
 */
export function usePaymentMethodChoice(
    value: string,
    onChange: (code: string) => void,
): PaymentMethodChoice {
    const query = usePaymentMethods();
    const methods = query.data?.methods ?? [];
    const selected = methods.find((m) => m.code === value) ?? null;
    const isSelectedAvailable = selected !== null;
    const codes = methods.map((m) => m.code).join(',');

    useEffect(() => {
        if (query.isPending || methods.length === 0) return;
        if (!methods.some((m) => m.code === value)) onChange(methods[0].code);
        // `codes` thay cho `methods` để effect chỉ chạy khi danh sách thực sự đổi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [codes, value, query.isPending]);

    return {
        methods,
        degraded: query.data?.degraded ?? false,
        isPending: query.isPending,
        isSelectedAvailable,
        selected,
        refetch: () => void query.refetch(),
    };
}

export interface PaymentMethodListProps {
    choice: PaymentMethodChoice;
    value: string;
    onChange: (code: string) => void;
    /** Ẩn phần tóm tắt phí/mô tả khi dùng trong khung hẹp. */
    compact?: boolean;
}

export function PaymentMethodList({ choice, value, onChange, compact }: PaymentMethodListProps) {
    if (choice.isPending) {
        return (
            <div className="space-y-3" role="status" aria-live="polite" aria-busy>
                <span className="sr-only">Đang tải phương thức thanh toán…</span>
                {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (choice.methods.length === 0) {
        return (
            <ErrorState
                inline
                title="Chưa có phương thức thanh toán nào khả dụng"
                description="Máy chủ chưa bật phương thức thanh toán nào. Vui lòng liên hệ cửa hàng để đặt hàng."
                onRetry={choice.refetch}
                retryLabel="Tải lại"
            />
        );
    }

    return (
        <div className="space-y-3">
            {choice.degraded && (
                <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-xs text-fg">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                    <span className="flex-1">
                        Không tải được danh sách phương thức thanh toán. Tạm thời chỉ nhận thanh toán khi nhận hàng.
                    </span>
                    <Button size="sm" variant="ghost" onClick={choice.refetch}>
                        Thử lại
                    </Button>
                </div>
            )}

            <Stagger onMount className="space-y-3">
                {choice.methods.map((m) => {
                    const active = value === m.code;
                    const Icon = ICONS[m.code] ?? CreditCard;
                    return (
                        <StaggerItem key={m.code}>
                            <label
                                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors duration-140 ease-out ${
                                    active
                                        ? 'border-brand bg-brand-subtle'
                                        : 'border-line bg-surface hover:border-line-strong'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment-method"
                                    value={m.code}
                                    checked={active}
                                    onChange={() => onChange(m.code)}
                                    className="sr-only"
                                />
                                <span
                                    aria-hidden
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                        active ? 'bg-brand text-on-ink' : 'bg-sunken text-fg-subtle'
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-fg">{m.name}</span>
                                    {!compact && m.description && (
                                        <span className="mt-0.5 block text-xs text-fg-muted">{m.description}</span>
                                    )}
                                    {!m.direct && (
                                        <span className="mt-1 block text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
                                            Cần duyệt hồ sơ trước khi giao máy
                                        </span>
                                    )}
                                </span>
                                <span
                                    aria-hidden
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                        active ? 'border-brand' : 'border-line-strong'
                                    }`}
                                >
                                    {active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                                </span>
                            </label>
                        </StaggerItem>
                    );
                })}
            </Stagger>
        </div>
    );
}

export default PaymentMethodList;
