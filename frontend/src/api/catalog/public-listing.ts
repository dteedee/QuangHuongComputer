/**
 * Catalog — storefront LISTING surface (browse grid, search, facets, autocomplete).
 *
 * Shapes here are declared against `docs/api-contracts/catalog.md` (W2-1) §1-§3
 * and verified live against the TEST API on :5050 (2026-09-18). `api/catalog/types.ts`
 * is owned by the admin track and its `Product`/`ProductsResponse` are narrower than
 * what the public endpoints actually return, so the storefront DTOs live in this file
 * (per the wave-3 ownership rule: "storefront tracks declare their own types").
 */
import client from '../client';
import { mapFacetsToFilters } from '../../components/listing/catalog-listing-helpers';
import type { Brand, Category, Product, ProductsResponse, SpecDataType } from './types';

/* ------------------------------------------------------------------ types */

/** What `/catalog/products(/search)` really returns per row (contract §1). */
export interface ListingProduct extends Product {
    /** D02: primary media thumbnail; cards prefer this over `imageUrl`. */
    thumbnailUrl?: string | null;
    categoryName?: string | null;
    categorySlug?: string | null;
    brandName?: string | null;
    brandSlug?: string | null;
    unitName?: string | null;
    warrantyMonths?: number | null;
}

/** One filterable attribute + its value counts over the FULL filtered set (contract §3). */
export interface ListingFacet {
    attributeId: string;
    attributeKey: string;
    attributeName: string;
    unit?: string | null;
    dataType: SpecDataType;
    values: Array<{ value: unknown; count: number }>;
}

/** Paged envelope of `/catalog/products` and `/catalog/products/search` (contract §2). */
export interface ListingResponse extends ProductsResponse {
    products: ListingProduct[];
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    /** 1-based index of the first/last row on this page; both 0 when `total === 0`. */
    rangeFrom: number;
    rangeTo: number;
    /** `null` on `/products`, an array on `/products/search`. */
    facets: ListingFacet[] | null;
}

/** `/catalog/categories` — flat list with `parentId`; the FE builds the tree. */
export interface PublicCategory extends Category {
    parentId?: string | null;
    imageUrl?: string | null;
    icon?: string | null;
    displayOrder?: number;
}

/** `/catalog/brands` — contract §5. */
export interface PublicBrand extends Brand {
    slug?: string | null;
    logoUrl?: string | null;
    website?: string | null;
    displayOrder?: number;
}

/**
 * Exactly the values `CatalogProductSearchEndpoints.cs:69-77` switches on —
 * anything else silently falls back to `newest`, so the UI offers only these.
 */
export type ListingSort = 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name';

export interface ListingSearchParams {
    query?: string;
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: ListingSort | string;
    page?: number;
    pageSize?: number;
    /**
     * Structured spec filters. Serialised as `spec[<key>]=<value>`; value syntax
     * supported by the backend filter builder: `AM5` (eq), `i5,i7` (in),
     * `16-32` (numeric between), `true`/`false`.
     */
    specs?: Record<string, string>;
}

/* -------------------------------------------------------------- serialise */

/** Flattens `specs` into the `spec[key]` query params the backend expects. */
function toQuery(params: ListingSearchParams): Record<string, string | number | boolean> {
    const { specs, ...rest } = params;
    const out: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(rest)) {
        if (value === undefined || value === null || value === '') continue;
        out[key] = value as string | number | boolean;
    }
    for (const [key, value] of Object.entries(specs ?? {})) {
        if (value) out[`spec[${key}]`] = value;
    }
    return out;
}

/* ----------------------------------------------------------------- client */

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
        const response = await client.get<ListingResponse>('/catalog/products', { params });
        return response.data;
    },

    /**
     * The single listing/search entry point: paged products + facet counts.
     * Everything the listing page, the homepage sections and the header
     * autocomplete render comes from here.
     */
    searchProducts: async (params: ListingSearchParams = {}) => {
        const response = await client.get<ListingResponse>('/catalog/products/search', {
            params: toQuery(params),
        });
        return response.data;
    },

    // Also used by admin dropdowns/menus — a plain read, no audience split needed.
    getCategories: async () => {
        const response = await client.get<PublicCategory[]>('/catalog/categories');
        return response.data;
    },

    getBrands: async () => {
        const response = await client.get<PublicBrand[]>('/catalog/brands');
        return response.data;
    },

    getCategoryFilters: async (categoryId: string, currentFilters?: Record<string, string>) => {
        // Backend trả về raw facet shape (attributeKey/attributeName + values:[{value,count}]),
        // khác với CategoryFilter UI cần (key/name + options/numberRange). Map lại ở đây.
        const response = await client.get<ListingFacet[]>(
            `/catalog/categories/${categoryId}/filters`,
            { params: currentFilters },
        );
        return mapFacetsToFilters(response.data);
    },
};
