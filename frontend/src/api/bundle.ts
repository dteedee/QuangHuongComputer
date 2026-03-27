import { client } from './client';

/**
 * Product Bundle & Combo Deals API
 * Phase 3.2
 */

// ============================================
// TYPES
// ============================================

export interface ProductBundleItem {
    id: string;
    productId: string;
    isMainItem: boolean;
    quantity: number;
    originalUnitPrice: number;
    discountPercentage: number;
    discountedUnitPrice: number;
    productName: string;
    productImage?: string;
    productSku?: string;
}

export interface ProductBundle {
    id: string;
    name: string;
    description: string;
    totalPrice: number;
    originalPrice: number;
    imageUrl?: string;
    validFrom?: string;
    validTo?: string;
    items: ProductBundleItem[];
}

export interface CreateBundleItemRequest {
    productId: string;
    isMainItem: boolean;
    quantity: number;
    discountPercentage: number;
}

export interface CreateBundleRequest {
    name: string;
    description?: string;
    totalPrice: number;
    originalPrice: number;
    imageUrl?: string;
    validFrom?: string;
    validTo?: string;
    items: CreateBundleItemRequest[];
}

// ============================================
// API
// ============================================

export const bundleApi = {
    /** 
     * Get all currently active bundles 
     */
    getActiveBundles: async (): Promise<ProductBundle[]> => {
        const response = await client.get<ProductBundle[]>('/catalog/bundles');
        return response.data;
    },

    /** 
     * Get bundle by ID
     */
    getBundleById: async (id: string): Promise<ProductBundle> => {
        const response = await client.get<ProductBundle>(`/catalog/bundles/${id}`);
        return response.data;
    },

    /** 
     * Get all active bundles that contain a specific product
     * Useful for displaying "Mua kèm giảm giá" on ProductDetail page
     */
    getBundlesByProduct: async (productId: string): Promise<ProductBundle[]> => {
        const response = await client.get<ProductBundle[]>(`/catalog/bundles/product/${productId}`);
        return response.data;
    },

    /** 
     * Create a new bundle (Admin only)
     */
    createBundle: async (data: CreateBundleRequest): Promise<string> => {
        const response = await client.post<string>('/catalog/bundles', data);
        return response.data;
    }
};
