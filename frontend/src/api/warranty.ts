import client from './client';

// Plain const objects instead of `enum`: tsconfig bật `erasableSyntaxOnly`
// (enum sinh mã runtime nên không hợp lệ). Vẫn dùng được cả ở vị trí giá trị và kiểu.
export const ClaimStatus = {
    Pending: 'Pending',
    Approved: 'Approved',
    Rejected: 'Rejected',
    Resolved: 'Resolved',
    Assigned: 'Assigned',
    Processing: 'Processing',
    Completed: 'Completed',
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

export interface CreateClaimRequest {
    serialNumber: string;
    issueDescription: string;
    preferredResolution?: ResolutionPreference;
    attachmentUrls?: string[];
    isManagerOverride?: boolean;
    accessoriesReceived?: string;
    receivedCondition?: string;
}

export interface AssignClaimRequest {
    claimType: ClaimType;
    technicianId?: string;
    workOrderId?: string;
    notes?: string;
}

export interface CompleteClaimRequest {
    result: string;
    notes: string;
}

export interface RegisterWarrantyRequest {
    productId: string;
    serialNumber: string;
    purchaseDate: string;
    warrantyPeriodMonths: number;
    orderNumber?: string;
    provider?: WarrantyProvider;
}

// ============ Phase 07: Public lookup (không PII, không đăng nhập) ============

export interface PublicWarrantyActiveClaim {
    id: string;
    status: ClaimStatus;
    filedDate: string;
    estimatedCompletionDate?: string;
}

export interface PublicWarrantyEntry {
    provider: WarrantyProvider;
    isValid: boolean;
    expiresAt: string;
    warrantyPeriodMonths?: number;
    activeClaim?: PublicWarrantyActiveClaim | null;
}

export interface PublicWarrantyLookupResult {
    found: boolean;
    /** Tên sản phẩm ngắn gọn (không tiết lộ PII khách hàng). */
    productName?: string;
    /** Có thể có nhiều bản ghi (hãng + shop). */
    warranties: PublicWarrantyEntry[];
    /** Nếu quá rate-limit / cần captcha, backend trả cờ này. */
    requiresCaptcha?: boolean;
    /** Retry-After (giây) nếu bị rate limit. */
    retryAfterSeconds?: number;
}

// RMA
export interface RmaItem {
    id?: string;
    serialNumber: string;
    productName?: string;
    issue: string;
    warrantyClaimId?: string;
}

export interface WarrantyRma {
    id: string;
    code: string;
    supplierId: string;
    supplierName?: string;
    externalRmaCode?: string;
    status: RmaStatus;
    result?: RmaResult;
    sentDate?: string;
    expectedReturnDate?: string;
    actualReturnDate?: string;
    notes?: string;
    isOverdue: boolean;
    items: RmaItem[];
    createdAt: string;
}

export interface CreateRmaRequest {
    supplierId: string;
    items: RmaItem[];
    notes?: string;
}

export interface SendRmaRequest {
    externalRmaCode: string;
    expectedReturnDate: string;
}

export interface ReceiveRmaRequest {
    result: RmaResult;
    notes?: string;
}

// Loaner
export interface LoanerDevice {
    id: string;
    serialNumberId: string;
    serialNumber?: string;
    productName?: string;
    customerId: string;
    customerName?: string;
    customerPhone?: string;
    warrantyClaimId?: string;
    warrantyClaimCode?: string;
    loanedDate: string;
    expectedReturnDate: string;
    actualReturnDate?: string;
    conditionAtLoan?: string;
    conditionAtReturn?: string;
    status: LoanerStatus;
    isOverdue: boolean;
    notes?: string;
}

export interface CreateLoanerRequest {
    serialNumberId: string;
    customerId: string;
    warrantyClaimId?: string;
    expectedReturnDate: string;
    conditionAtLoan?: string;
    notes?: string;
}

export interface ReturnLoanerRequest {
    conditionAtReturn: string;
    notes?: string;
}

// Warranty Policy
export interface WarrantyPolicy {
    id: string;
    name: string;
    scope: string;
    exclusions: string[];
    durationMonths: number;
    provider: WarrantyProvider;
    categoryId?: string;
    categoryName?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateWarrantyPolicyRequest {
    name: string;
    scope: string;
    exclusions: string[];
    durationMonths: number;
    provider: WarrantyProvider;
    categoryId?: string;
    isActive?: boolean;
}

// Warranty Receipt (JSON để render tay)
export interface WarrantyReceiptData {
    claimId: string;
    claimCode: string;
    receiptNumber: string;
    issueDate: string;
    customer: {
        name: string;
        phone: string;
        email?: string;
    };
    product: {
        name: string;
        sku?: string;
        serialNumber: string;
    };
    issueDescription: string;
    accessoriesReceived?: string;
    receivedCondition?: string;
    attachmentUrls: string[];
    qrCodeUrl: string;
    lookupUrl: string;
    slaDeadline?: string;
    warrantyProvider?: WarrantyProvider;
}

// Filters
export interface ClaimListFilter {
    status?: ClaimStatus;
    claimType?: ClaimType;
    slaWarning?: boolean;
    startDate?: string;
    endDate?: string;
    serialNumber?: string;
}

export const warrantyApi = {
    // Customer endpoints
    getMyClaims: async () => {
        const response = await client.get<WarrantyClaim[]>('/warranty/claims');
        return response.data;
    },

    createClaim: async (data: CreateClaimRequest) => {
        const response = await client.post<{ id: string; status: string; message: string }>('/warranty/claims', data);
        return response.data;
    },

    registerWarranty: async (data: RegisterWarrantyRequest) => {
        const response = await client.post('/warranty/register', data);
        return response.data;
    },

    lookupCoverage: async (serialNumber: string) => {
        try {
            const response = await client.get<WarrantyCoverage>(`/warranty/lookup/serial/${serialNumber}`);
            return response.data;
        } catch (error) {
            const err = error as { response?: { status?: number } };
            if (err.response?.status === 404) {
                throw new Error('Không tìm thấy bảo hành cho serial này');
            }
            throw error;
        }
    },

    lookupByInvoice: async (orderNumber: string) => {
        try {
            const response = await client.get<WarrantyCoverage[]>(`/warranty/lookup/invoice/${orderNumber}`);
            return response.data;
        } catch (error) {
            const err = error as { response?: { status?: number } };
            if (err.response?.status === 404) {
                throw new Error('Không tìm thấy bảo hành cho hóa đơn này');
            }
            throw error;
        }
    },

    lookupLegacy: async (serialNumber: string) => {
        const response = await client.get<{
            serialNumber: string;
            productId: string;
            status: string;
            expirationDate: string;
            isValid: boolean;
        }>(`/warranty/lookup/${serialNumber}`);
        return response.data;
    },

    // ============ Phase 07: Public lookup (không đăng nhập, KHÔNG PII) ============

    /**
     * Tra cứu bảo hành công khai bằng Serial.
     * Backend rate-limit 10/phút/IP. Chỉ trả cờ hạn/còn hạn — KHÔNG tiết lộ tên/SĐT/địa chỉ khách.
     */
    publicLookupBySerial: async (
        serial: string,
        captchaToken?: string,
    ): Promise<PublicWarrantyLookupResult> => {
        const params: Record<string, string> = { serial };
        if (captchaToken) params.captchaToken = captchaToken;
        const response = await client.get<PublicWarrantyLookupResult>('/public/warranty/lookup', { params });
        return response.data;
    },

    /**
     * Tra cứu bảo hành công khai bằng SĐT + mã đơn hàng (cross-verify).
     */
    publicLookupByPhone: async (
        phone: string,
        orderNumber: string,
        captchaToken?: string,
    ): Promise<PublicWarrantyLookupResult> => {
        const params: Record<string, string> = { phone, orderNumber };
        if (captchaToken) params.captchaToken = captchaToken;
        const response = await client.get<PublicWarrantyLookupResult>('/public/warranty/lookup-by-phone', { params });
        return response.data;
    },

    // Admin endpoints
    admin: {
        getAllWarranties: async () => {
            const response = await client.get<WarrantyCoverage[]>('/warranty/admin/warranties');
            return response.data;
        },

        // Claim Management
        getAllClaims: async (filter?: ClaimListFilter) => {
            const params = new URLSearchParams();
            if (filter?.status) params.append('status', filter.status);
            if (filter?.claimType) params.append('claimType', filter.claimType);
            if (filter?.slaWarning) params.append('slaWarning', 'true');
            if (filter?.startDate) params.append('startDate', filter.startDate);
            if (filter?.endDate) params.append('endDate', filter.endDate);
            if (filter?.serialNumber) params.append('serialNumber', filter.serialNumber);
            const response = await client.get<WarrantyClaim[]>(`/warranty/admin/claims?${params.toString()}`);
            return response.data;
        },

        getClaimById: async (id: string) => {
            const response = await client.get<WarrantyClaim>(`/warranty/admin/claims/${id}`);
            return response.data;
        },

        approveClaim: async (id: string) => {
            const response = await client.post<{ message: string; id: string; status: string }>(`/warranty/admin/claims/${id}/approve`);
            return response.data;
        },

        rejectClaim: async (id: string, reason: string) => {
            const response = await client.post<{ message: string; id: string; status: string }>(`/warranty/admin/claims/${id}/reject`, { reason });
            return response.data;
        },

        // Gán loại xử lý + technician / workOrder
        assignClaim: async (id: string, data: AssignClaimRequest) => {
            const response = await client.post<{ message: string; id: string; status: string; workOrderId?: string; rmaId?: string }>(`/warranty/claims/${id}/assign`, data);
            return response.data;
        },

        // Hoàn tất claim
        completeClaim: async (id: string, data: CompleteClaimRequest) => {
            const response = await client.post<{ message: string; id: string; status: string }>(`/warranty/claims/${id}/complete`, data);
            return response.data;
        },

        // Legacy alias — vẫn giữ cho compat
        resolveClaim: async (id: string, notes: string) => {
            const response = await client.post<{ message: string; id: string; status: string }>(`/warranty/admin/claims/${id}/resolve`, { notes });
            return response.data;
        },

        // Receipt (JSON để render component; backend có thể trả PDF ở endpoint khác)
        getClaimReceipt: async (id: string) => {
            const response = await client.get<WarrantyReceiptData>(`/warranty/claims/${id}/receipt`);
            return response.data;
        },

        getClaimStats: async () => {
            const response = await client.get<{
                total: number;
                pending: number;
                approved: number;
                resolved: number;
                rejected: number;
                newToday: number;
                resolvedToday: number;
                slaWarning?: number;
                overdue?: number;
            }>('/warranty/admin/claims/stats');
            return response.data;
        },
    },

    // RMA gửi hãng
    rma: {
        getList: async (status?: RmaStatus) => {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            const response = await client.get<WarrantyRma[]>(`/warranty/rma?${params.toString()}`);
            return response.data;
        },
        getById: async (id: string) => {
            const response = await client.get<WarrantyRma>(`/warranty/rma/${id}`);
            return response.data;
        },
        create: async (data: CreateRmaRequest) => {
            const response = await client.post<{ id: string; code: string; status: string }>('/warranty/rma', data);
            return response.data;
        },
        send: async (id: string, data: SendRmaRequest) => {
            const response = await client.post<{ message: string; status: string }>(`/warranty/rma/${id}/send`, data);
            return response.data;
        },
        receive: async (id: string, data: ReceiveRmaRequest) => {
            const response = await client.post<{ message: string; status: string }>(`/warranty/rma/${id}/receive`, data);
            return response.data;
        },
    },

    // Máy cho mượn
    loaner: {
        getList: async (status?: LoanerStatus, overdueOnly?: boolean) => {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (overdueOnly) params.append('overdue', 'true');
            const response = await client.get<LoanerDevice[]>(`/warranty/loaner-devices?${params.toString()}`);
            return response.data;
        },
        getEligibleSerials: async () => {
            const response = await client.get<Array<{
                id: string;
                serialNumber: string;
                productId: string;
                productName: string;
            }>>('/warranty/loaner-devices/eligible-serials');
            return response.data;
        },
        create: async (data: CreateLoanerRequest) => {
            const response = await client.post<{ id: string; message: string }>('/warranty/loaner-devices', data);
            return response.data;
        },
        returnDevice: async (id: string, data: ReturnLoanerRequest) => {
            const response = await client.post<{ message: string; status: string }>(`/warranty/loaner-devices/${id}/return`, data);
            return response.data;
        },
    },

    // Chính sách bảo hành
    policies: {
        getList: async () => {
            const response = await client.get<WarrantyPolicy[]>('/warranty/policies');
            return response.data;
        },
        create: async (data: CreateWarrantyPolicyRequest) => {
            const response = await client.post<WarrantyPolicy>('/warranty/policies', data);
            return response.data;
        },
        update: async (id: string, data: CreateWarrantyPolicyRequest) => {
            const response = await client.put<WarrantyPolicy>(`/warranty/policies/${id}`, data);
            return response.data;
        },
        delete: async (id: string) => {
            await client.delete(`/warranty/policies/${id}`);
        },
    },
};
