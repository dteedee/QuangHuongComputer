/**
 * `/flash-sale` — landing page for every running flash sale (the homepage section's
 * "Xem tất cả"). `Promotion` has no slug, so there is no `/flash-sale/:slug`: each running
 * sale is one block here, in the server's priority order.
 *
 * Source: `GET /api/content/promotions/active` (public; only Active + in-schedule FlashSale
 * promotions). Nothing running -> an honest empty state, never a fabricated deal. The SEO shell
 * answers this path from `FlashSaleSeoProvider` (noindex while nothing is running).
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import SEO from '../../components/SEO';
import { Breadcrumb, QueryBoundary, Skeleton } from '../../components/ui';
import { ListingGridSkeleton } from '../../components/listing/listing-grid';
import { FlashSaleCampaign } from '../../components/flash-sale/flash-sale-campaign';
import { flashRowsWithPrice } from '../../components/flash-sale/use-flash-sale-tiles';
import { flashSalePublicApi } from '../../api/promotions/public';
import { queryKeys } from '../../lib/query-keys';
import { ROUTES } from '../../routes/route-paths';

export const FlashSalePage = () => {
    const navigate = useNavigate();
    const salesQuery = useQuery({
        // Same key as the homepage section — one cache entry for the feed.
        queryKey: queryKeys.content.list({ resource: 'promotions-active' }),
        queryFn: flashSalePublicApi.getActive,
        staleTime: 60 * 1000,
        // Sold counters move while people shop; refresh them without a reload.
        refetchInterval: 60 * 1000,
    });
    const liveSales = (salesQuery.data ?? []).filter((sale) => flashRowsWithPrice(sale).length > 0);

    return (
        <div className="min-h-screen bg-bg pb-16">
            <SEO
                title={liveSales[0] ? `${liveSales[0].name} - Flash sale` : 'Flash sale'}
                description="Sản phẩm giá flash sale, số lượng có hạn tại Quang Hưởng Computer."
                noindex={salesQuery.isSuccess && liveSales.length === 0}
            />

            <div className="mx-auto w-full max-w-shell px-4 pt-4">
                <Breadcrumb items={[{ label: 'Trang chủ', to: ROUTES.HOME }, { label: 'Flash sale' }]} />
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">Flash sale</h1>
                <p className="mt-1 text-sm text-fg-muted">
                    Giá ưu đãi trong thời gian ngắn, số suất có hạn. Giá đã gồm VAT.
                </p>

                <QueryBoundary
                    query={{ ...salesQuery, data: salesQuery.data ? liveSales : undefined }}
                    isEmpty={(sales) => sales.length === 0}
                    skeleton={
                        <div className="mt-6">
                            <Skeleton rounded="rounded-2xl" className="mb-4 h-28" />
                            <ListingGridSkeleton count={8} />
                        </div>
                    }
                    errorTitle="Không tải được chương trình flash sale"
                    empty={{
                        icon: Zap,
                        title: 'Hiện chưa có flash sale nào',
                        description: 'Đợt giảm giá tiếp theo sẽ hiện ở đây ngay khi bắt đầu. Trong lúc chờ, xem các khuyến mãi đang chạy.',
                        action: { label: 'Xem khuyến mãi', onClick: () => navigate(ROUTES.PROMOTIONS) },
                        className: 'mt-6',
                    }}
                >
                    {(sales) => sales.map((sale) => <FlashSaleCampaign key={sale.id} sale={sale} />)}
                </QueryBoundary>
            </div>
        </div>
    );
};

export default FlashSalePage;
