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

export type OrderStatus = 'Pending' | 'Draft' | 'Confirmed' | 'Paid' | 'Shipped' | 'Delivered' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Refunded';
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
