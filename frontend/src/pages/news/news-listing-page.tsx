/**
 * `/tin-tuc` — news listing (was only reachable as a list embedded in PolicyPage).
 *
 * Source: `GET /api/content/posts` (public, D10 publish predicate, 5-min cache). Promotion
 * posts are dropped here — they live on `/khuyen-mai`. Category tabs appear only when editors
 * actually set `Post.category`; the tab and the page number live in the URL (`?category=`,
 * `?page=`) so refresh/back reproduce the same view. The SEO shell answers this path from
 * `ContentPostSeoProvider` (title, canonical, breadcrumb JSON-LD).
 */
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Newspaper } from 'lucide-react';
import SEO from '../../components/SEO';
import { Breadcrumb, QueryBoundary, Tab, TabList, TabPanel, Tabs } from '../../components/ui';
import { contentPublicApi } from '../../api/content/public';
import { queryKeys } from '../../lib/query-keys';
import { ROUTES } from '../../routes/route-paths';
import { NewsGridSkeleton } from '../../components/news/news-grid-skeleton';
import { NewsListingResults } from '../../components/news/news-listing-results';
import { ALL_CATEGORIES, filterByCategory, isNewsPost, newsCategories } from '../../components/news/news-listing-helpers';

export const NewsListingPage = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const category = params.get('category') ?? ALL_CATEGORIES;
    const page = Math.max(1, Number(params.get('page')) || 1);

    const postsQuery = useQuery({
        queryKey: queryKeys.content.list({ resource: 'posts' }),
        queryFn: () => contentPublicApi.getPosts(),
        staleTime: 5 * 60 * 1000,
    });
    const newsPosts = useMemo(() => (postsQuery.data ?? []).filter(isNewsPost), [postsQuery.data]);
    const categories = useMemo(() => newsCategories(newsPosts), [newsPosts]);
    // A shared link to a category that no longer exists falls back to "Tất cả", not a blank page.
    const activeCategory = categories.includes(category) ? category : ALL_CATEGORIES;
    const isFiltered = activeCategory !== ALL_CATEGORIES;
    const visible = filterByCategory(newsPosts, activeCategory);

    const update = (patch: { category?: string; page?: number }) => {
        const next = new URLSearchParams(params);
        if (patch.category !== undefined) {
            if (patch.category !== ALL_CATEGORIES) next.set('category', patch.category);
            else next.delete('category');
            next.delete('page');
        }
        if (patch.page !== undefined) {
            if (patch.page > 1) next.set('page', String(patch.page));
            else next.delete('page');
        }
        setParams(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const results = (
        <QueryBoundary
            query={{ ...postsQuery, data: postsQuery.data ? visible : undefined }}
            isEmpty={(posts) => posts.length === 0}
            skeleton={<NewsGridSkeleton />}
            errorTitle="Không tải được danh sách bài viết"
            empty={{
                icon: Newspaper,
                title: 'Chưa có bài viết nào',
                description: 'Cửa hàng chưa đăng tin tức mới. Trong lúc chờ, bạn có thể xem sản phẩm đang bán.',
                action: { label: 'Xem sản phẩm', onClick: () => navigate(ROUTES.PRODUCTS) },
            }}
        >
            {(posts) => (
                <NewsListingResults
                    posts={posts}
                    page={page}
                    showFeatured={!isFiltered}
                    onPageChange={(p) => update({ page: p })}
                />
            )}
        </QueryBoundary>
    );

    return (
        <div className="min-h-screen bg-bg pb-16">
            <SEO
                title={isFiltered ? `Tin tức: ${activeCategory}` : 'Tin tức'}
                description="Tin tức công nghệ, hướng dẫn và thông báo mới nhất từ Quang Hưởng Computer."
                // D11: a filtered/paged listing is noindex,follow with the canonical on the clean URL.
                noindex={isFiltered || page > 1}
                canonicalUrl={typeof window !== 'undefined' ? `${window.location.origin}${ROUTES.NEWS}` : undefined}
            />

            <div className="mx-auto w-full max-w-shell px-4 pt-4">
                <Breadcrumb items={[{ label: 'Trang chủ', to: ROUTES.HOME }, { label: 'Tin tức' }]} />
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">Tin tức</h1>
                <p className="mt-1 text-sm text-fg-muted">Tin công nghệ, hướng dẫn sử dụng và thông báo từ cửa hàng.</p>

                <div className="mt-6">
                    {categories.length > 0 ? (
                        <Tabs value={activeCategory} onValueChange={(value) => update({ category: value })}>
                            <TabList aria-label="Chuyên mục tin tức">
                                <Tab value={ALL_CATEGORIES}>Tất cả</Tab>
                                {categories.map((c) => (
                                    <Tab key={c} value={c}>
                                        {c}
                                    </Tab>
                                ))}
                            </TabList>
                            <TabPanel value={activeCategory}>{results}</TabPanel>
                        </Tabs>
                    ) : (
                        results
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewsListingPage;
