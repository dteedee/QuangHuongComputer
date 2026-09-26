/**
 * Repair — types + display helpers shared by `public.ts` and `admin.ts`.
 * Moved verbatim out of the old flat `api/repair.ts` (W1-9, step 7c);
 * `api/repair.ts` re-exports everything here.
 *
 * `getTimeSlotLabel` also fixes wave-0 integration request #60
 * (`reports/integration-requests-w0.md`): the old labels were hardcoded
 * English AM/PM strings on a Vietnamese storefront (standing rule 8).
 */

export type ServiceType = 'InShop' | 'OnSite';
export type ServiceLocation = 'CustomerHome' | 'CustomerOffice' | 'School' | 'Government' | 'Other';
export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening';
export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Converted' | 'NoShow';
export type { WorkOrderPriority } from './work-order-priority';
export type { RepairQuote } from './quote-types';
import type { WorkOrderPriority } from './work-order-priority';
export type QuoteStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired';

export type WorkOrderStatus =
    | 'Requested'
    | 'Assigned'
    | 'Declined'
    | 'Diagnosed'
    | 'Quoted'
    | 'AwaitingApproval'
    | 'Approved'
    | 'Rejected'
    | 'InProgress'
    | 'OnHold'
    | 'Completed'
    | 'Cancelled'
    | 'ReadyForPickup'
    | 'Paid'
    | 'Delivered';

export interface ServiceBooking {
    id: string;
    /** LH-yyyyMM-##### — human-readable booking number. */
    bookingNumber: string;
    serviceTypeId: string;
    serviceTypeName?: string | null;
    customerId: string;
    organizationId?: string;
    serviceType: ServiceType;
    deviceModel: string;
    serialNumber?: string;
    issueDescription: string;
    imageUrls?: string[];
    videoUrls?: string[];
    preferredDate: string;
    preferredTimeSlot: TimeSlot;
    serviceAddress?: string;
    locationType?: ServiceLocation;
    locationNotes?: string;
    estimatedCost: number;
    onSiteFee: number;
    acceptedTerms: boolean;
    termsAcceptedAt?: string;
    status: BookingStatus;
    workOrderId?: string;
    allowPayLater: boolean;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    createdAt: string;
}

export interface WorkOrder {
    id: string;
    ticketNumber: string;
    customerId: string;
    deviceModel: string;
    serialNumber?: string;
    description: string;
    status: WorkOrderStatus;
    priority?: WorkOrderPriority;
    deviceType?: string | null;
    deviceBrand?: string | null;
    accessoriesReceived?: string[];
    intakePhotoUrls?: string[];
    serviceTypeId?: string | null;
    technicianId?: string;
    serviceType?: ServiceType;
    serviceAddress?: string;
    estimatedCost: number;
    actualCost: number;
    partsCost: number;
    laborCost: number;
    serviceFee: number;
    totalCost: number;
    technicalNotes?: string;
    serviceBookingId?: string;
    currentQuoteId?: string;
    createdAt: string;
    assignedAt?: string;
    diagnosedAt?: string;
    quotedAt?: string;
    approvedAt?: string;
    startedAt?: string;
    finishedAt?: string;
    /**
     * W2-13 new (contract `docs/api-contracts/repair.md`). Fixed 2026-09-19
     * (adversarial verification of W3-15): `WorkOrder.cs` has no
     * `ReadyForPickupAt` (the transition only flips `Status`), and the
     * handover stamps are `HandoverAt`/`HandoverReceivedByName`, not
     * `deliveredAt`/`receivedByName` — the previous names never matched a
     * real API response, so the "delivered at / received by" line in
     * `work-order-payment-handover-panel.tsx` always rendered blank.
     */
    paidAt?: string;
    paymentReference?: string;
    handoverAt?: string;
    handoverReceivedByName?: string;
}

export interface WorkOrderPart {
    id: string;
    workOrderId: string;
    /** null ⇒ bought-in part (not from stock, never touches the stock ledger). */
    inventoryItemId?: string | null;
    isBoughtIn?: boolean;
    partName: string;
    partNumber?: string;
    serialNumber?: string | null;
    /** Cost price of a bought-in part (VND). */
    unitCost?: number | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface ActivityLog {
    id: string;
    workOrderId: string;
    activity: string;
    description?: string;
    previousStatus?: WorkOrderStatus;
    newStatus?: WorkOrderStatus;
    performedByName?: string;
    photoStage?: 'Before' | 'After' | null;
    photoUrls?: string[];
    createdAt: string;
}

// ============================================
// Helper Functions
// ============================================
export const getStatusColor = (status: WorkOrderStatus): string => {
    const colors: Record<WorkOrderStatus, string> = {
        Requested: 'bg-blue-100 text-blue-800',
        Assigned: 'bg-purple-100 text-purple-800',
        Declined: 'bg-red-100 text-red-800',
        Diagnosed: 'bg-cyan-100 text-cyan-800',
        Quoted: 'bg-indigo-100 text-indigo-800',
        AwaitingApproval: 'bg-yellow-100 text-yellow-800',
        Approved: 'bg-green-100 text-green-800',
        Rejected: 'bg-red-100 text-red-800',
        InProgress: 'bg-blue-100 text-blue-800',
        OnHold: 'bg-orange-100 text-orange-800',
        Completed: 'bg-green-100 text-green-800',
        Cancelled: 'bg-gray-100 text-gray-800',
        ReadyForPickup: 'bg-teal-100 text-teal-800',
        Paid: 'bg-lime-100 text-lime-800',
        Delivered: 'bg-slate-200 text-slate-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

/** Vietnamese labels for `WorkOrderStatus` — single source, no duplicate maps per page. */
export const getWorkOrderStatusLabel = (status: WorkOrderStatus): string => {
    const labels: Record<WorkOrderStatus, string> = {
        Requested: 'Chờ tiếp nhận',
        Assigned: 'Đã phân công',
        Declined: 'Đã từ chối',
        Diagnosed: 'Đã chẩn đoán',
        Quoted: 'Đã báo giá',
        AwaitingApproval: 'Chờ duyệt báo giá',
        Approved: 'Đã duyệt báo giá',
        Rejected: 'Báo giá bị từ chối',
        InProgress: 'Đang sửa',
        OnHold: 'Tạm dừng',
        Completed: 'Đã hoàn thành',
        Cancelled: 'Đã hủy',
        ReadyForPickup: 'Sẵn sàng trả máy',
        Paid: 'Đã thanh toán',
        Delivered: 'Đã trả máy',
    };
    return labels[status] || status;
};

/** Vietnamese labels, 24h format — was hardcoded English AM/PM (IR #60, w0). */
export const getTimeSlotLabel = (slot: TimeSlot): string => {
    const labels: Record<TimeSlot, string> = {
        Morning: 'Buổi sáng (8:00 - 12:00)',
        Afternoon: 'Buổi chiều (13:00 - 17:00)',
        Evening: 'Buổi tối (17:00 - 20:00)',
    };
    return labels[slot];
};
