/**
 * Sales — staff queue for instalment (trả góp) lead applications, W2-20 backend.
 * Contract: `docs/api-contracts/sales-installments.md` §2. Lead-mode only: staff
 * record the finance-company contract number after paperwork is done on the
 * partner's own portal — no document/ID upload anywhere in this flow (Risk
 * Assessment: W4-3 asserts its absence).
 *
 * Shapes below are read verbatim from the real backend (read-only access,
 * `backend/Services/Sales/{Domain/InstallmentApplication.cs,Endpoints/
 * Installments/InstallmentAdminEndpoints.cs}`) rather than guessed from the
 * contract doc's customer-facing example: `GET /pending` serialises the raw
 * entity (no customer/order name fields — the queue page looks those up via
 * the existing order-detail API), and approve/reject return a small
 * projection, not the full application.
 */
import client from '../client';

export type InstallmentStatus = 'PendingApproval' | 'Approved' | 'Active' | 'Rejected' | 'Expired' | 'Completed';

/** `GET /admin/installment/pending` — the raw `InstallmentApplication` entity. */
export interface InstallmentApplicationDto {
    id: string;
    orderId: string;
    provider: string;
    termMonths: number;
    downPayment: number;
    monthlyAmount: number;
    totalAmount: number;
    status: InstallmentStatus;
    rejectionReason?: string | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    completedAt?: string | null;
    processedBy?: string | null;
    financeContractNumber?: string | null;
    expiresAt?: string | null;
    consentAt?: string | null;
    createdAt: string;
    updatedAt?: string | null;
}

export interface ApproveInstallmentRequest {
    financeContractNumber: string;
}

export interface RejectInstallmentRequest {
    reason: string;
}

export interface InstallmentActionResult {
    id: string;
    status: InstallmentStatus;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    financeContractNumber?: string | null;
    rejectionReason?: string | null;
}

export const installmentsAdminApi = {
    getPending: async (): Promise<InstallmentApplicationDto[]> => {
        const res = await client.get<InstallmentApplicationDto[]>('/admin/installment/pending');
        return res.data;
    },
    approve: async (id: string, body: ApproveInstallmentRequest): Promise<InstallmentActionResult> => {
        const res = await client.post<InstallmentActionResult>(`/admin/installment/${id}/approve`, body);
        return res.data;
    },
    reject: async (id: string, body: RejectInstallmentRequest): Promise<InstallmentActionResult> => {
        const res = await client.post<InstallmentActionResult>(`/admin/installment/${id}/reject`, body);
        return res.data;
    },
    expireSweep: async (): Promise<{ expiredCount: number }> => {
        const res = await client.post<{ expiredCount: number }>('/admin/installment/expire-sweep');
        return res.data;
    },
};
