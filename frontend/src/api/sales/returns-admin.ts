/**
 * Sales — ADMIN return-management surface (approve/reject/inspect/refund a
 * customer return request, return-policy CRUD). Split out of the old flat
 * `api/sales.ts` (W1-9, step 7c). Functions moved verbatim; `api/sales.ts`
 * re-exports them.
 */
import client from '../client';
import type { ReceivedCondition, ReturnRequest, ReturnPolicy } from './types';

export const salesReturnsAdminApi = {
    // Admin: Get all returns
    adminGetList: async (page = 1, pageSize = 20, status?: string) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());
        if (status) params.append('status', status);
        const response = await client.get<{ total: number; page: number; pageSize: number; returns: ReturnRequest[] }>(`/sales/admin/returns?${params.toString()}`);
        return response.data;
    },

    // Admin: Get return by ID
    adminGetById: async (id: string) => {
        const response = await client.get<ReturnRequest>(`/sales/admin/returns/${id}`);
        return response.data;
    },

    // Admin: Approve return
    approve: async (id: string) => {
        const response = await client.post<{ message: string; status: string }>(`/sales/admin/returns/${id}/approve`);
        return response.data;
    },

    // Admin: Reject return
    reject: async (id: string, reason: string) => {
        const response = await client.post<{ message: string; status: string }>(`/sales/admin/returns/${id}/reject`, { reason });
        return response.data;
    },

    // Admin: Process refund
    processRefund: async (id: string) => {
        const response = await client.post<{ message: string; status: string }>(`/sales/admin/returns/${id}/refund`);
        return response.data;
    },

    // Admin: Kiểm hàng nhận về (Phase 07)
    inspect: async (
        id: string,
        data: {
            condition: ReceivedCondition;
            warehouseId: string;
            notes?: string;
            restockingFee?: number;
        }
    ) => {
        const response = await client.post<{ message: string; status: string; grnId?: string }>(`/sales/admin/returns/${id}/inspect`, data);
        return response.data;
    },

    // Admin: Hoàn tất return (sau khi inspect + refund)
    complete: async (id: string) => {
        const response = await client.post<{ message: string; status: string }>(`/sales/admin/returns/${id}/complete`);
        return response.data;
    },

    // Chính sách đổi trả — admin CRUD
    returnPolicies: {
        getList: async () => {
            const response = await client.get<ReturnPolicy[]>('/sales/return-policies');
            return response.data;
        },
        create: async (data: ReturnPolicy) => {
            const response = await client.post<ReturnPolicy>('/sales/return-policies', data);
            return response.data;
        },
        update: async (id: string, data: ReturnPolicy) => {
            const response = await client.put<ReturnPolicy>(`/sales/return-policies/${id}`, data);
            return response.data;
        },
        delete: async (id: string) => {
            await client.delete(`/sales/return-policies/${id}`);
        },
    },
};
