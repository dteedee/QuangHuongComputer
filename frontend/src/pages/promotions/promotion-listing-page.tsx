/**
 * `/khuyen-mai` — every promotion the customer can act on today (was buried at
 * `/chinh-sach/promotions` inside PolicyPage, which now redirects here).
 *
 * Three real sources, no invented deals:
 *   - running flash sale -> teaser linking to `/flash-sale` (`/api/content/promotions/active`)
 *   - campaign posts -> `Post.Type = Promotion` from `/api/content/posts` (banner, title, body
 *     with the conditions; detail at `/khuyen-mai/:slug`)
 *   - running coupon codes -> `/api/promotions/available` (rule, end date + countdown, copy CTA)
 * SEO shell: `PromotionSeoProvider`.
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import SEO from '../../components/SEO';
import { Breadcrumb, QueryBoundary } from '../../components/ui';
import { contentPublicApi } from '../../api/content/public';
import { queryKeys } from '../../lib/query-keys';
import { buildPath, ROUTES } from '../../routes/route-paths';
import { NewsGridSkeleton } from '../../components/news/news-grid-skeleton';
import { NewsPostCard } from '../../components/news/news-post-card';
import { FlashSaleTeaser } from '../../components/promotions/flash-sale-teaser';
import { RunningCodesSection } from '../../components/promotions/running-codes-section';

export const PromotionListingPage = () => {
    const navigate = useNavigate();
    const postsQuery = useQuery({
        queryKey: queryKeys.content.list({ resource: 'posts', type: 'Promotion' }),
        queryFn: () => contentPublicApi.getPosts('Promotion'),
        staleTime: 5 * 60 * 1000,
    });

    return (
        <div className="min-h-screen bg-bg pb-16">
            <SEO
                title="Khuyến mãi"
                description="Chương trình khuyến mãi, flash sale và mã giảm giá đang áp dụng tại Quang Hưởng Computer."
                canonicalUrl={typeof window !== 'undefined' ? `${window.location.origin}${ROUTES.PROMOTIONS}` : undefined}
            />

            <div className="mx-auto w-full max-w-shell px-4 pt-4">
                <Breadcrumb items={[{ label: 'Trang chủ', to: ROUTES.HOME }, { label: 'Khuyến mãi' }]} />
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">Khuyến mãi</h1>
                <p className="mt-1 text-sm text-fg-muted">
                    Ưu đãi đang áp dụng tại cửa hàng và khi mua online. Giá và mức giảm đã gồm VAT.
                </p>

                <FlashSaleTeaser className="mt-6" />

                <section aria-labelledby="promo-campaigns-heading" className="mt-8">
                    <h2 id="promo-campaigns-heading" className="font-display text-lg font-bold text-fg">
                        Chương trình khuyến mãi
                    </h2>
                    <div className="mt-3">
                        <QueryBoundary
                            query={postsQuery}
                            isEmpty={(posts) => posts.length === 0}
                            skeleton={<NewsGridSkeleton count={3} />}
                            errorTitle="Không tải được chương trình khuyến mãi"
                            empty={{
                                icon: Megaphone,
                                title: 'Chưa có chương trình khuyến mãi nào',
                                description: 'Cửa hàng sẽ đăng chương trình mới tại đây. Trong lúc chờ, bạn có thể xem sản phẩm đang bán.',
                                action: { label: 'Xem sản phẩm', onClick: () => navigate(ROUTES.PRODUCTS) },
                            }}
                        >
                            {(posts) => (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {posts.map((post) => (
                                        <NewsPostCard
                                            key={post.id}
                                            post={post}
                                            to={buildPath(ROUTES.PROMOTION_DETAIL, post.slug)}
                                            label={post.category}
                                        />
                                    ))}
                                </div>
                            )}
                        </QueryBoundary>
                    </div>
                </section>

                <RunningCodesSection className="mt-10" />
            </div>
        </div>
    );
};

export default PromotionListingPage;
