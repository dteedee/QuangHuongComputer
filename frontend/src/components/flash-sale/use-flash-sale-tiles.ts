/**
 * Turns one active flash sale (`GET /api/content/promotions/active`) into product tiles.
 *
 * The feed carries product IDs + flash terms, not product cards, so each referenced product
 * is fetched by id (same cache key as the PDP). Rows without a real flash price are dropped:
 * `PromotionReward.FlashPrice` is nullable server-side and a null would print "0 ₫" and a fake
 * "-100%". Products that fail to load (unpublished, deleted) are dropped rather than faked.
 * Shared by the homepage section and the `/flash-sale` landing page.
 */
import { useQueries } from '@tanstack/react-query';
import { catalogPublicProductApi } from '../../api/catalog/public-product';
import type { ActiveFlashSale, ActiveFlashSaleProduct } from '../../api/promotions/public';
import { queryKeys } from '../../lib/query-keys';

export function flashRowsWithPrice(sale: ActiveFlashSale | undefined, limit?: number): ActiveFlashSaleProduct[] {
    const rows = (sale?.products ?? []).filter((row) => Number.isFinite(row.flashPrice) && row.flashPrice > 0);
    return limit ? rows.slice(0, limit) : rows;
}

export function useFlashSaleTiles(sale: ActiveFlashSale | undefined, limit?: number) {
    const rows = flashRowsWithPrice(sale, limit);
    const productQueries = useQueries({
        queries: rows.map((row) => ({
            queryKey: queryKeys.catalog.detail(row.productId),
            queryFn: () => catalogPublicProductApi.getProduct(row.productId),
            staleTime: 5 * 60 * 1000,
        })),
    });

    const tiles = rows.flatMap((row, i) => {
        const product = productQueries[i]?.data;
        return product ? [{ row, product }] : [];
    });

    return {
        rows,
        tiles,
        isLoading: productQueries.some((q) => q.isPending),
    };
}
