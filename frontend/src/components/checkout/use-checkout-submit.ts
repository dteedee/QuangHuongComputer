import { useState } from 'react';
import { salesCartCheckoutApi, type CheckoutResultDto } from '../../api/sales/cart-checkout';
import { paymentApi, initiateMoMoPayment, initiateZaloPayPayment } from '../../api/payment';
import { installmentApi } from '../../api/installment';
import { normalizeApiError } from '../../lib/api-error';
import { notify } from '../ui';
import type { CartItem } from '../../context/CartContext';
import type { PaymentFormState, ShippingFormState } from './checkout-types';

interface SubmitParams {
    items: CartItem[];
    /** Giỏ trên server — bắt buộc cho khách đã đăng nhập (`/checkout/orchestrate`). */
    cartId: string | null;
    shipping: ShippingFormState;
    payment: PaymentFormState;
    promotionCode: string | null;
    /** Khoá chống đặt trùng: phiên giữ chỗ tồn kho tạo trước khi bấm "Đặt hàng". */
    sessionId?: string;
    isAuthenticated: boolean;
    clearCart: () => Promise<void>;
}

export interface ConfirmedOrder {
    id: string;
    number?: string;
    amount: number;
    qrUrl?: string | null;
}

export interface SubmitOutcome {
    order: ConfirmedOrder | null;
    /** Thông điệp lỗi của SERVER, hiển thị ngay tại bước gây lỗi (không chỉ toast). */
    error: string | null;
    /** Bước mà khách cần quay lại để sửa (1 giao hàng · 2 khuyến mãi · 3 thanh toán). */
    errorStep?: 1 | 2 | 3;
    /** Đã điều hướng sang cổng thanh toán — nơi gọi không làm gì thêm. */
    redirected?: boolean;
}

/** Lỗi coupon phải chặn ở bước khuyến mãi; lỗi tồn kho/giỏ đẩy về bước giao hàng. */
function stepForError(message: string): 1 | 2 | 3 {
    const m = message.toLowerCase();
    if (m.includes('giảm giá') || m.includes('khuyến mãi') || m.includes('mã')) return 2;
    if (m.includes('không đủ hàng') || m.includes('giỏ hàng') || m.includes('phiên checkout')) return 1;
    return 3;
}

/**
 * Bao gói toàn bộ luồng "Đặt hàng".
 *
 * Khác bản cũ ở ba điểm quan trọng:
 *  - Khách đã đăng nhập đi qua `/sales/checkout/orchestrate` với `cartId` + `checkoutSessionId`
 *    thay vì `/sales/checkout` với danh sách hàng trong body: chỉ đường này tôn trọng phiên
 *    giữ chỗ tồn kho và chống việc bấm "Đặt hàng" hai lần tạo ra hai đơn.
 *  - KHÔNG gửi `customerId`, `shippingFee`, `manualDiscount` hay đơn giá — server tự quyết (W0-4).
 *  - Lỗi của server được TRẢ VỀ cho nơi gọi để hiển thị ngay tại bước gây ra lỗi.
 */
export function useCheckoutSubmit() {
    const [submitting, setSubmitting] = useState(false);

    const submit = async (p: SubmitParams): Promise<SubmitOutcome> => {
        if (submitting) return { order: null, error: null };
        setSubmitting(true);
        try {
            const isPickup = p.shipping.deliveryMethod === 'pickup';
            const shippingAddress = isPickup
                ? `Nhận tại: ${p.shipping.pickupStoreName}`
                : [p.shipping.address, p.shipping.ward, p.shipping.province].filter(Boolean).join(', ');

            // D10 — hồ sơ trả góp phải hợp lệ TRƯỚC khi đơn được tạo, không phải sau.
            if (p.payment.paymentMethod === 'installment') {
                if (!p.payment.installmentProviderCode || !p.payment.installmentTerm) {
                    return { order: null, error: 'Vui lòng chọn công ty tài chính và kỳ hạn trả góp', errorStep: 3 };
                }
                if (!p.payment.installmentConsent) {
                    return {
                        order: null, errorStep: 3,
                        error: 'Vui lòng đồng ý cho chúng tôi chuyển thông tin của bạn sang công ty tài chính',
                    };
                }
            }

            let resp: CheckoutResultDto;
            if (p.isAuthenticated) {
                if (!p.cartId) {
                    return { order: null, error: 'Không đọc được giỏ hàng trên máy chủ. Vui lòng tải lại trang.', errorStep: 1 };
                }
                resp = await salesCartCheckoutApi.orders.create({
                    cartId: p.cartId,
                    shipping: {
                        recipientName: p.shipping.fullName,
                        phone: p.shipping.phone,
                        streetAddress: shippingAddress,
                        ward: p.shipping.ward || undefined,
                        province: p.shipping.province || undefined,
                        // Server tính lại phí cho kênh Web — gửi 0 là đúng hợp đồng, không phải "quên".
                        shippingFee: 0,
                        isPickup,
                        pickupStoreId: isPickup ? p.shipping.pickupStoreId : undefined,
                        pickupStoreName: isPickup ? p.shipping.pickupStoreName : undefined,
                        notes: p.shipping.notes,
                    },
                    paymentMethod: p.payment.paymentMethod,
                    promotionCodes: p.promotionCode ? [p.promotionCode] : undefined,
                    checkoutSessionId: p.sessionId,
                });
            } else {
                resp = await salesCartCheckoutApi.orders.guestCheckout({
                    customerName: p.shipping.fullName,
                    customerEmail: p.shipping.email,
                    customerPhone: p.shipping.phone,
                    shippingAddress,
                    // `price` bị server bỏ qua (nó đọc lại giá thật từ Catalog) — gửi 0 để chắc
                    // chắn không có con số tiền nào đi từ trình duyệt lên.
                    items: p.items.map(i => ({ productId: i.id, productName: i.name, price: 0, quantity: i.quantity })),
                    couponCode: p.promotionCode ?? undefined,
                    notes: p.shipping.notes,
                    paymentMethod: p.payment.paymentMethod,
                });
            }

            if (!resp?.orderId) {
                return { order: null, error: 'Máy chủ không trả về mã đơn hàng. Vui lòng thử lại.', errorStep: 3 };
            }

            if (p.payment.paymentMethod === 'installment') {
                await installmentApi.apply({
                    orderId: resp.orderId,
                    providerCode: p.payment.installmentProviderCode!,
                    termMonths: p.payment.installmentTerm!,
                    downPaymentAmount: p.payment.installmentDownPayment ?? 0,
                    monthlyPayment: p.payment.installmentMonthly ?? 0,
                }).catch(() => notify.error('Không nộp được hồ sơ trả góp, nhân viên sẽ liên hệ lại.'));
            }

            let qrUrl: string | null = null;
            const gateway: Partial<Record<PaymentFormState['paymentMethod'], () => Promise<{ paymentUrl?: string }>>> = {
                vnpay: () => paymentApi.initiate({ orderId: resp.orderId, amount: resp.totalAmount, provider: 1 }),
                momo: () => initiateMoMoPayment(resp.orderId, resp.totalAmount),
                zalopay: () => initiateZaloPayPayment(resp.orderId, resp.totalAmount),
            };

            const initiate = gateway[p.payment.paymentMethod];
            if (initiate) {
                const pi = await initiate();
                await p.clearCart();
                if (pi.paymentUrl) {
                    window.location.href = pi.paymentUrl;
                    return { order: null, error: null, redirected: true };
                }
            } else if (p.payment.paymentMethod === 'bank_transfer') {
                try {
                    const pi = await paymentApi.initiate({ orderId: resp.orderId, amount: resp.totalAmount, provider: 4 });
                    qrUrl = pi.paymentUrl ?? null;
                } catch {
                    notify.error('Không tạo được mã QR, đơn hàng vẫn được ghi nhận.');
                }
            }

            // KHÔNG clearCart() ở đây — nơi gọi điều hướng sang trang xác nhận trước, rồi mới dọn
            // giỏ, nếu không effect "giỏ rỗng → về giỏ hàng" sẽ đá khách ra khỏi trang xác nhận.
            return {
                order: { id: resp.orderId, number: resp.orderNumber, amount: resp.totalAmount, qrUrl },
                error: null,
            };
        } catch (err) {
            const message = normalizeApiError(err).message;
            return { order: null, error: message, errorStep: stepForError(message) };
        } finally {
            setSubmitting(false);
        }
    };

    return { submit, submitting };
}
