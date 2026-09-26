/**
 * Catalog — storefront PRODUCT DETAIL surface (PDP: detail, reviews, specs,
 * stock-by-branch). Split out of the old flat `api/catalog.ts` (W1-9, step
 * 7c). Functions moved verbatim; `api/catalog.ts` re-exports them.
 */
import client from '../client';
import type {
    Brand,
    Category,
    MediaType,
    Product,
    ProductAttribute,
    ProductDetailBundle,
    ProductMedia,
    ProductReview,
    CreateProductReviewRequest,
    ReviewPhoto,
    ProductSpecGroup,
    ProductVariant,
    SpecificationGroup,
    StockByBranch,
} from './types';

/** `include=` segments the PDP endpoint understands (docs/api-contracts/catalog.md §2). */
export type ProductDetailInclude = 'media' | 'specs' | 'variants';

/**
 * `medias[i]` as the DETAIL projection really returns it: the field is `alt`
 * (not `altText`) and `productId` is not echoed back. Measured against
 * `GET /api/catalog/products/by-slug/{slug}?include=media` on 2026-09-18.
 */
export interface ProductMediaView extends Omit<ProductMedia, 'productId'> {
    alt?: string | null;
    productId?: string;
}

/** What `GET /products/by-slug/{slug}?include=media,specs,variants` returns. */
export interface PublicProductDetail extends Omit<Product, 'medias'> {
    medias?: ProductMediaView[] | null;
    specGroups?: ProductSpecGroup[] | null;
    variants?: ProductVariant[] | null;
}

/** `GET /api/warranty/policies/effective?productId=` (anonymous, D08). */
export interface EffectiveWarrantyPolicy {
    productId: string;
    manufacturer?: { months: number; policyId: string | null; source: string } | null;
    store?: { months: number; policyId: string | null; source: string } | null;
}

/** `GET /api/sales/return-policies/effective?productId=` (public, D08). */
export interface EffectiveReturnPolicy {
    daysForReturn: number;
    daysForExchange: number;
    daysForDefectReplace: number;
    daysForStatutoryReturn: number;
    isReturnExcluded: boolean;
    warrantyMonths?: number | null;
    allowOpenedBoxReturn?: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `/san-pham/:slug` and the legacy `/product/:id` both land on the PDP. */
export const isProductGuid = (value: string) => UUID_RE.test(value);

export const MEDIA_TYPES: Record<MediaType, MediaType> = {
    Image: 'Image', Video: 'Video', YoutubeEmbed: 'YoutubeEmbed',
};

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

    createProductReview: async (productId: string, data: CreateProductReviewRequest) => {
        const response = await client.post<{ message: string; id: string; isVerifiedPurchase: boolean }>(
            `/catalog/products/${productId}/reviews`,
            data
        );
        return response.data;
    },

    /**
     * Tải MỘT ảnh cho đánh giá. Server kiểm magic bytes, mã hoá lại WebP, xoá EXIF — chỉ URL
     * trả về từ đây mới được chấp nhận trong `photos` khi tạo đánh giá.
     */
    uploadReviewPhoto: async (file: File, onProgress?: (percent: number) => void) => {
        const form = new FormData();
        form.append('file', file);
        const response = await client.post<ReviewPhoto>('/catalog/reviews/photos', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
                if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
            },
        });
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

    /**
     * THE PDP read. One call, by slug or by GUID, with the `include=` segments
     * the contract documents (`media,specs,variants` — there is no `reviews`
     * or `stock` include; those are separate endpoints).
     */
    getProductDetail: async (
        slugOrId: string,
        includes: ProductDetailInclude[] = ['media', 'specs', 'variants'],
    ): Promise<PublicProductDetail> => {
        const path = isProductGuid(slugOrId)
            ? `/catalog/products/${slugOrId}`
            : `/catalog/products/by-slug/${encodeURIComponent(slugOrId)}`;
        const response = await client.get<PublicProductDetail>(path, {
            params: includes.length ? { include: includes.join(',') } : undefined,
        });
        return response.data;
    },

    /** `GET /products/{id}/related?limit=` — same category first, then same brand. */
    getRelatedProducts: async (productId: string, limit = 8): Promise<Product[]> => {
        const response = await client.get<Product[]>(`/catalog/products/${productId}/related`, {
            params: { limit },
        });
        return Array.isArray(response.data) ? response.data : [];
    },

    /** D08 — warranty months actually in force for this product. Never hardcode. */
    getEffectiveWarrantyPolicy: async (productId: string): Promise<EffectiveWarrantyPolicy> => {
        const response = await client.get<EffectiveWarrantyPolicy>('/warranty/policies/effective', {
            params: { productId },
        });
        return response.data;
    },

    /**
     * @deprecated Legacy bundle read kept for the wave-0 call sites that still
     * use it (`guest-cart-storage`, `specification-editor`, `NewReturnRequestPage`,
     * `ComparePage`). The `include` list was `medias,variants,specs,stock`, none
     * of which the endpoint understands — the documented values are
     * `media`, `specs`, `variants` (catalog.md §2), so every array came back
     * null. Fixed here; new code calls `getProductDetail`.
     */
    getProductWithDetails: async (id: string): Promise<ProductDetailBundle> => {
        const response = await client.get<ProductDetailBundle>(`/catalog/products/${id}?include=media,specs,variants`);
        return response.data;
    },

    /** D08 — return/exchange windows actually in force for this product. */
    getEffectiveReturnPolicy: async (productId: string): Promise<EffectiveReturnPolicy> => {
        const response = await client.get<EffectiveReturnPolicy>('/sales/return-policies/effective', {
            params: { productId },
        });
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
