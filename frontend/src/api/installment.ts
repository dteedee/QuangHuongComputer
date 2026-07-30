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
    /** ID file CMND/CCCD mặt trước đã upload (nếu backend hỗ trợ) */
    idFrontFileId?: string;
    /** ID file CMND/CCCD mặt sau */
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

    /** Upload giấy tờ CMND/CCCD, trả về fileId. Backend lưu MinIO bucket riêng. */
    uploadDocument: async (file: File): Promise<{ fileId: string; url?: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post<{ fileId: string; url?: string }>('/installment/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};
