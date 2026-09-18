/**
 * Catalog — storefront PRODUCT DETAIL surface (PDP: detail, reviews, specs,
 * stock-by-branch). Split out of the old flat `api/catalog.ts` (W1-9, step
 * 7c). Functions moved verbatim; `api/catalog.ts` re-exports them.
 */
import client from '../client';
import type {
    Brand,
    Category,
    Product,
    ProductAttribute,
    ProductDetailBundle,
    ProductReview,
    SpecificationGroup,
    StockByBranch,
} from './types';

export const catalogPublicProductApi = {
    getProduct: async (id: string) => {
        const response = await client.get<Product>(`/catalog/products/${id}`);
        return response.data;
    },

    getProductBySlug: async (slug: string) => {
        const response = await client.get<Product>(`/catalog/products/by-slug/${slug}`);
        return response.data;
    },

    getCategoryBySlug: async (slug: string) => {
        const response = await client.get<Category>(`/catalog/categories/by-slug/${slug}`);
        return response.data;
    },

    getCategoryById: async (id: string) => {
        const response = await client.get<Category>(`/catalog/categories/${id}`);
        return response.data;
    },

    getBrandById: async (id: string) => {
        const response = await client.get<Brand>(`/catalog/brands/${id}`);
        return response.data;
    },

    // Product Reviews
    getProductReviews: async (productId: string, params?: { page?: number; pageSize?: number }) => {
        const response = await client.get<{ total: number; reviews: ProductReview[] }>(
            `/catalog/products/${productId}/reviews`,
            { params }
        );
        return response.data;
    },

    createProductReview: async (productId: string, data: {
        rating: number;
        title?: string;
        comment: string;
        imageUrls?: string;
        videoUrl?: string;
    }) => {
        const response = await client.post<{ message: string; id: string; isVerifiedPurchase: boolean }>(
            `/catalog/products/${productId}/reviews`,
            data
        );
        return response.data;
    },

    markReviewHelpful: async (reviewId: string) => {
        const response = await client.post<{ message: string; helpfulCount: number }>(
            `/catalog/reviews/${reviewId}/helpful`
        );
        return response.data;
    },

    getProductReviewStats: async (productId: string) => {
        const response = await client.get<{
            totalReviews: number;
            averageRating: number;
            ratingCounts: { 1: number; 2: number; 3: number; 4: number; 5: number };
        }>(`/catalog/products/${productId}/reviews/stats`);
        return response.data;
    },

    // Product Attributes
    getProductAttributes: async (productId: string) => {
        const response = await client.get<ProductAttribute[]>(
            `/catalog/products/${productId}/attributes`
        );
        return response.data;
    },

    /** Lấy sản phẩm kèm media/variants/specs/stockByBranch (endpoint mở rộng). */
    getProductWithDetails: async (id: string): Promise<ProductDetailBundle> => {
        const response = await client.get<ProductDetailBundle>(`/catalog/products/${id}?include=medias,variants,specs,stock`);
        return response.data;
    },

    // Also used by the admin spec editor — a plain read, no audience split needed.
    getSpecGroupsByCategory: async (categoryId: string) => {
        const response = await client.get<SpecificationGroup[]>(`/catalog/categories/${categoryId}/spec-groups`);
        return response.data;
    },

    // Inventory (proxied from Inventory service)
    getStockByBranch: async (productId: string, variantId?: string) => {
        const response = await client.get<StockByBranch[]>(`/inventory/products/${productId}/stock-by-branch`, {
            params: variantId ? { variantId } : undefined,
        });
        return response.data;
    },
};
