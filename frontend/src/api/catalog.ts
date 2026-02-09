import client from './client';

// Types - Updated to match backend entities
export interface Product {
    id: string;
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
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface Brand {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
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
    specifications?: string;
    warrantyInfo?: string;
    imageUrl?: string;
    galleryImages?: string;
    lowStockThreshold?: number;
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
    }) => {
        const response = await client.get<ProductsResponse>('/catalog/products/search', { params });
        return response.data;
    },

    getProduct: async (id: string) => {
        const response = await client.get<Product>(`/catalog/products/${id}`);
        return response.data;
    },

    createProduct: async (data: CreateProductDto) => {
        const response = await client.post<{ message: string; productId: string; product: Product }>(
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
        return response.data;
    },

    deleteProduct: async (id: string) => {
        const response = await client.delete<{ message: string }>(`/catalog/products/${id}`);
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
    }) => {
        const response = await client.post<{ message: string; review: ProductReview }>(
            `/catalog/products/${productId}/reviews`,
            data
        );
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
        const response = await client.post<{ message: string; categoryId: string; category: Category }>(
            '/catalog/categories',
            data
        );
        return response.data;
    },

    updateCategory: async (id: string, data: { name: string; description: string }) => {
        const response = await client.put<{ message: string; category: Category }>(
            `/catalog/categories/${id}`,
            data
        );
        return response.data;
    },

    deleteCategory: async (id: string) => {
        const response = await client.delete<{ message: string }>(`/catalog/categories/${id}`);
        return response.data;
    },

    // Brands
    getBrands: async () => {
        const response = await client.get<Brand[]>('/catalog/brands');
        return response.data;
    },

    createBrand: async (data: { name: string; description: string }) => {
        const response = await client.post<{ message: string; brandId: string; brand: Brand }>(
            '/catalog/brands',
            data
        );
        return response.data;
    },

    updateBrand: async (id: string, data: { name: string; description: string }) => {
        const response = await client.put<{ message: string; brand: Brand }>(
            `/catalog/brands/${id}`,
            data
        );
        return response.data;
    },

    deleteBrand: async (id: string) => {
        const response = await client.delete<{ message: string }>(`/catalog/brands/${id}`);
        return response.data;
    },
};
