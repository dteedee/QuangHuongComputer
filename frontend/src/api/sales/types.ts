/**
 * Sales — core types shared across `cart-checkout.ts`, `account-orders.ts`,
 * `admin-orders.ts` and `returns-admin.ts`. Moved verbatim out of the old
 * flat `api/sales.ts` (W1-9, step 7c). Narrowly-scoped types (checkout DTOs,
 * cart, checkout session, stats, loyalty) live colocated in the file that
 * actually uses them instead of here — see that file's header comment.
 */

export interface Order {
    id: string;
    orderNumber: string;
    customerId: string;
    /** W0-13: backend /sales/admin/orders đã trả các field này (SalesEndpoints.cs:1430-1433) - trước đây type thiếu nên dashboard hiện GUID thay vì tên khách. */
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    /** `Web|Guest|Pos|Quotation` — list rows carry it (W3-10, admin orders columns). */
    channel?: string;
    /** List rows: what's still owed — `docs/api-contracts/sales-pos-returns-loyalty.md` §4. */
    collected?: number;
    amountDue?: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    shippingAmount: number;
    totalAmount: number;
    taxRate: number;
    couponCode?: string;
    couponSnapshot?: string;
    shippingAddress: string;
    notes?: string;

    // Enhanced fields
    customerIp?: string;
    customerUserAgent?: string;
    internalNotes?: string;
    sourceId?: string;
    affiliateId?: string;
    discountReason?: string;
    deliveryTrackingNumber?: string;
    deliveryCarrier?: string;
    retryCount: number;
    failureReason?: string;

    // Timestamps
    orderDate: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    paidAt?: string;
    fulfilledAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;

    items: OrderItem[];
}

export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    productSku?: string;
    unitPrice: number;
    originalPrice?: number;
    quantity: number;
    discountAmount: number;
    lineTotal: number;
}

/**
 * NOTE (W3-10): `docs/api-contracts/sales-orders.md` §1's state table also
 * lists `Fulfilled` as an order status (packed/ready to ship, between
 * Paid/Confirmed and Shipped). NOT added to this union on purpose — it is a
 * shared type with exhaustive `Record<OrderStatus, …>` maps in
 * `AccountPage.tsx`/`account/OrdersPage.tsx` (outside this track's
 * ownership) that would need a matching entry each; widening it here broke
 * `fe-tsc` for files this track may not edit. Filed as an integration
 * request instead (see `reports/integration-requests-w3.md`) for whichever
 * track owns those two files to add the case. Order-detail code in this
 * track treats `status` as `OrderStatus | 'Fulfilled'` where it matters
 * (`order-action-bar.tsx`, `order-state-machine.ts`).
 */
export type OrderStatus = 'Pending' | 'Draft' | 'Confirmed' | 'Paid' | 'Shipped' | 'Delivered' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'PartiallyPaid' | 'Processing' | 'Paid' | 'Failed' | 'Refunded';
export type FulfillmentStatus = 'Pending' | 'Processing' | 'Fulfilled' | 'Shipped' | 'Delivered';

// Order History
export interface OrderHistory {
    id: string;
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    notes?: string;
    changedBy?: string;
    changedAt: string;
}

/**
 * Admin order detail — shape from `GET /api/sales/admin/orders/{id}`
 * (`docs/api-contracts/sales-pos-returns-loyalty.md` §4). Distinct from the
 * flat `Order` above (list rows / storefront) — this is the rich drawer view
 * with money breakdown, shipping, POS info, payments and history (W3-10).
 */
/** Field names verified against TEST :5050 `GET /sales/admin/orders/{id}` (2026-09-18). */
export interface OrderDetailMoney {
    subtotalAmount: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    totalAmount: number;
    collected: number;
    amountDue: number;
}

export interface OrderDetailShipping {
    shippingAddress?: string;
    isPickup?: boolean;
    pickupStoreName?: string;
    deliveryCarrier?: string;
    deliveryTrackingNumber?: string;
}

export interface OrderDetailPos {
    storeId?: string;
    shiftId?: string;
    cashierId?: string;
}

export interface OrderDetailDates {
    orderDate: string;
    confirmedAt?: string;
    paidAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    completedAt?: string;
    cancelledAt?: string;
}

export interface OrderDetailItem {
    id: string;
    productId: string;
    productName: string;
    productSku?: string;
    variantId?: string;
    variantName?: string;
    unitPrice: number;
    quantity: number;
    /** Giảm giá phân bổ về dòng này (D01 — khớp số sẽ in trên hoá đơn). */
    discountAmount?: number;
    vatRate?: number;
    vatAmount?: number;
    isGift?: boolean;
    lineTotal: number;
}

export interface OrderDetailPayment {
    id: string;
    method: string;
    amount: number;
    tenderedAmount?: number;
    changeAmount?: number;
    reference?: string;
    receivedBy?: string;
    receivedAt: string;
    isReversed?: boolean;
}

export interface OrderDetailHistoryEntry {
    id: string;
    fromStatus?: string;
    toStatus: string;
    notes?: string;
    changedBy?: string;
    createdAt: string;
}

export interface OrderAllowedTransition {
    status: OrderStatus;
    label: string;
}

export interface OrderTransitionsDto {
    status: OrderStatus;
    statusLabel: string;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    isCreditOrder: boolean;
    allowedNext: OrderAllowedTransition[];
}

/** D07 — số hoá đơn, mã tra cứu, trạng thái HĐĐT hiển thị trên đơn. */
export interface OrderInvoiceInfo {
    invoiceId?: string;
    invoiceNumber?: string;
    lookupCode?: string;
    eInvoiceStatus?: string;
    buyerName?: string;
    buyerTaxCode?: string;
    buyerAddress?: string;
    buyerEmail?: string;
    canEditBuyer?: boolean;
}

export interface OrderDetail {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    channel?: string;
    notes?: string;
    internalNotes?: string;
    cancellationReason?: string;
    customer: {
        customerId?: string;
        name?: string;
        phone?: string;
        email?: string;
    };
    money: OrderDetailMoney;
    shipping: OrderDetailShipping;
    pos?: OrderDetailPos;
    dates: OrderDetailDates;
    items: OrderDetailItem[];
    payments: OrderDetailPayment[];
    history: OrderDetailHistoryEntry[];
    /**
     * The detail response's OWN transitions list — quirk verified on TEST
     * :5050: it keys the status as `value`, not `status` (inconsistent with
     * the dedicated `GET .../transitions` endpoint below, which uses
     * `status`). The action bar always prefers the dedicated endpoint's
     * `allowedNext` and only falls back to this one, so the field is typed
     * loosely rather than forced into `OrderAllowedTransition`.
     */
    allowedTransitions?: { value: string; label: string }[];
}

export type ReturnType = 'Refund' | 'Exchange' | 'Replace';

/**
 * Tình trạng hàng nhận về khi nhân viên kiểm hàng (Phase 07).
 * Backend map sang WarehouseType:
 *  - Intact              -> Main (bán lại giá gốc)
 *  - UsedGood            -> Returns (bán lại "hàng trưng bày")
 *  - DefectiveTechnical  -> Defective (gửi hãng RMA)
 *  - UserDamage          -> Defective (từ chối hoàn hoặc trừ tiền)
 *  - MissingAccessories  -> Returns (trừ tiền phụ kiện)
 */
export type ReceivedCondition =
    | 'Intact'
    | 'UsedGood'
    | 'DefectiveTechnical'
    | 'UserDamage'
    | 'MissingAccessories';

/**
 * Trạng thái yêu cầu đổi trả.
 * Backend Phase 07 có thể trả thêm 'Inspecting' | 'Processing' (giữa Approved và Completed).
 * Để tránh phá vỡ các `Record<ReturnStatus,...>` exhaustive ở backoffice, giữ union hẹp;
 * các trạng thái mở rộng sẽ đến dưới dạng string và được xử lý bằng lookup có fallback.
 */
export type ReturnStatus =
    | 'Pending'
    | 'Approved'
    | 'Rejected'
    | 'Refunded'
    | 'Completed'
    | 'Cancelled';

export interface ReturnRequest {
    id: string;
    orderId: string;
    orderItemId: string;
    type: ReturnType;
    reason: string;
    description?: string;
    status: ReturnStatus;
    refundAmount: number;
    refundMethod?: string;
    requestedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    refundedAt?: string;
    processedBy?: string;
    customerNotes?: string;

    // Exchange fields
    exchangeProductId?: string;
    exchangeVariantId?: string;
    exchangeOrderId?: string;
    exchangeProductName?: string;
    priceDifference?: number;

    // Attachments
    attachmentUrls?: string[];

    // Product info (denormalized for detail view)
    orderNumber?: string;
    productName?: string;
    productSku?: string;
    quantity?: number;
    unitPrice?: number;
}

export interface ReturnTimelineEvent {
    status: ReturnStatus;
    label: string;
    at?: string;
    note?: string;
}

export interface ReturnRequestDetail extends ReturnRequest {
    timeline?: ReturnTimelineEvent[];
}

export interface CreateReturnRequestDto {
    orderItemId: string;
    type: ReturnType;
    reason: string;
    description?: string;
    exchangeProductId?: string;
    exchangeVariantId?: string;
    attachmentUrls?: string[];
}

export interface ReturnPolicy {
    id?: string;
    categoryId?: string;
    daysForReturn: number;
    daysForExchange: number;
    daysForDefectReplace: number;
    requireOriginalPackaging: boolean;
    requireAllAccessories: boolean;
    restockingFeePercent: number;
    excludedCategories?: string[];
}
