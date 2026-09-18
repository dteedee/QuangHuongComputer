/**
 * Warranty — ADMIN policy-CRUD surface. See `admin-claims.ts` for why this is
 * a separate file. Composed into `warrantyAdminApi` by `admin.ts`.
 */
import client from '../client';
import type { WarrantyProvider } from './types';

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

export const warrantyAdminPoliciesApi = {
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
};
