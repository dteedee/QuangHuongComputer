/**
 * Warranty — ADMIN RMA (gửi hãng) + loaner-device surface. See
 * `admin-claims.ts` for why this is a separate file. Composed into
 * `warrantyAdminApi` by `admin.ts`.
 */
import client from '../client';
import type { LoanerStatus, RmaResult, RmaStatus } from './types';

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

export const warrantyAdminRmaApi = {
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
};

export const warrantyAdminLoanerApi = {
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
};
