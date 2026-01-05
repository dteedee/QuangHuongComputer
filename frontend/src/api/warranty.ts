
import client from './client';

export interface WarrantyClaim {
    id: string;
    serialNumber: string;
    issueDescription: string;
    status: string;
    filedDate: string;
    resolvedDate?: string;
    resolutionNotes?: string;
}

export interface WarrantyCoverage {
    serialNumber: string;
    productId: string;
    status: string;
    expirationDate: string;
    isValid: boolean;
    error?: string;
}

export const warrantyApi = {
    getMyClaims: async () => {
        const response = await client.get<WarrantyClaim[]>('/warranty/claims');
        return response.data;
    },

    createClaim: async (data: { serialNumber: string; issueDescription: string }) => {
        const response = await client.post('/warranty/claims', data);
        return response.data;
    },

    lookupCoverage: async (serialNumber: string) => {
        const response = await client.get<WarrantyCoverage>(`/warranty/lookup/${serialNumber}`);
        return response.data;
    }
};
