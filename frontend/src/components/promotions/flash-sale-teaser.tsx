/**
 * Link-out to `/flash-sale` while a flash sale is actually running (same feed and cache key as
 * the homepage section). Nothing running -> renders nothing. On `/khuyen-mai` this `ink` panel is
 * the page's single "loud" block (design-guidelines §1.2).
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Zap } from 'lucide-react';
import { flashSalePublicApi } from '../../api/promotions/public';
import { queryKeys } from '../../lib/query-keys';
import { ROUTES } from '../../routes/route-paths';
import { FlashSaleCountdown } from '../homepage/flash-sale-countdown';
import { flashRowsWithPrice } from '../flash-sale/use-flash-sale-tiles';

export const FlashSaleTeaser = ({ className }: { className?: string }) => {
    const salesQuery = useQuery({
        queryKey: queryKeys.content.list({ resource: 'promotions-active' }),
        queryFn: flashSalePublicApi.getActive,
        staleTime: 60 * 1000,
    });
    const sale = (salesQuery.data ?? []).find((s) => flashRowsWithPrice(s).length > 0);
    if (!sale) return null;

    return (
        <Link
            to={ROUTES.FLASH_SALE}
            className={`group flex flex-col gap-3 rounded-2xl bg-ink p-5 text-on-ink sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
        >
            <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                    <Zap size={20} className="fill-current" aria-hidden />
                </span>
                <span className="min-w-0">
                    <span className="block text-2xs uppercase tracking-wide text-on-ink-muted">Flash sale đang diễn ra</span>
                    <span className="block truncate font-display text-lg font-bold">{sale.name}</span>
                </span>
            </span>
            <span className="flex items-center gap-4">
                {sale.endAt && <FlashSaleCountdown endAt={sale.endAt} />}
                <span className="inline-flex items-center gap-0.5 text-sm font-semibold">
                    Săn deal <ChevronRight size={16} aria-hidden className="transition-transform duration-220 group-hover:translate-x-0.5" />
                </span>
            </span>
        </Link>
    );
};

export default FlashSaleTeaser;
