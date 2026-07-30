import client from './client';

// Types - Updated to match backend entities
export interface Product {
    id: string;
    slug?: string;
    name: string;
    sku: string;
    description: string;
    specifications?: string;
    warrantyInfo?: string;
    categoryId: string;
    brandId: string;
    stockQuantity: number;
    stockLocations?: string; // JSON string
    status: 'InStock' | 'LowStock' | 'OutOfStock' | 'PreOrder';

    // Enhanced fields
    price: number;
    oldPrice?: number;
    costPrice?: number;
    barcode?: string;
    weight: number;
    imageUrl?: string;
    galleryImages?: string;
    viewCount: number;
    soldCount: number;
    averageRating: number;
    reviewCount: number;
    publishedAt?: string;
    discontinuedAt?: string;
    lowStockThreshold: number;
    createdByUserId?: string;
    updatedByUserId?: string;

    // SEO fields
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    canonicalUrl?: string;

    // Audit fields
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;

    // Variant-aware fields (Phase 03)
    defaultVariantId?: string;
    priceFrom?: number; // Giá thấp nhất khi có nhiều biến thể; nếu undefined coi như dùng `price`
}

// ============ Phase 03: Media / Variants / Specifications ============

export type MediaType = 'Image' | 'Video' | 'YoutubeEmbed';

export interface ProductMedia {
    id: string;
    productId: string;
    variantId?: string;
    type: MediaType;
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    sortOrder: number;
    isPrimary: boolean;
    fileSize?: number;
    durationSeconds?: number;
}

export type OptionInputType = 'Dropdown' | 'Swatch' | 'Button';

export interface ProductOptionValue {
    id: string;
    optionTypeId: string;
    value: string;
    displayValue: string;
    colorHex?: string;
    sortOrder: number;
}

export interface ProductOptionType {
    id: string;
    name: string;
    displayName: string;
    inputType: OptionInputType;
    sortOrder: number;
    values: ProductOptionValue[];
}

export interface VariantOptionAssignment {
    optionTypeId: string;
    optionValueId: string;
    typeName: string;
    valueDisplay: string;
    colorHex?: string;
}

export type VariantStatus = 'Active' | 'Inactive' | 'OutOfStock';

export interface ProductVariant {
    id: string;
    productId: string;
    sku: string;
    name: string;
    price: number;
    oldPrice?: number;
    costPrice?: number;
    stockQuantity: number;
    barcode?: string;
    isDefault: boolean;
    status: VariantStatus;
    sortOrder: number;
    options: VariantOptionAssignment[];
}

export type SpecDataType = 'Text' | 'Number' | 'Boolean' | 'Enum';

export interface SpecificationAttribute {
    id: string;
    groupId: string;
    key: string;
    name: string;
    unit?: string;
    dataType: SpecDataType;
    isFilterable: boolean;
    isComparable: boolean;
    sortOrder: number;
}

export interface SpecificationGroup {
    id: string;
    categoryId?: string;
    name: string;
    sortOrder: number;
    attributes: SpecificationAttribute[];
}

export interface ProductSpecificationValue {
    productId: string;
    attributeId: string;
    valueText?: string;
    valueNumber?: number;
    valueBool?: boolean;
    /** Payload sẵn có cho UI hiển thị (nếu backend trả kèm). */
    attribute?: SpecificationAttribute;
}

export interface StockByBranch {
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    address?: string;
    openingHours?: string;
}

export interface CategoryFilterOption {
    value: string;
    label: string;
    count: number;
}

export interface CategoryFilter {
    attributeId: string;
    key: string;
    name: string;
    unit?: string;
    dataType: SpecDataType;
    options?: CategoryFilterOption[];
    numberRange?: { min: number; max: number };
}

export interface ProductDetailBundle extends Product {
    medias: ProductMedia[];
    variants: ProductVariant[];
    specs: ProductSpecificationValue[];
    specGroups?: SpecificationGroup[];
    stockByBranch?: StockByBranch[];
}

export interface ProductReview {
    id: string;
    productId: string;
    customerId: string;
    rating: number;
    title?: string;
    comment: string;
    isVerifiedPurchase: boolean;
    isApproved: boolean;
    helpfulCount: number;
    approvedAt?: string;
    approvedBy?: string;
    imageUrls?: string;
    videoUrl?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface ProductAttribute {
    id: string;
    productId: string;
    attributeName: string;
    attributeValue: string;
    displayOrder: number;
    isFilterable: boolean;
}

export interface Category {
    id: string;
    slug?: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    deactivatedAt?: string;
    deactivatedBy?: string;
    productCount?: number;
}

export interface Brand {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    deactivatedAt?: string;
    deactivatedBy?: string;
    productCount?: number;
}

export interface ProductsResponse {
    total: number;
    page: number;
    pageSize: number;
    products: Product[];
}

export interface CreateProductDto {
    name: string;
    sku?: string;
    description: string;
    price: number;
    costPrice?: number;
    categoryId: string;
    brandId: string;
    stockQuantity: number;
    specifications?: string;
    warrantyInfo?: string;
    barcode?: string;
    weight?: number;
    imageUrl?: string;
    galleryImages?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
}

export interface UpdateProductDto {
    name?: string;
    description?: string;
    price?: number;
    oldPrice?: number;
    costPrice?: number;
    categoryId?: string;
    brandId?: string;
    stockQuantity?: number;
    lowStockThreshold?: number;
    sku?: string;
    barcode?: string;
    weight?: number;
    specifications?: string;
    warrantyInfo?: string;
    stockLocations?: string;
    imageUrl?: string;
    galleryImages?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
}

// API Functions
export const catalogApi = {
    // Products
    getProducts: async (params?: {
        page?: number;
        pageSize?: number;
        categoryId?: string;
        brandId?: string;
        search?: string;
        minPrice?: number;
        maxPrice?: number;
        inStock?: boolean;
        sortBy?: string;
        isActive?: boolean;
        includeInactive?: boolean;
    }) => {
        const response = await client.get<ProductsResponse>('/catalog/products', { params });
        return response.data;
    },

    searchProducts: async (params?: {
        query?: string;
        categoryId?: string;
        brandId?: string;
        minPrice?: number;
        maxPrice?: number;
        inStock?: boolean;
        sortBy?: string;
        page?: number;
        pageSize?: number;
        /** Spec filter dynamic keys: `spec.<key>` allowed. */
        [key: `spec.${string}`]: string | number | boolean | undefined;
    }) => {
        const response = await client.get<ProductsResponse>('/catalog/products/search', { params });
        return response.data;
    },

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

    // Categories
    getCategories: async () => {
        const response = await client.get<Category[]>('/catalog/categories');
        return response.data;
    },

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

    // Brands
    getBrands: async () => {
        const response = await client.get<Brand[]>('/catalog/brands');
        return response.data;
    },

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

    activateCategory: async (id: string) => {
        const response = await client.post<{ message: string; category: Category }>(
            `/catalog/categories/${id}/activate`
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

    // ============ Phase 03 endpoints ============

    /** Lấy sản phẩm kèm media/variants/specs/stockByBranch (endpoint mở rộng). */
    getProductWithDetails: async (id: string): Promise<ProductDetailBundle> => {
        const response = await client.get<ProductDetailBundle>(`/catalog/products/${id}?include=medias,variants,specs,stock`);
        return response.data;
    },

    // Media (structured)
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
    getSpecGroupsByCategory: async (categoryId: string) => {
        const response = await client.get<SpecificationGroup[]>(`/catalog/categories/${categoryId}/spec-groups`);
        return response.data;
    },

    upsertProductSpecifications: async (productId: string, values: Array<Omit<ProductSpecificationValue, 'productId' | 'attribute'>>) => {
        const response = await client.post<{ message: string }>(`/catalog/products/${productId}/specifications`, { values });
        return response.data;
    },

    getCategoryFilters: async (categoryId: string, currentFilters?: Record<string, string>) => {
        const response = await client.get<CategoryFilter[]>(`/catalog/categories/${categoryId}/filters`, {
            params: currentFilters,
        });
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
