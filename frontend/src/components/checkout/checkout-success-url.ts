import type { ConfirmedOrder } from './use-checkout-submit';
import type { PaymentMethod } from './checkout-types';

/**
 * Xây URL `/checkout/success/:orderId` mang theo đủ dữ liệu hiển thị qua query string
 * (không chỉ router `state`) để một lần RELOAD vẫn còn xem được xác nhận đơn — kể cả
 * với khách vãng lai (guest), vì `GET /sales/orders/{id}` yêu cầu đăng nhập và chỉ trả
 * đơn của đúng customer đó (xem `checkout-success-page.tsx`). Số đơn/tổng tiền không
 * phải dữ liệu nhạy cảm nên đặt trên URL là chấp nhận được.
 */
export function buildCheckoutSuccessUrl(order: ConfirmedOrder, paymentMethod: PaymentMethod, guestEmail?: string): string {
    const params = new URLSearchParams({ amount: String(order.amount), method: paymentMethod });
    if (order.number) params.set('number', order.number);
    if (order.qrUrl) params.set('qr', order.qrUrl);
    if (guestEmail) params.set('guestEmail', guestEmail);
    return `/checkout/success/${order.id}?${params.toString()}`;
}

export interface ParsedCheckoutSuccess {
    number?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    qrUrl?: string;
    guestEmail?: string;
}

export function parseCheckoutSuccessParams(params: URLSearchParams): ParsedCheckoutSuccess | null {
    const amountRaw = params.get('amount');
    if (amountRaw === null) return null;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) return null;
    return {
        number: params.get('number') ?? undefined,
        amount,
        paymentMethod: (params.get('method') as PaymentMethod) || 'cod',
        qrUrl: params.get('qr') ?? undefined,
        guestEmail: params.get('guestEmail') ?? undefined,
    };
}
