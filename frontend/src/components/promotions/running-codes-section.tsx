/**
 * "Mã giảm giá đang áp dụng" — every running manual-code promotion from
 * `GET /api/promotions/available`. Renders nothing when there is none (or the request fails):
 * it is a secondary block on `/khuyen-mai` and its detail pages, and an empty/error box for a
 * list the customer never asked for would only add noise.
 */
import { useQuery } from '@tanstack/react-query';
import { promotionCodePublicApi } from '../../api/promotions/public';
import { queryKeys } from '../../lib/query-keys';
import { cn } from '../../lib/utils';
import { PromotionCodeCard } from './promotion-code-card';

export interface RunningCodesSectionProps {
    /** `grid` = responsive 1/2/3 columns (listing); `stack` = one column (detail sidebar). */
    layout?: 'grid' | 'stack';
    className?: string;
}

export const RunningCodesSection = ({ layout = 'grid', className }: RunningCodesSectionProps) => {
    const codesQuery = useQuery({
        queryKey: queryKeys.content.list({ resource: 'promotion-codes-running' }),
        queryFn: promotionCodePublicApi.getRunningCodes,
        staleTime: 60 * 1000,
    });
    const codes = codesQuery.data ?? [];
    if (codes.length === 0) return null;

    return (
        <section aria-labelledby="running-codes-heading" className={className}>
            <h2 id="running-codes-heading" className="font-display text-lg font-bold text-fg">
                Mã giảm giá đang áp dụng
            </h2>
            <p className="mt-1 text-sm text-fg-muted">Nhập mã ở bước thanh toán. Mỗi đơn áp dụng theo điều kiện của từng mã.</p>
            <div
                className={cn(
                    'mt-3 grid gap-3',
                    layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1',
                )}
            >
                {codes.map((promo) => (
                    <PromotionCodeCard key={promo.id} promo={promo} />
                ))}
            </div>
        </section>
    );
};

export default RunningCodesSection;
