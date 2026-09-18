/**
 * Catalog ADMIN — specification schema + review moderation + the generic image
 * upload the taxonomy screens use. Carved out of `admin.ts` (W3-4) purely to keep
 * both files near the 200-line rule; `admin.ts` re-exports them as
 * `catalogAdminApi.specSchema` / `.reviews` / `.uploadTaxonomyImage`, so no caller
 * needs to know about this split.
 *
 * Contract: `docs/api-contracts/catalog.md` §8 (spec schema) and §9 (reviews).
 */
import client from '../client';
import type {
    PendingReview,
    ProductReview,
    ReviewSentiment,
    SpecAttributeWriteDto,
    SpecGroupWriteDto,
    SpecificationGroup,
} from './types';

/**
 * Generic image upload (`POST /api/media/upload`, W1-6 — `Content.ManageMedia`).
 * Used for category images and brand logos: the catalog's own `/catalog/media/upload`
 * refuses anything without an existing `productId` (`CatalogMediaEndpoints.cs:59`).
 */
export const uploadTaxonomyImage = async (file: File, area = 'taxonomy') => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post<{ url: string; fileSize: number }>('/media/upload', formData, {
        params: { area },
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

// ---------------------------------------------------------------- spec schema (catalog.md §8)
export const catalogSpecSchemaApi = {
    listGroups: async () => {
        const response = await client.get<SpecificationGroup[]>('/catalog/specifications/groups');
        return response.data;
    },
    createGroup: async (data: SpecGroupWriteDto) => {
        const response = await client.post<SpecificationGroup>('/catalog/specifications/groups', data);
        return response.data;
    },
    updateGroup: async (id: string, data: SpecGroupWriteDto) => {
        const response = await client.put<SpecificationGroup>(`/catalog/specifications/groups/${id}`, data);
        return response.data;
    },
    deleteGroup: async (id: string) => {
        const response = await client.delete<{ message?: string }>(`/catalog/specifications/groups/${id}`);
        return response.data;
    },
    reorderGroups: async (ids: string[]) => {
        const response = await client.post<{ message?: string }>('/catalog/specifications/groups/reorder', { ids });
        return response.data;
    },
    createAttribute: async (groupId: string, data: SpecAttributeWriteDto) => {
        const response = await client.post<{ id: string }>(`/catalog/specifications/groups/${groupId}/attributes`, data);
        return response.data;
    },
    updateAttribute: async (id: string, data: SpecAttributeWriteDto) => {
        const response = await client.put<{ id: string }>(`/catalog/specifications/attributes/${id}`, data);
        return response.data;
    },
    deleteAttribute: async (id: string) => {
        const response = await client.delete<{ message?: string }>(`/catalog/specifications/attributes/${id}`);
        return response.data;
    },
    reorderAttributes: async (groupId: string, ids: string[]) => {
        const response = await client.post<{ message?: string }>(
            `/catalog/specifications/groups/${groupId}/attributes/reorder`, { ids });
        return response.data;
    },
};

// ---------------------------------------------------------------- reviews (catalog.md §9)
export const catalogReviewAdminApi = {
    /** The ONLY cross-product admin list the backend exposes — pending only. */
    listPending: async () => {
        const response = await client.get<PendingReview[]>('/catalog/reviews/admin/pending');
        return response.data;
    },
    /** Staff-only: `approvedOnly=false` is honoured for staff, ignored for everyone else. */
    listForProduct: async (productId: string) => {
        const response = await client.get<ProductReview[]>(
            `/catalog/products/${productId}/reviews`, { params: { approvedOnly: false } });
        return response.data;
    },
    sentiment: async () => {
        const response = await client.get<ReviewSentiment>('/catalog/reviews/admin/sentiment-analysis');
        return response.data;
    },
    approve: async (reviewId: string) => {
        const response = await client.post<{ message: string }>(`/catalog/reviews/admin/${reviewId}/approve`);
        return response.data;
    },
    /** Reject = hard delete (backend has no "rejected" state) — recalculates the rating. */
    reject: async (reviewId: string) => {
        const response = await client.delete<{ message: string }>(`/catalog/reviews/admin/${reviewId}`);
        return response.data;
    },
};
