/**
 * Catalog — storefront LISTING surface (browse grid, search, facets).
 * Split out of the old flat `api/catalog.ts` (W1-9, step 7c) so a storefront
 * track can own this file without touching admin CRUD. Functions moved
 * verbatim; `api/catalog.ts` re-exports them for existing importers.
 */
import client from '../client';
import type { Brand, Category, CategoryFilter, ProductsResponse, SpecDataType } from './types';

export const catalogPublicListingApi = {
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

    // Also used by admin dropdowns/menus — a plain read, no audience split needed.
    getCategories: async () => {
        const response = await client.get<Category[]>('/catalog/categories');
        return response.data;
    },

    getBrands: async () => {
        const response = await client.get<Brand[]>('/catalog/brands');
        return response.data;
    },

    getCategoryFilters: async (categoryId: string, currentFilters?: Record<string, string>) => {
        // Backend trả về raw facet shape (attributeKey/attributeName + values:[{value,count}]),
        // khác với CategoryFilter UI cần (key/name + options/numberRange). Map lại ở đây.
        const response = await client.get<Array<{
            attributeId: string;
            attributeKey: string;
            attributeName: string;
            unit?: string;
            dataType: SpecDataType;
            values: Array<{ value: unknown; count: number }>;
        }>>(`/catalog/categories/${categoryId}/filters`, {
            params: currentFilters,
        });

        const mapped: CategoryFilter[] = response.data.map((f) => {
            const base: CategoryFilter = {
                attributeId: f.attributeId,
                key: f.attributeKey,
                name: f.attributeName,
                unit: f.unit,
                dataType: f.dataType,
            };

            if (f.dataType === 'Number') {
                const nums = f.values.map((v) => Number(v.value)).filter((n) => !Number.isNaN(n));
                if (nums.length > 0) {
                    base.numberRange = { min: Math.min(...nums), max: Math.max(...nums) };
                }
            } else if (f.dataType === 'Enum' || f.dataType === 'Text') {
                base.options = f.values
                    .filter((v) => v.value !== null && v.value !== undefined)
                    .map((v) => ({ value: String(v.value), label: String(v.value), count: v.count }));
            }

            return base;
        });

        return mapped;
    },
};
