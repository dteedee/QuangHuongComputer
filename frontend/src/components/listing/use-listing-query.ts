/**
 * The listing page's single source of truth: the URL.
 *
 * Every filter, the sort and the page number live in `useSearchParams`, so a
 * refresh, a back button or a pasted link all reproduce exactly the same grid.
 * This kills the `?categoryId=` bug class the audit found (a category link that
 * showed all 26 products because the page ignored the param): here the category
 * comes from the route slug, and a legacy `?categoryId=<guid>` is rewritten to
 * the canonical slug URL instead of being dropped.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ListingSearchParams, ListingSort, PublicBrand, PublicCategory } from '../../api/catalog/public-listing';

export const PAGE_SIZE = 24;

export const SORT_OPTIONS: Array<{ value: ListingSort; label: string }> = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price_asc', label: 'Giá thấp đến cao' },
    { value: 'price_desc', label: 'Giá cao đến thấp' },
    { value: 'popular', label: 'Xem nhiều nhất' },
    { value: 'name', label: 'Tên A → Z' },
];

const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);

/** Query-string keys. Vietnamese where the customer may see them in the URL bar. */
export const LISTING_PARAMS = {
    q: 'q',
    brand: 'hang',
    min: 'gia-tu',
    max: 'gia-den',
    inStock: 'con-hang',
    sort: 'sap-xep',
    page: 'trang',
    /** Spec filters are `spec.<attributeKey>=<value>`. */
    specPrefix: 'spec.',
} as const;

export interface ListingState {
    q: string;
    brandSlug: string;
    minPrice?: number;
    maxPrice?: number;
    inStock: boolean;
    sort: ListingSort;
    page: number;
    specs: Record<string, string>;
    /** True when anything beyond the category/search term narrows the result. */
    hasFilters: boolean;
}

function toNumber(raw: string | null): number | undefined {
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function readListingState(params: URLSearchParams): ListingState {
    const specs: Record<string, string> = {};
    params.forEach((value, key) => {
        if (key.startsWith(LISTING_PARAMS.specPrefix) && value) {
            specs[key.slice(LISTING_PARAMS.specPrefix.length)] = value;
        }
    });
    const sortRaw = params.get(LISTING_PARAMS.sort) as ListingSort | null;
    const page = Number(params.get(LISTING_PARAMS.page) ?? '1');
    const state: Omit<ListingState, 'hasFilters'> = {
        q: params.get(LISTING_PARAMS.q)?.trim() ?? '',
        brandSlug: params.get(LISTING_PARAMS.brand) ?? '',
        minPrice: toNumber(params.get(LISTING_PARAMS.min)),
        maxPrice: toNumber(params.get(LISTING_PARAMS.max)),
        inStock: params.get(LISTING_PARAMS.inStock) === '1',
        sort: sortRaw && SORT_VALUES.includes(sortRaw) ? sortRaw : 'newest',
        page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
        specs,
    };
    const hasFilters =
        !!state.brandSlug ||
        state.minPrice !== undefined ||
        state.maxPrice !== undefined ||
        state.inStock ||
        Object.keys(specs).length > 0;
    return { ...state, hasFilters };
}

/** Patch to apply to the URL. `null` removes a key; `page` resets to 1 unless given. */
export type ListingPatch = Partial<Record<keyof Omit<ListingState, 'hasFilters' | 'specs'>, string | number | boolean | null>> & {
    specs?: Record<string, string | null>;
};

const KEY_OF: Record<string, string> = {
    q: LISTING_PARAMS.q,
    brandSlug: LISTING_PARAMS.brand,
    minPrice: LISTING_PARAMS.min,
    maxPrice: LISTING_PARAMS.max,
    inStock: LISTING_PARAMS.inStock,
    sort: LISTING_PARAMS.sort,
    page: LISTING_PARAMS.page,
};

export function applyListingPatch(current: URLSearchParams, patch: ListingPatch): URLSearchParams {
    const next = new URLSearchParams(current);
    for (const [field, value] of Object.entries(patch)) {
        if (field === 'specs') continue;
        const key = KEY_OF[field];
        if (!key) continue;
        if (value === null || value === '' || value === false || value === undefined) next.delete(key);
        else next.set(key, value === true ? '1' : String(value));
    }
    for (const [specKey, specValue] of Object.entries(patch.specs ?? {})) {
        const key = `${LISTING_PARAMS.specPrefix}${specKey}`;
        if (specValue === null || specValue === '') next.delete(key);
        else next.set(key, specValue);
    }
    // Any change other than paging puts the customer back on page 1 — otherwise
    // narrowing a 3-page result while on page 3 shows an empty grid.
    if (patch.page === undefined) next.delete(LISTING_PARAMS.page);
    return next;
}

export interface UseListingQuery {
    state: ListingState;
    /** Params to hand to `catalogPublicListingApi.searchProducts`. */
    apiParams: ListingSearchParams;
    setFilters: (patch: ListingPatch) => void;
    clearFilters: () => void;
    /** The URL with every filter removed — used by the canonical link (D11). */
    searchString: string;
}

export function useListingQuery(
    category: PublicCategory | undefined,
    brands: PublicBrand[] | undefined,
): UseListingQuery {
    const [params, setParams] = useSearchParams();
    const state = useMemo(() => readListingState(params), [params]);

    const brandId = useMemo(
        () => brands?.find((b) => b.slug === state.brandSlug)?.id,
        [brands, state.brandSlug],
    );

    const apiParams = useMemo<ListingSearchParams>(
        () => ({
            query: state.q || undefined,
            categoryId: category?.id,
            brandId,
            minPrice: state.minPrice,
            maxPrice: state.maxPrice,
            inStock: state.inStock || undefined,
            sortBy: state.sort,
            page: state.page,
            pageSize: PAGE_SIZE,
            specs: state.specs,
        }),
        [state, category?.id, brandId],
    );

    const setFilters = useCallback(
        (patch: ListingPatch) => setParams(applyListingPatch(params, patch), { replace: false }),
        [params, setParams],
    );

    const clearFilters = useCallback(() => {
        const next = new URLSearchParams();
        const q = params.get(LISTING_PARAMS.q);
        if (q) next.set(LISTING_PARAMS.q, q);
        setParams(next, { replace: false });
    }, [params, setParams]);

    return { state, apiParams, setFilters, clearFilters, searchString: params.toString() };
}
