/**
 * Sales — POS surface (W3-5). Dựng THEO `docs/api-contracts/sales-pos-returns-loyalty.md` §1,
 * không phải theo code client cũ: màn hình quầy KHÔNG BAO GIỜ gửi tiền lên
 * (không `unitPrice`, không `total`) — server tính hết, client chỉ đọc lại.
 *
 * `POST /sales/staff-checkout` (bản W1-9) đã bị bỏ: đó là luồng web có phí ship,
 * POS thật là `/sales/pos/quote` + `/sales/pos/orders` của W2-10.
 */
import client from '../client';

/* ---------------------------------------------------------------- requests */

export interface PosLine {
    productId: string;
    quantity: number;
    variantId?: string | null;
    /** Serial máy giao cho khách (hàng quản lý serial). Rỗng với hàng thường. */
    serials?: string[];
}

/** `Cash` có tiền thối; các hình thức khác đưa dư là lỗi nhập liệu (contract §1). */
export type PosTenderMethod = 'Cash' | 'Card' | 'Transfer' | 'SePay';

export interface PosTender {
    method: PosTenderMethod;
    amount: number;
    /** Chỉ có nghĩa với tiền mặt. */
    tenderedAmount?: number;
    /** Mã đối soát: số giao dịch máy POS / mã VietQR. Bắt buộc với Card-Transfer. */
    reference?: string | null;
}

export interface PosQuoteRequest {
    lines: PosLine[];
    customerId?: string | null;
    manualDiscount?: number;
    promotionCodes?: string[];
}

export interface PosSaleRequest extends PosQuoteRequest {
    storeId: string;
    shiftId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    manualDiscountReason?: string | null;
    approvedBy?: string | null;
    tenders: PosTender[];
    notes?: string | null;
    heldOrderId?: string | null;
}

/* --------------------------------------------------------------- responses */

export interface PosQuoteLine {
    productId: string;
    variantId: string | null;
    productName: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    grossBeforeDiscount: number;
    lineDiscount: number;
    allocatedOrderDiscount: number;
    payable: number;
    vatRate: number;
    vatAmount: number;
}

export interface PosVatBucket { rate: number; net: number; vat: number }

export interface PosQuoteResult {
    lines: PosQuoteLine[];
    subtotal: number;
    discount: number;
    manualDiscountApplied: number;
    taxAmount: number;
    total: number;
    vatBreakdown: PosVatBucket[];
    warnings: string[];
}

export interface PosSaleResult {
    orderId: string;
    orderNumber: string;
    total: number;
    collected: number;
    amountDue: number;
    changeDue: number;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    isDeposit: boolean;
    loyaltyPointsEarned: number;
}

export interface PosCustomer {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    alreadyExisted?: boolean;
}

export interface PosHeldOrderHeader {
    id: string;
    label: string;
    storeId: string;
    shiftId: string | null;
    customerId: string | null;
    customerName: string | null;
    customerPhone: string | null;
    estimatedTotal: number;
    notes: string | null;
    createdAt: string;
    resumedOrderId: string | null;
}

export interface PosHeldOrderDetail {
    header: PosHeldOrderHeader;
    lines: PosLine[];
}

export interface PosHoldRequest {
    label: string;
    storeId: string;
    lines: PosLine[];
    estimatedTotal?: number;
    shiftId?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    notes?: string | null;
}

/* -------------------------------------------------------------------- api */

export const salesPosApi = {
    /** Tạm tính — không ghi CSDL, không giữ tồn. Mọi con số tiền của màn hình lấy từ đây. */
    quote: async (data: PosQuoteRequest) => {
        const res = await client.post<PosQuoteResult>('/sales/pos/quote', data);
        return res.data;
    },

    /** Chốt đơn tại quầy: trừ tồn, ghi tender, phát hoá đơn. 201. */
    createOrder: async (data: PosSaleRequest) => {
        const res = await client.post<PosSaleResult>('/sales/pos/orders', data);
        return res.data;
    },

    /** Tìm khách qua IUserDirectory (KHÔNG dùng `/auth/users` — vai trò Sale không có quyền đó). */
    searchCustomers: async (q: string, limit = 20) => {
        const res = await client.get<{ total: number; items: PosCustomer[] }>('/sales/pos/customers', {
            params: { q, limit },
        });
        return res.data;
    },

    /** Tạo nhanh khách ở quầy. Backend bắt buộc email (contract §1). */
    createCustomer: async (data: { fullName: string; phone?: string; email: string }) => {
        const res = await client.post<PosCustomer>('/sales/pos/customers', data);
        return res.data;
    },

    heldOrders: {
        list: async (params: { storeId?: string; shiftId?: string }) => {
            const res = await client.get<{ total: number; items: PosHeldOrderHeader[] }>(
                '/sales/pos/held-orders',
                { params }
            );
            return res.data;
        },
        get: async (id: string) => {
            const res = await client.get<PosHeldOrderDetail>(`/sales/pos/held-orders/${id}`);
            return res.data;
        },
        create: async (data: PosHoldRequest) => {
            const res = await client.post<PosHeldOrderHeader>('/sales/pos/held-orders', data);
            return res.data;
        },
        remove: async (id: string) => {
            await client.delete(`/sales/pos/held-orders/${id}`);
        },
    },
};
