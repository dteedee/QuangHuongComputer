
import client from './client';

export enum ClaimStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
    Resolved = 'Resolved'
}

export enum ResolutionPreference {
    Repair = 'Repair',
    Replace = 'Replace',
    Refund = 'Refund'
}

export interface WarrantyClaim {
    id: string;
    serialNumber: string;
    issueDescription: string;
    status: ClaimStatus;
    filedDate: string;
    resolvedDate?: string;
    resolutionNotes?: string;
    preferredResolution: ResolutionPreference;
    attachmentUrls?: string[];
    isManagerOverride?: boolean;
    customerId?: string;
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
    orderNumber?: string;
    status: string;
    expirationDate: string;
    purchaseDate: string;
    warrantyPeriodMonths: number;
    isValid: boolean;
    claimHistory: ClaimHistoryItem[];
    error?: string;
}

export interface CreateClaimRequest {
    serialNumber: string;
    issueDescription: string;
    preferredResolution?: ResolutionPreference;
    attachmentUrls?: string[];
    isManagerOverride?: boolean;
}

export interface RegisterWarrantyRequest {
    productId: string;
    serialNumber: string;
    purchaseDate: string;
    warrantyPeriodMonths: number;
    orderNumber?: string;
}

export const warrantyApi = {
    // Customer endpoints
    getMyClaims: async () => {
        const response = await client.get<WarrantyClaim[]>('/warranty/claims');
        return response.data;
    },

    createClaim: async (data: CreateClaimRequest) => {
        const response = await client.post('/warranty/claims', data);
        return response.data;
    },

    // Register warranty for a product (typically done via order fulfillment)
    registerWarranty: async (data: RegisterWarrantyRequest) => {
        const response = await client.post('/warranty/register', data);
        return response.data;
    },

    lookupCoverage: async (serialNumber: string) => {
        try {
            const response = await client.get<WarrantyCoverage>(`/warranty/lookup/serial/${serialNumber}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                throw new Error('Không tìm thấy bảo hành cho serial này');
            }
            throw error;
        }
    },

    lookupByInvoice: async (orderNumber: string) => {
        try {
            const response = await client.get<WarrantyCoverage[]>(`/warranty/lookup/invoice/${orderNumber}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                throw new Error('Không tìm thấy bảo hành cho hóa đơn này');
            }
            throw error;
        }
    },

    // Legacy endpoint for backward compatibility
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

    // Admin endpoints
    admin: {
        getAllWarranties: async () => {
            const response = await client.get<any[]>('/warranty/admin/warranties');
            return response.data;
        }
    }
};
