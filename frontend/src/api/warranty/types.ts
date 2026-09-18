/**
 * Warranty — enums + claim/coverage types shared by `public.ts` and the
 * `admin-*.ts` files. Moved verbatim out of the old flat `api/warranty.ts`
 * (W1-9, step 7c); `api/warranty.ts` re-exports everything split out of it.
 * RMA/loaner/policy/receipt types (admin-only) are colocated in their own
 * admin file instead of here — see that file's header.
 */

// Plain const objects instead of `enum`: tsconfig bật `erasableSyntaxOnly`
// (enum sinh mã runtime nên không hợp lệ). Vẫn dùng được cả ở vị trí giá trị và kiểu.
// W3-15 fix: real backend lifecycle (`docs/api-contracts/warranty.md`) is
// Pending -> Approved -> InProgress -> Resolved (or Rejected from Pending/
// Approved). The previous `Assigned`/`Processing`/`Completed` values never
// existed on the backend, so status-gated UI (e.g. the "Hoàn tất claim"
// button) never matched a real claim and the lifecycle looked stuck.
export const ClaimStatus = {
    Pending: 'Pending',
    Approved: 'Approved',
    InProgress: 'InProgress',
    Rejected: 'Rejected',
    Resolved: 'Resolved',
} as const;

export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export const ResolutionPreference = {
    Repair: 'Repair',
    Replace: 'Replace',
    Refund: 'Refund'
} as const;

export type ResolutionPreference = (typeof ResolutionPreference)[keyof typeof ResolutionPreference];

// Loại xử lý claim (khớp backend)
export const ClaimType = {
    RepairAtShop: 'RepairAtShop',                 // Sửa tại shop
    SendToManufacturer: 'SendToManufacturer',     // Gửi hãng (RMA)
    ExchangeNew: 'ExchangeNew',                   // Đổi mới
    Refuse: 'Refuse',                             // Từ chối
} as const;

export type ClaimType = (typeof ClaimType)[keyof typeof ClaimType];

export const WarrantyProvider = {
    Manufacturer: 'Manufacturer',
    Store: 'Store',
} as const;

export type WarrantyProvider = (typeof WarrantyProvider)[keyof typeof WarrantyProvider];

// RMA
export const RmaStatus = {
    Draft: 'Draft',
    Sent: 'Sent',
    Received: 'Received',
    Closed: 'Closed',
    Cancelled: 'Cancelled',
} as const;

export type RmaStatus = (typeof RmaStatus)[keyof typeof RmaStatus];

export const RmaResult = {
    Repaired: 'Repaired',
    Replaced: 'Replaced',
    Refunded: 'Refunded',
    Rejected: 'Rejected',
} as const;

export type RmaResult = (typeof RmaResult)[keyof typeof RmaResult];

// Loaner
export const LoanerStatus = {
    Loaned: 'Loaned',
    Returned: 'Returned',
    Lost: 'Lost',
} as const;

export type LoanerStatus = (typeof LoanerStatus)[keyof typeof LoanerStatus];

export interface WarrantyClaim {
    id: string;
    serialNumber: string;
    serialNumberId?: string;
    productId?: string;
    productName?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    issueDescription: string;
    status: ClaimStatus;
    claimType?: ClaimType;
    filedDate: string;
    resolvedDate?: string;
    resolutionNotes?: string;
    preferredResolution: ResolutionPreference;
    attachmentUrls?: string[];
    isManagerOverride?: boolean;
    slaDeadline?: string;
    slaTargetHours?: number;
    slaElapsedPercent?: number;
    slaWarning?: boolean;
    workOrderId?: string;
    rmaId?: string;
    loanerDeviceId?: string;
    warrantyProvider?: WarrantyProvider;
    accessoriesReceived?: string;
    receivedCondition?: string;
    technicianId?: string;
    technicianName?: string;
    /**
     * D08 §4 "hai lớp thời gian" (binding, phase-63 decision update): the
     * PUBLISHED deadline printed on the receipt — the Đ30.2.đ legal trigger —
     * is `committedTurnaroundDays` counted from `deviceReceivedAt`. This is
     * NEVER the same number as the internal SLA (`slaTargetHours` etc. above,
     * ops-only, never shown to the customer). Set by POST .../assign.
     */
    deviceReceivedAt?: string;
    deviceReturnedAt?: string;
    committedTurnaroundDays?: number;
    /** Only present on the POST .../resolve response — D08 "3 lần" rule (query, not a stored flag). */
    resolvedClaimCountForSerial?: number;
    eligibleForReplaceOrRefund?: boolean;
}

export interface ClaimHistoryItem {
    id: string;
    issueDescription: string;
    status: ClaimStatus;
    filedDate: string;
    resolvedDate?: string;
    preferredResolution: ResolutionPreference;
}

export interface WarrantyCoverage {
    serialNumber: string;
    productId: string;
    productName?: string;
    orderNumber?: string;
    status: string;
    expirationDate: string;
    purchaseDate: string;
    warrantyPeriodMonths: number;
    isValid: boolean;
    claimHistory: ClaimHistoryItem[];
    warrantyProvider?: WarrantyProvider;
    error?: string;
}
