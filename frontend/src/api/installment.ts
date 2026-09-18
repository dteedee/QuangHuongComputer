import { client } from './client';

/**
 * Installment (Trả Góp) API
 * Phase 3.4
 */

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

export interface InstallmentApplicationRequest {
    orderId: string;
    providerCode: string;
    termMonths: number;
    downPaymentAmount: number;
    monthlyPayment: number;
    /**
     * @deprecated D10 rule 6 (Luật 91/2025): hồ sơ không còn thu CMND/CCCD
     * qua web — làm tại quầy/cổng CTTC. Kept optional (always `undefined`
     * now) so `components/checkout/use-checkout-submit.ts` (W3-2, not this
     * track's file) keeps compiling unchanged.
     */
    idFrontFileId?: string;
    /** @deprecated see `idFrontFileId`. */
    idBackFileId?: string;
    /** Ghi chú thêm từ khách */
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
    /** Lấy danh sách đối tác trả góp */
    getProviders: async (): Promise<InstallmentProvider[]> => {
        const response = await client.get<InstallmentProvider[]>('/payment/installments/providers');
        return response.data;
    },

    /** Tính toán bảng lãi suất trả góp */
    calculate: async (data: InstallmentCalculationRequest): Promise<InstallmentCalculationResponse> => {
        const response = await client.post<InstallmentCalculationResponse>('/payment/installments/calculate', data);
        return response.data;
    },

    /** Nộp hồ sơ trả góp (tạo InstallmentApplication ở backend). */
    apply: async (data: InstallmentApplicationRequest): Promise<InstallmentApplicationResponse> => {
        const response = await client.post<InstallmentApplicationResponse>('/installment/apply', data);
        return response.data;
    },

    // `uploadDocument` removed (D10 rule 6, W1-9) — see `InstallmentApplicationRequest`
    // doc comment above and `docs/frontend-form-kit.md`.
};
