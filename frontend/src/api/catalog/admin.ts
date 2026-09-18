/**
 * Catalog — ADMIN surface (product/category/brand CRUD, media, variants,
 * specs, bundles). Split out of the old flat `api/catalog.ts` (W1-9, step
 * 7c). Functions moved verbatim; `api/catalog.ts` re-exports them.
 */
import client from '../client';
import { catalogSpecSchemaApi, catalogReviewAdminApi, uploadTaxonomyImage } from './admin-spec-reviews';
import type {
    AdminProductDetail,
    Brand,
    BrandWriteDto,
    Category,
    CategoryWriteDto,
    CreateProductDto,
    Product,
    ProductMedia,
    ProductOptionType,
    ProductPriceChange,
    ProductSpecificationValue,
    ProductVariant,
    UpdateBundleRequest,
    UpdateProductDto,
} from './types';

/** Admin list read — `includeInactive=true` is honoured for staff only (catalog.md §0.1). */
export interface AdminProductQuery {
    page?: number;
    pageSize?: number;
    categoryId?: string;
    brandId?: string;
    search?: string;
}

export const catalogAdminApi = {
    /**
     * Staff product list. `includeInactive=true` bypasses BOTH the global
     * `IsActive` filter and the publish filter, so the backoffice sees
     * "ngừng kinh doanh" and "chưa đăng web" rows the storefront cannot.
     */
    listProducts: async (params: AdminProductQuery) => {
        const response = await client.get<import('./types').ProductsResponse>('/catalog/products', {
            params: { ...params, includeInactive: true },
        });
        return response.data;
    },

    /**
     * One product with every tab's data in a single round trip.
     * NOTE the `include` values are `media,specs,variants` — the contract's exact
     * spelling (catalog.md §2); `medias` is silently ignored by the backend.
     */
    getProductForEdit: async (id: string) => {
        const response = await client.get<AdminProductDetail>(`/catalog/products/${id}`, {
            params: { include: 'media,specs,variants', includeInactive: true },
        });
        return response.data;
    },

    /** D10 — publish to the storefront. 400 when the product has no image. */
    publishProduct: async (id: string) => {
        const response = await client.post<{ message?: string }>(`/catalog/products/${id}/publish`);
        return response.data;
    },

    /** D10 — hide from the storefront only; the product still sells at POS. */
    unpublishProduct: async (id: string) => {
        const response = await client.post<{ message?: string }>(`/catalog/products/${id}/unpublish`);
        return response.data;
    },

    /**
     * D10 price history. The table + its SaveChanges hook exist and are populated,
     * but no read endpoint is deployed yet (probed 404 on :5050, 2026-09-18) —
     * integration request filed in `integration-requests-w3.md`. The screen shows
     * a real error state until it lands; nothing here is faked.
     */
    getPriceHistory: async (id: string) => {
        const response = await client.get<ProductPriceChange[]>(`/catalog/products/${id}/price-changes`);
        return response.data;
    },

    /** W2-22 bulk export (catalog-bulk.md §4) — returns the .xlsx blob. */
    exportProducts: async (params: { categoryId?: string; brandId?: string; ids?: string }) => {
        const response = await client.get<Blob>('/catalog/bulk/products/export', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },

    createProduct: async (data: CreateProductDto) => {
        const response = await client.post<Product>(
            '/catalog/products',
            data
        );
        return response.data;
    },

    updateProduct: async (id: string, data: UpdateProductDto) => {
        const response = await client.put<{ message: string; product: Product }>(
            `/catalog/products/${id}`,
            data
        );
        return { message: response.data.message, product: response.data.product };
    },

    deleteProduct: async (id: string) => {
        // Soft delete - deactivates the product
        const response = await client.delete<{ message: string; isActive: boolean }>(`/catalog/products/${id}`);
        return response.data;
    },

    activateProduct: async (id: string) => {
        const response = await client.post<{ message: string; isActive: boolean }>(`/catalog/products/${id}/activate`);
        return response.data;
    },

    toggleProductStatus: async (id: string) => {
        const response = await client.post<{ message: string; isActive: boolean }>(`/catalog/products/${id}/toggle-status`);
        return response.data;
    },

    // Categories
    createCategory: async (data: CategoryWriteDto) => {
        const response = await client.post<Category>(
            '/catalog/categories',
            data
        );
        return response.data;
    },

    updateCategory: async (id: string, data: CategoryWriteDto) => {
        const response = await client.put<{ message: string; category: Category }>(
            `/catalog/categories/${id}`,
            data
        );
        return response.data;
    },

    deleteCategory: async (id: string) => {
        const response = await client.delete<{ message: string }>(
            `/catalog/categories/${id}`
        );
        return response.data;
    },

    activateCategory: async (id: string) => {
        const response = await client.post<{ message: string; category: Category }>(
            `/catalog/categories/${id}/activate`
        );
        return response.data;
    },

    // Brands
    createBrand: async (data: BrandWriteDto) => {
        const response = await client.post<Brand>(
            '/catalog/brands',
            data
        );
        return response.data;
    },

    updateBrand: async (id: string, data: BrandWriteDto) => {
        const response = await client.put<{ message: string; brand: Brand }>(
            `/catalog/brands/${id}`,
            data
        );
        return response.data;
    },

    deleteBrand: async (id: string) => {
        const response = await client.delete<{ message: string }>(
            `/catalog/brands/${id}`
        );
        return response.data;
    },

    activateBrand: async (id: string) => {
        const response = await client.post<{ message: string; brand: Brand }>(
            `/catalog/brands/${id}/activate`
        );
        return response.data;
    },

    // Media
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post<{ url: string }>('/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * `POST /catalog/media/upload` — `productId` và `kind` là THAM SỐ QUERY bắt
     * buộc (`CatalogMediaEndpoints.cs:41-60`: thiếu `productId` thì route trả 400
     * "Sản phẩm không tồn tại"). Bản cũ không gửi cả hai nên mọi lần tải ảnh đều
     * hỏng — sửa ở đây, đúng file sở hữu của W3-4.
     *
     * `productId` để optional CHỈ vì `components/return/return-attachment-upload.tsx`
     * (thuộc W3-8) vẫn gọi 1 tham số; gọi thiếu nó vẫn sẽ bị máy chủ từ chối 400.
     * Đã gửi yêu cầu tích hợp cho chủ sở hữu file đó.
     */
    uploadMedia: async (
        file: File,
        productId?: string,
        kind: 'image' | 'video' = 'image',
    ): Promise<{ url: string; thumbnailUrl?: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post<{ url: string; thumbnailUrl?: string }>(
            '/catalog/media/upload',
            formData,
            { params: { productId, kind }, headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    addProductMedia: async (productId: string, data: Omit<ProductMedia, 'id' | 'productId'>) => {
        const response = await client.post<ProductMedia>(`/catalog/products/${productId}/media`, data);
        return response.data;
    },

    updateProductMedia: async (productId: string, mediaId: string, data: Partial<ProductMedia>) => {
        const response = await client.put<ProductMedia>(`/catalog/products/${productId}/media/${mediaId}`, data);
        return response.data;
    },

    deleteProductMedia: async (productId: string, mediaId: string) => {
        const response = await client.delete<{ message: string }>(`/catalog/products/${productId}/media/${mediaId}`);
        return response.data;
    },

    reorderProductMedia: async (productId: string, ids: string[]) => {
        const response = await client.post<{ message: string }>(`/catalog/products/${productId}/media/reorder`, { ids });
        return response.data;
    },

    // Variants
    getVariants: async (productId: string) => {
        const response = await client.get<ProductVariant[]>(`/catalog/products/${productId}/variants`);
        return response.data;
    },

    createVariantMatrix: async (productId: string, optionTypeIds: string[]) => {
        const response = await client.post<ProductVariant[]>(`/catalog/products/${productId}/variants`, { optionTypeIds });
        return response.data;
    },

    updateVariant: async (
        productId: string,
        variantId: string,
        data: Partial<Pick<ProductVariant, 'sku' | 'name' | 'price' | 'oldPrice' | 'costPrice' | 'stockQuantity' | 'barcode' | 'isDefault' | 'status' | 'sortOrder'>>
    ) => {
        const response = await client.put<ProductVariant>(`/catalog/products/${productId}/variants/${variantId}`, data);
        return response.data;
    },

    deleteVariant: async (productId: string, variantId: string) => {
        const response = await client.delete<{ message: string }>(`/catalog/products/${productId}/variants/${variantId}`);
        return response.data;
    },

    getOptionTypes: async () => {
        const response = await client.get<ProductOptionType[]>('/catalog/option-types');
        return response.data;
    },

    // Specifications
    upsertProductSpecifications: async (productId: string, values: Array<Omit<ProductSpecificationValue, 'productId' | 'attribute'>>) => {
        const response = await client.post<{ message: string }>(`/catalog/products/${productId}/specifications`, { values });
        return response.data;
    },

    /** See `admin-spec-reviews.ts` — kept out of this file to stay near the 200-line rule. */
    uploadTaxonomyImage,
    specSchema: catalogSpecSchemaApi,
    reviews: catalogReviewAdminApi,

    // Bundles — CatalogBundleEndpoints.cs (chưa nối UI, dùng khi có màn quản lý combo)
    bundles: {
        updateBundle: async (id: string, data: UpdateBundleRequest) => {
            const response = await client.put(`/catalog/bundles/${id}`, data);
            return response.data;
        },
        deleteBundle: async (id: string) => {
            const response = await client.delete<{ message: string }>(`/catalog/bundles/${id}`);
            return response.data;
        },
    },
};
