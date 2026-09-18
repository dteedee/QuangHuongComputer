/**
 * Sales — POS surface. NEW file (W1-9, step 7c) — the old flat `api/sales.ts`
 * had no POS-specific functions at all; `pages/backoffice/sale/POSPage.tsx`
 * currently only calls `catalogApi`/`adminApi` and never submits a sale.
 *
 * `POST /api/sales/staff-checkout` is a REAL, already-shipped backend
 * endpoint (`Sales/Validators/CheckoutValidators.cs` -> `StaffCheckoutDtoValidator`,
 * confirmed by reading the backend source, not guessed) that nothing on the
 * frontend calls yet. This wraps it for the wave-3 POS track — real code
 * against a real route, not a mock (D12 rule 7).
 */
import client from '../client';
import type { Order } from './types';

export interface StaffCheckoutItemDto {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
}

export interface StaffCheckoutDto {
    items: StaffCheckoutItemDto[];
    /** Bắt buộc trừ khi `isPickup`. */
    shippingAddress?: string;
    isPickup?: boolean;
    customerId?: string;
    /** SĐT người nhận — validate theo `^(0|+84)[0-9]{9,10}$` ở backend khi có. */
    recipientPhone?: string;
    recipientName?: string;
    /** Giảm giá tay, backend yêu cầu >= 0. */
    manualDiscount?: number;
    /** Phí vận chuyển, backend yêu cầu >= 0. */
    shippingFee?: number;
    paymentMethod?: string;
    notes?: string;
}

export const salesPosApi = {
    /** Chốt đơn tại quầy (nhân viên, không qua giỏ hàng khách). */
    checkout: async (data: StaffCheckoutDto) => {
        const response = await client.post<{ orderId: string; orderNumber: string; totalAmount: number; status: string }>(
            '/sales/staff-checkout',
            data
        );
        return response.data;
    },

    /** Tra đơn vừa tạo tại quầy (dùng chung endpoint chi tiết đơn). */
    getOrder: async (id: string) => {
        const response = await client.get<Order>(`/sales/orders/${id}`);
        return response.data;
    },
};
