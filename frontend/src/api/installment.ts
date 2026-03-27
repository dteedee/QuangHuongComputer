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
    }
};
