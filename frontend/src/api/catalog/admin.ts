/**
 * Catalog — ADMIN surface (product/category/brand CRUD, media, variants,
 * specs, bundles). Split out of the old flat `api/catalog.ts` (W1-9, step
 * 7c). Functions moved verbatim; `api/catalog.ts` re-exports them.
 */
import client from '../client';
import type {
    Brand,
    Category,
    CreateProductDto,
    Product,
    ProductMedia,
    ProductOptionType,
    ProductSpecificationValue,
    ProductVariant,
    UpdateBundleRequest,
    UpdateProductDto,
} from './types';

export const catalogAdminApi = {
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
    createCategory: async (data: { name: string; description: string }) => {
        const response = await client.post<Category>(
            '/catalog/categories',
            data
        );
        return response.data;
    },

    updateCategory: async (id: string, data: { name: string; description: string; isActive?: boolean }) => {
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
    createBrand: async (data: { name: string; description: string }) => {
        const response = await client.post<Brand>(
            '/catalog/brands',
            data
        );
        return response.data;
    },

    updateBrand: async (id: string, data: { name: string; description: string; isActive?: boolean }) => {
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

    uploadMedia: async (file: File): Promise<{ url: string; thumbnailUrl?: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post<{ url: string; thumbnailUrl?: string }>(
            '/catalog/media/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
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
