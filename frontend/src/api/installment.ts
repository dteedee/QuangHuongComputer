import { client } from './client';

/**
 * Installment (Trả góp) API — "lead mode" (D04 §5 / D10 rule 6, docs/api-contracts/sales-installments.md).
 * Rewritten for W3-8: the previous version of this file called `/payment/installments/*` and
 * `/installment/apply`, none of which match the frozen contract — the real base is
 * `/api/installment/{partners,apply,mine}`, authenticated, no document upload of any kind (Luật
 * 91/2025: no CCCD/statement collected over the web; staff finish paperwork on the finance
 * company's own portal). `uploadDocument` was already removed in an earlier pass (D10 rule 6).
 */

export type InstallmentStatus = 'PendingApproval' | 'Approved' | 'Rejected' | 'Active' | 'Completed' | 'Expired';

/** `GET /api/installment/partners` — storefront hides the whole installment block when `partners` is empty. */
export interface InstallmentPartnersInfo {
    partners: string[];
    termMonthsOptions: number[];
    leadHoldHours: number;
    note: string;
}

export interface ApplyInstallmentRequest {
    orderId: string;
    provider: string;
    termMonths: number;
    downPayment: number;
    /** Luật 91/2025 Đ13 — "cho phép cửa hàng chuyển thông tin cho công ty tài chính đã chọn". Required true. */
    consentGiven: boolean;
}

export interface InstallmentApplicationResult {
    id: string;
    status: InstallmentStatus;
    provider: string;
    termMonths: number;
    downPayment: number;
    monthlyAmount: number;
    totalAmount: number;
    /** Lead hold deadline — after this the application auto-expires (admin `expire-sweep`). */
    expiresAt: string;
    consentAt: string;
    note: string;
}

/** `GET /api/installment/mine` row shape — the raw `InstallmentApplication` entity, camelCased. */
export interface MyInstallmentApplication {
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
    /** Hold expiry (D10's "hold expiry" requirement) — only meaningful while `status === 'PendingApproval'`. */
    expiresAt?: string | null;
    consentAt?: string | null;
    createdAt: string;
}

/**
 * LEGACY types/calls below — kept ONLY so `components/checkout/installment-form.tsx` (owned by
 * W3-2, not this track) keeps compiling. They call `/payment/installments/{providers,calculate}`,
 * routes that do NOT exist in the frozen contract (`docs/api-contracts/sales-installments.md` —
 * the real surface is `/api/installment/{partners,apply,mine}`, no `/calculate` at all). This was
 * already broken before this track touched the file (integration-requests-w1.md flagged the
 * upload-removal half of the same component); filed again below with the endpoint evidence. Do
 * not build new UI against these — use `getPartners`/`getMyApplications` above.
 */
export interface InstallmentProvider {
    code: string;
    name: string;
    type: 'CreditCard' | 'FinanceCompany';
    isZeroPercent: boolean;
    annualInterestRate: number;
    supportedTerms: number[];
    minDownPaymentPercent: number;
    processingFeePercent: number;
    monthlyCollectionFee: number;
}

export interface InstallmentCalculationRequest {
    totalAmount: number;
    termMonths: number;
    downPaymentPercent: number;
    annualInterestRate?: number;
    processingFee?: number;
    monthlyCollectionFee?: number;
}

export interface InstallmentCalculationResponse {
    principal: number;
    downPaymentAmount: number;
    monthlyPayment: number;
    totalPayment: number;
    difference: number;
    termMonths: number;
    interestRate: number;
}

/**
 * @deprecated field names don't match `ApplyInstallmentDto` (`Provider`/`DownPayment`/
 * `ConsentGiven`, not `providerCode`/`downPaymentAmount`/`monthlyPayment`) — unmatched JSON
 * properties bind to their C# defaults, so `use-checkout-submit.ts`'s call (owned by W3-2) sends
 * `provider=""`, `downPayment=0`, `consentGiven=false` today, which the backend's own consent
 * rule rejects. Kept verbatim so that file keeps compiling; use `applyLead` for new code.
 */
export interface InstallmentApplicationRequest {
    orderId: string;
    providerCode: string;
    termMonths: number;
    downPaymentAmount: number;
    monthlyPayment: number;
    idFrontFileId?: string;
    idBackFileId?: string;
    notes?: string;
}

export interface InstallmentApplicationResponse {
    id: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
    orderId: string;
    createdAt: string;
    message: string;
}

export const installmentApi = {
    /** Active partners + term options for the apply form; storefront self-hides if `partners` is empty. */
    getPartners: async (): Promise<InstallmentPartnersInfo> => {
        const response = await client.get<InstallmentPartnersInfo>('/installment/partners');
        return response.data;
    },

    /** Submits a lead application against the REAL contract. 409 if another one is already open. */
    applyLead: async (data: ApplyInstallmentRequest): Promise<InstallmentApplicationResult> => {
        const response = await client.post<InstallmentApplicationResult>('/installment/apply', data);
        return response.data;
    },

    /** @deprecated see `InstallmentApplicationRequest` — wrong field names, kept for `use-checkout-submit.ts`. */
    apply: async (data: InstallmentApplicationRequest): Promise<InstallmentApplicationResponse> => {
        const response = await client.post<InstallmentApplicationResponse>('/installment/apply', data);
        return response.data;
    },

    /**
     * Every application across all of the customer's orders, newest first — this track's D10
     * addition (`account/LoyaltyPage.tsx`'s sibling screens don't cover this; surfaced from the
     * account area so a customer can see a pending lead's hold expiry without asking staff).
     */
    getMyApplications: async (): Promise<MyInstallmentApplication[]> => {
        const response = await client.get<MyInstallmentApplication[]>('/installment/mine');
        return response.data;
    },

    /** @deprecated dead route — see the LEGACY comment above `InstallmentProvider`. */
    getProviders: async (): Promise<InstallmentProvider[]> => {
        const response = await client.get<InstallmentProvider[]>('/payment/installments/providers');
        return response.data;
    },

    /** @deprecated dead route — see the LEGACY comment above `InstallmentProvider`. */
    calculate: async (data: InstallmentCalculationRequest): Promise<InstallmentCalculationResponse> => {
        const response = await client.post<InstallmentCalculationResponse>('/payment/installments/calculate', data);
        return response.data;
    },
};
