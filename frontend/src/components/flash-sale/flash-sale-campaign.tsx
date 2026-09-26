/**
 * One running flash sale on `/flash-sale`: the page's single loud `ink` panel (name, description,
 * countdown, stock summary) above the full product grid. `ProductCard` already renders the flash
 * price vs the catalogue price, the "-x%" badge, the sold/limit bar and the "Hết suất" state.
 *
 * Ended while the page is open (countdown hits 0) -> the grid is replaced by a notice: the flash
 * prices are no longer honoured at checkout, so showing them with an add-to-cart button would lie.
 */
import { Link } from 'react-router-dom';
import { Clock, Zap } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { ListingGridSkeleton } from '../listing/listing-grid';
import { Badge, EmptyState } from '../ui';
import { FlashSaleCountdown } from '../homepage/flash-sale-countdown';
import { useCountdown } from '../promotions/use-countdown';
import { useFlashSaleTiles } from './use-flash-sale-tiles';
import type { ActiveFlashSale } from '../../api/promotions/public';
import { ROUTES } from '../../routes/route-paths';

export const FlashSaleCampaign = ({ sale }: { sale: ActiveFlashSale }) => {
    const { rows, tiles, isLoading } = useFlashSaleTiles(sale);
    const { ended } = useCountdown(sale.endAt);
    const allSoldOut = rows.length > 0 && rows.every((row) => row.isSoldOut);
    const remaining = rows.reduce<number | null>(
        (sum, row) => (sum === null || row.remaining === null ? null : sum + Math.max(0, row.remaining)),
        0,
    );

    if (rows.length === 0) return null;

    return (
        <section aria-labelledby={`flash-${sale.id}`} className="mt-6">
            <div className="flex flex-col gap-4 rounded-2xl bg-ink p-5 text-on-ink sm:flex-row sm:items-center sm:justify-between lg:p-7">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                        <Zap size={20} className="fill-current" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h2 id={`flash-${sale.id}`} className="font-display text-xl font-bold tracking-tight lg:text-2xl">
                            {sale.name}
                        </h2>
                        {sale.description && <p className="mt-1 text-sm text-on-ink-muted">{sale.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-ink-muted">
                            <span className="num">{rows.length} sản phẩm</span>
                            {remaining !== null && !allSoldOut && <span className="num">· còn {remaining} suất</span>}
                            {allSoldOut && <Badge variant="discount">Đã bán hết suất</Badge>}
                        </div>
                    </div>
                </div>
                {sale.endAt ? (
                    <div className="shrink-0">
                        <p className="mb-1 flex items-center gap-1 text-2xs uppercase tracking-wide text-on-ink-muted">
                            <Clock size={12} aria-hidden /> {ended ? 'Chương trình' : 'Kết thúc sau'}
                        </p>
                        <FlashSaleCountdown endAt={sale.endAt} />
                    </div>
                ) : (
                    <p className="text-sm text-on-ink-muted">Áp dụng đến khi hết suất</p>
                )}
            </div>

            <div className="mt-4">
                {ended ? (
                    <EmptyState
                        icon={Clock}
                        title="Flash sale đã kết thúc"
                        description="Giá ưu đãi của đợt này không còn áp dụng. Xem các chương trình khuyến mãi khác đang chạy."
                    >
                        <Link to={ROUTES.PROMOTIONS} className="mt-4 text-sm font-semibold text-brand-text hover:underline">
                            Xem khuyến mãi khác
                        </Link>
                    </EmptyState>
                ) : isLoading && tiles.length === 0 ? (
                    <ListingGridSkeleton count={Math.min(rows.length, 8)} />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {tiles.map(({ row, product }) => (
                            <ProductCard
                                key={`${row.productId}:${row.variantId ?? ''}`}
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
                )}
            </div>
        </section>
    );
};

export default FlashSaleCampaign;
