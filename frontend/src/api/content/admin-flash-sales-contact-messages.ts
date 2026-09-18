/**
 * Content — ADMIN surface: flash sales CRUD + contact-message inbox. See
 * `admin-pages-posts-coupons-menus.ts` for why this is a second file.
 * Composed into `contentAdminApi` by `admin.ts`.
 */
import client from '../client';
import type { ContactMessage, CreateFlashSaleDto, FlashSale } from './types';

export const contentAdminFlashSalesApi = {
    getAll: async (status?: string) => {
        const response = await client.get<FlashSale[]>('/content/admin/flash-sales', { params: { status } });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await client.get<FlashSale>(`/content/admin/flash-sales/${id}`);
        return response.data;
    },
    create: async (data: CreateFlashSaleDto) => {
        const response = await client.post<{ id: string; name: string; status: string; message: string }>(
            '/content/admin/flash-sales',
            data
        );
        return response.data;
    },
    update: async (id: string, data: Partial<CreateFlashSaleDto>) => {
        const response = await client.put<{ message: string; flashSale: FlashSale }>(
            `/content/admin/flash-sales/${id}`,
            data
        );
        return response.data;
    },
    activate: async (id: string) => {
        const response = await client.post<{ message: string; status: string }>(
            `/content/admin/flash-sales/${id}/activate`
        );
        return response.data;
    },
    deactivate: async (id: string) => {
        const response = await client.post<{ message: string; status: string }>(
            `/content/admin/flash-sales/${id}/deactivate`
        );
        return response.data;
    },
    delete: async (id: string) => {
        const response = await client.delete<{ message: string }>(
            `/content/admin/flash-sales/${id}`
        );
        return response.data;
    },
    getStats: async () => {
        const response = await client.get<{
            total: number;
            active: number;
            scheduled: number;
            ended: number;
            totalSold: number;
        }>('/content/admin/flash-sales/stats');
        return response.data;
    },
};

export const contentAdminContactMessagesApi = {
    getAll: async (params?: { status?: string; page?: number; pageSize?: number }) => {
        const response = await client.get<{
            messages: ContactMessage[];
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
        }>('/content/admin/contact-messages', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await client.get<ContactMessage>(`/content/admin/contact-messages/${id}`);
        return response.data;
    },
    markAsRead: async (id: string) => {
        const response = await client.post<{ message: string; status: string }>(
            `/content/admin/contact-messages/${id}/read`
        );
        return response.data;
    },
    markAsReplied: async (id: string, notes?: string) => {
        const response = await client.post<{ message: string; status: string }>(
            `/content/admin/contact-messages/${id}/reply`,
            { notes }
        );
        return response.data;
    },
    addNotes: async (id: string, notes: string) => {
        const response = await client.post<{ message: string }>(
            `/content/admin/contact-messages/${id}/notes`,
            { notes }
        );
        return response.data;
    },
    archive: async (id: string) => {
        const response = await client.post<{ message: string; status: string }>(
            `/content/admin/contact-messages/${id}/archive`
        );
        return response.data;
    },
    delete: async (id: string) => {
        const response = await client.delete<{ message: string }>(
            `/content/admin/contact-messages/${id}`
        );
        return response.data;
    },
    getStats: async () => {
        const response = await client.get<{
            total: number;
            new: number;
            read: number;
            replied: number;
            archived: number;
        }>('/content/admin/contact-messages/stats');
        return response.data;
    },
};
