/**
 * "Thường được mua cùng" — `GET /api/catalog/products/{id}/bought-together` (public, cached 3h
 * server-side). Items are published + in stock + variant-free products, ranked by how many
 * delivered/completed orders (and POS sales) in the last 180 days contained both products.
 *
 * `source: 'related'` = not enough order data yet; the server fell back to same category/brand.
 * `total` is computed by the SERVER for the anchor + `selected` items (all items when omitted) —
 * the page never adds prices itself.
 */
import { useQuery } from '@tanstack/react-query';
import client from '../client';
import type { Product } from './types';
import { queryKeys } from '../../lib/query-keys';

export interface BoughtTogetherItem {
    product: Product;
    /** Shared orders; 0 when the item came from the related-products fallback. */
    orderCount: number;
}

export interface BoughtTogetherResult {
    source: 'co-purchase' | 'related';
    anchor: Product;
    items: BoughtTogetherItem[];
    total: number;
}

export const boughtTogetherApi = {
    get: async (productId: string, limit = 6, selected?: string[]): Promise<BoughtTogetherResult> => {
        const params: Record<string, string | number> = { limit };
        if (selected) params.selected = selected.join(',');
        const response = await client.get<BoughtTogetherResult>(
            `/catalog/products/${productId}/bought-together`, { params });
        return response.data;
    },
};

/**
 * `selected === undefined` → server prices the full set. Changing the selection refetches only
 * the total; the previous response stays on screen meanwhile (no flicker of the item row).
 */
export function useBoughtTogether(productId: string | undefined, limit = 6, selected?: string[]) {
    return useQuery({
        queryKey: [...queryKeys.catalog.all, 'bought-together', productId ?? '', limit, selected?.join(',') ?? '*'],
        queryFn: () => boughtTogetherApi.get(productId!, limit, selected),
        enabled: Boolean(productId),
        staleTime: 5 * 60 * 1000,
        // Keep the previous answer only while the SAME product changes selection — never show
        // another product's suggestions after navigating between product pages.
        placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === productId ? prev : undefined),
    });
}
