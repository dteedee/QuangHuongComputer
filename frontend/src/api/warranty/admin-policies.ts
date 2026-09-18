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

export interface WarrantySlaPolicy {
    id: string;
    claimType: string;
    targetHours: number;
    warningPercent: number;
    isActive: boolean;
}

export interface CreateWarrantySlaPolicyRequest {
    claimType: string;
    targetHours: number;
    warningPercent: number;
    isActive?: boolean;
}

// W3-15 fix (IR#40, w0): as of the w0 audit `WarrantyPolicy` had ZERO mapped
// HTTP endpoints — the whole page was dead against `/warranty/policies`.
// `docs/api-contracts/warranty.md` (W2-6) since added real endpoints, but
// under `/warranty/admin/policies`, not the old bare `/warranty/policies` —
// fixed here to the real path.
export const warrantyAdminPoliciesApi = {
    getList: async () => {
        const response = await client.get<WarrantyPolicy[]>('/warranty/admin/policies');
        return response.data;
    },
    create: async (data: CreateWarrantyPolicyRequest) => {
        const response = await client.post<WarrantyPolicy>('/warranty/admin/policies', data);
        return response.data;
    },
    update: async (id: string, data: CreateWarrantyPolicyRequest) => {
        const response = await client.put<WarrantyPolicy>(`/warranty/admin/policies/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await client.delete(`/warranty/admin/policies/${id}`);
    },
};

// Internal SLA target CRUD (D08 §4: ops-only, never printed to the customer —
// never confuse with the published `CommittedTurnaroundDays` on the claim).
export const warrantyAdminSlaPoliciesApi = {
    getList: async () => {
        const response = await client.get<WarrantySlaPolicy[]>('/warranty/admin/sla-policies');
        return response.data;
    },
    create: async (data: CreateWarrantySlaPolicyRequest) => {
        const response = await client.post<WarrantySlaPolicy>('/warranty/admin/sla-policies', data);
        return response.data;
    },
    update: async (id: string, data: CreateWarrantySlaPolicyRequest) => {
        const response = await client.put<WarrantySlaPolicy>(`/warranty/admin/sla-policies/${id}`, data);
        return response.data;
    },
};
