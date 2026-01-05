import client from './client';

// Types
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    brandId: string;
    stockQuantity: number;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: string;
    name: string;
    description: string;
}

export interface Brand {
    id: string;
    name: string;
    description: string;
}

export interface ProductsResponse {
    total: number;
    page: number;
    pageSize: number;
    products: Product[];
}

export interface CreateProductDto {
    name: string;
    description: string;
    price: number;
    categoryId: string;
    brandId: string;
    stockQuantity: number;
}

export interface UpdateProductDto {
    name: string;
    description: string;
    price: number;
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
    }) => {
        const response = await client.get<ProductsResponse>('/catalog/products', { params });
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
