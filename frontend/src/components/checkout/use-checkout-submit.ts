import { useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import { paymentApi, initiateMoMoPayment, initiateZaloPayPayment } from '../../api/payment';
import { installmentApi } from '../../api/installment';
import type { CartItem } from '../../context/CartContext';
import type { PaymentFormState, ShippingFormState } from './checkout-types';

interface UserRef { id: string }

interface SubmitParams {
    items: CartItem[];
    shipping: ShippingFormState;
    payment: PaymentFormState;
    promotionCode: string | null;
    calculatedShippingFee: number;
    shippingAmountFallback: number;
    sessionId?: string;
    user?: UserRef | null;
    isAuthenticated: boolean;
    clearCart: () => Promise<void>;
}

export interface ConfirmedOrder {
    id: string;
    number?: string;
    amount: number;
    qrUrl?: string | null;
}

/**
 * Bao gói toàn bộ luồng "Đặt hàng" cho CheckoutPage.
 * Trách nhiệm duy nhất: mapping method → API + chuyển hướng cổng thanh toán.
 * Trả về ConfirmedOrder nếu ở lại trang xác nhận (COD/bank_transfer/installment).
 */
export function useCheckoutSubmit() {
    const [submitting, setSubmitting] = useState(false);

    const submit = async (p: SubmitParams): Promise<ConfirmedOrder | null> => {
        if (submitting) return null;
        setSubmitting(true);
        try {
            const backendMethod = p.payment.paymentMethod === 'vnpay' ? 'credit_card'
                : p.payment.paymentMethod === 'installment' ? 'installment'
                : p.payment.paymentMethod;

            const shippingAddress = p.shipping.deliveryMethod === 'pickup'
                ? `Nhận tại: ${p.shipping.pickupStoreName}`
                : `${p.shipping.address}, ${p.shipping.ward}, ${p.shipping.district}, ${p.shipping.province}`;

            const shippingFee = p.shipping.deliveryMethod === 'pickup' ? 0 : (p.calculatedShippingFee || p.shippingAmountFallback);

            const commonItems = p.items.map(i => ({ productId: i.id, productName: i.name, unitPrice: i.price, quantity: i.quantity }));

            let resp;
            if (p.isAuthenticated && p.user) {
                resp = await salesApi.orders.create({
                    items: commonItems, shippingAddress, notes: p.shipping.notes,
                    couponCode: p.promotionCode ?? undefined, paymentMethod: backendMethod,
                    isPickup: p.shipping.deliveryMethod === 'pickup',
                    pickupStoreId: p.shipping.deliveryMethod === 'pickup' ? p.shipping.pickupStoreId : undefined,
                    pickupStoreName: p.shipping.deliveryMethod === 'pickup' ? p.shipping.pickupStoreName : undefined,
                    shippingFee, checkoutSessionId: p.sessionId, customerId: p.user.id,
                });
            } else {
                resp = await salesApi.orders.guestCheckout({
                    customerName: p.shipping.fullName, customerEmail: p.shipping.email, customerPhone: p.shipping.phone,
                    shippingAddress,
                    items: p.items.map(i => ({ productId: i.id, productName: i.name, price: i.price, quantity: i.quantity })),
                    couponCode: p.promotionCode ?? undefined, notes: p.shipping.notes, paymentMethod: backendMethod,
                });
            }
            if (!resp?.orderId) throw new Error('Không tạo được đơn');

            if (p.payment.paymentMethod === 'installment') {
                if (!p.payment.installmentProviderCode || !p.payment.installmentTerm) {
                    toast.error('Vui lòng chọn đối tác và kỳ hạn trả góp');
                    return null;
                }
                await installmentApi.apply({
                    orderId: resp.orderId, providerCode: p.payment.installmentProviderCode,
                    termMonths: p.payment.installmentTerm,
                    downPaymentAmount: p.payment.installmentDownPayment ?? 0,
                    monthlyPayment: p.payment.installmentMonthly ?? 0,
                    idFrontFileId: p.payment.installmentIdFrontFileId,
                    idBackFileId: p.payment.installmentIdBackFileId,
                }).catch(() => toast.error('Không nộp được hồ sơ trả góp, nhân viên sẽ liên hệ lại.'));
            }

            let qrUrl: string | null = null;

            if (p.payment.paymentMethod === 'vnpay') {
                const pi = await paymentApi.initiate({ orderId: resp.orderId, amount: resp.totalAmount, provider: 1 });
                await p.clearCart();
                if (pi.paymentUrl) { window.location.href = pi.paymentUrl; return null; }
            } else if (p.payment.paymentMethod === 'momo') {
                const pi = await initiateMoMoPayment(resp.orderId, resp.totalAmount);
                await p.clearCart();
                if (pi.paymentUrl) { window.location.href = pi.paymentUrl; return null; }
            } else if (p.payment.paymentMethod === 'zalopay') {
                const pi = await initiateZaloPayPayment(resp.orderId, resp.totalAmount);
                await p.clearCart();
                if (pi.paymentUrl) { window.location.href = pi.paymentUrl; return null; }
            } else if (p.payment.paymentMethod === 'bank_transfer') {
                try {
                    const pi = await paymentApi.initiate({ orderId: resp.orderId, amount: resp.totalAmount, provider: 4 });
                    qrUrl = pi.paymentUrl ?? null;
                } catch { toast.error('Không tạo được mã QR, đơn vẫn ghi nhận'); }
            }

            // KHÔNG clearCart() ở đây (trước đây làm vậy) — nó khiến CheckoutPage re-render với
            // items.length === 0 TRONG KHI step vẫn còn 3 (confirmedOrder/step 4 chưa kịp set ở
            // caller), và effect "giỏ rỗng → về /cart" đá thẳng khách ra khỏi trang xác nhận ngay
            // sau khi đặt hàng thành công. Giờ trả kết quả trước, caller set confirmedOrder + điều
            // hướng sang /checkout/success/:orderId RỒI mới clear giỏ (xem CheckoutPage.handleSubmit).
            toast.success('Đặt hàng thành công!');
            return { id: resp.orderId, number: resp.orderNumber, amount: resp.totalAmount, qrUrl };
        } catch (err: unknown) {
            // Bug cũ: `err instanceof Error ? err.message : ...` — AxiosError CŨNG là instance của
            // Error, nên khi guestCheckout() (không tự bọc try/catch như orders.create()) ném lỗi,
            // khách thấy nguyên văn text axios kiểu "Request failed with status code 400" thay vì
            // lý do thật từ backend (`response.data.error`/`.message`, vd "Số điện thoại không hợp lệ").
            const msg = isAxiosError(err)
                ? (err.response?.data?.error || err.response?.data?.message || err.message)
                : err instanceof Error ? err.message : 'Có lỗi khi đặt hàng';
            toast.error(msg);
            return null;
        } finally {
            setSubmitting(false);
        }
    };

    return { submit, submitting };
}
