/**
 * Warranty — ADMIN claim-management surface. Split out of the old flat
 * `api/warranty.ts`'s `warrantyApi.admin` object (W1-9, step 7c); moved
 * verbatim. Composed into `warrantyAdminApi` by `admin.ts`. (RMA/loaner live
 * in `admin-rma-loaner.ts`, policies in `admin-policies.ts` — this was one
 * 300+-line `admin` object, split further than the 3 spec-named files to
 * respect the 200-LOC guideline.)
 */
import client from '../client';
import type { ClaimStatus, ClaimType, WarrantyClaim, WarrantyCoverage, WarrantyProvider } from './types';

export interface AssignClaimRequest {
    claimType: ClaimType;
    technicianId?: string;
    workOrderId?: string;
    /** D08: RMA gửi hãng / máy mượn — contract body `{ClaimType, WorkOrderId?, RmaId?, LoanerDeviceId?}`. */
    rmaId?: string;
    loanerDeviceId?: string;
    notes?: string;
}

export interface CompleteClaimRequest {
    result: string;
    notes: string;
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

export interface ClaimListFilter {
    status?: ClaimStatus;
    claimType?: ClaimType;
    slaWarning?: boolean;
    startDate?: string;
    endDate?: string;
    serialNumber?: string;
}

export const warrantyAdminClaimsApi = {
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
    // W0-13: was missing /admin - route lives under adminGroup (WarrantyEndpoints.cs:362).
    assignClaim: async (id: string, data: AssignClaimRequest) => {
        const response = await client.post<{ message: string; id: string; status: string; workOrderId?: string; rmaId?: string }>(`/warranty/admin/claims/${id}/assign`, data);
        return response.data;
    },

    // W0-13: no backend route exists for POST .../claims/{id}/complete (only
    // /resolve, with a different contract - no `result` field) -> always 404.
    // Left uncalled-path as-is (no safe path substitution); see handover in
    // reports/w0-13-report.md / integration-requests-w0.md for W3.
    completeClaim: async (id: string, data: CompleteClaimRequest) => {
        const response = await client.post<{ message: string; id: string; status: string }>(`/warranty/claims/${id}/complete`, data);
        return response.data;
    },

    // Legacy alias — vẫn giữ cho compat. D08: response carries the "3 lần"
    // query result (`resolvedClaimCountForSerial` + `eligibleForReplaceOrRefund`)
    // — never a stored flag, always recomputed by the backend.
    resolveClaim: async (id: string, notes: string) => {
        const response = await client.post<{
            message: string; id: string; status: string;
            resolvedClaimCountForSerial?: number;
            eligibleForReplaceOrRefund?: boolean;
        }>(`/warranty/admin/claims/${id}/resolve`, { notes });
        return response.data;
    },

    // Receipt (JSON để render component; backend có thể trả PDF ở endpoint khác)
    // W0-13: was missing /admin - route lives under adminGroup (WarrantyEndpoints.cs:387).
    getClaimReceipt: async (id: string) => {
        const response = await client.get<WarrantyReceiptData>(`/warranty/admin/claims/${id}/receipt`);
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
};
