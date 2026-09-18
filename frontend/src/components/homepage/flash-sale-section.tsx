/**
 * The REAL flash-sale section.
 *
 * Source: `GET /api/content/promotions/active` (content-promotions contract §1)
 * — `Type=FlashSale`, `Status=Active`, inside the schedule. Each row carries the
 * flash price, the quantity limit and the sold counter, and the promotion
 * carries `endAt` for the countdown.
 *
 * When nothing is running the endpoint returns `[]` and this component renders
 * NOTHING. The version the audit found faked a "FLASH SALE" from the first five
 * products at their normal price.
 */
import { useQueries, useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { catalogPublicProductApi } from '../../api/catalog/public-product';
import { flashSalePublicApi } from '../../api/promotions/public';
import { queryKeys } from '../../lib/query-keys';
import { FlashSaleCountdown } from './flash-sale-countdown';

const MAX_TILES = 10;

export const FlashSaleSection = () => {
    const salesQuery = useQuery({
        queryKey: queryKeys.content.list({ resource: 'promotions-active' }),
        queryFn: flashSalePublicApi.getActive,
        staleTime: 60 * 1000,
    });

    const sale = salesQuery.data?.[0];
    // `PromotionReward.FlashPrice` is nullable in the domain (a FlashSale reward
    // may carry only a percentage), and the endpoint passes the null straight
    // through. A null price would render "0 ₫" and a fake "-100%" badge, so a
    // row without a real flash price is not a flash tile.
    const rows = (sale?.products ?? [])
        .filter((row) => Number.isFinite(row.flashPrice) && row.flashPrice > 0)
        .slice(0, MAX_TILES);

    // The feed carries product IDs and flash terms, not product cards — fetch
    // the products it actually references (no client-side guessing).
    const productQueries = useQueries({
        queries: rows.map((row) => ({
            queryKey: queryKeys.catalog.detail(row.productId),
            queryFn: () => catalogPublicProductApi.getProduct(row.productId),
            staleTime: 5 * 60 * 1000,
        })),
    });

    if (!sale || rows.length === 0) return null;

    const tiles = rows
        .map((row, i) => ({ row, product: productQueries[i]?.data }))
        .filter((t): t is { row: (typeof rows)[number]; product: NonNullable<(typeof productQueries)[number]['data']> } => !!t.product);

    if (tiles.length === 0) return null;

    return (
        <section className="mx-auto mt-10 w-full max-w-shell px-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl bg-brand px-4 py-3 text-white sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                        <Zap size={20} className="fill-current" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-black uppercase tracking-tight sm:text-xl">{sale.name}</h2>
                        {sale.description && <p className="truncate text-sm text-white/85">{sale.description}</p>}
                    </div>
                </div>
                {sale.endAt && <FlashSaleCountdown endAt={sale.endAt} />}
            </div>

            <div className="rounded-b-2xl border border-t-0 border-line bg-surface p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {tiles.map(({ row, product }) => (
                        <ProductCard
                            key={row.productId}
                            product={product}
                            flash={{
                                flashPrice: row.flashPrice,
                                remaining: row.remaining,
                                quantityLimit: row.quantityLimit,
                                soldCount: row.soldCount,
                            }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FlashSaleSection;
