/**
 * The ONE listing page. Replaces `ProductCatalogPage` + `CategoryPage`, which
 * were two divergent implementations whose filters disagreed — and whose
 * category navigation passed `?categoryId=` to a page that ignored it, so
 * "CPU" showed all 26 products.
 *
 * Serves three routes, all from the same state machine:
 *   /san-pham          all products
 *   /danh-muc/:slug    one category (slug is the state, not a query param)
 *   /tim-kiem?q=...    search results (noindex)
 *
 * Every filter, the sort and the page number live in the URL — refresh and
 * back-button reproduce the exact same grid.
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import SEO from '../components/SEO';
import { Button } from '../components/ui';
import { ListingAppliedChips } from '../components/listing/listing-applied-chips';
import { ListingFilterDrawer } from '../components/listing/listing-filter-drawer';
import { ListingFilterPanel } from '../components/listing/listing-filter-panel';
import { ListingResults } from '../components/listing/listing-results';
import { ListingPageHeader } from '../components/listing/listing-page-header';
import { ListingSortSelect } from '../components/listing/listing-sort-select';
import { useListingQuery } from '../components/listing/use-listing-query';
import { catalogPublicListingApi } from '../api/catalog/public-listing';
import { mapFacetsToFilters } from '../components/listing/catalog-listing-helpers';
import { queryKeys } from '../lib/query-keys';
import { buildPath, ROUTES } from '../routes/route-paths';

const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

export const ProductListingPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const isSearchRoute = location.pathname.startsWith(ROUTES.SEARCH);

    const categoriesQuery = useQuery({
        queryKey: queryKeys.catalog.list({ resource: 'categories' }),
        queryFn: catalogPublicListingApi.getCategories,
        staleTime: CATALOG_STALE_TIME_MS,
    });
    const brandsQuery = useQuery({
        queryKey: queryKeys.catalog.list({ resource: 'brands' }),
        queryFn: catalogPublicListingApi.getBrands,
        staleTime: CATALOG_STALE_TIME_MS,
    });

    const categories = categoriesQuery.data;
    const category = useMemo(
        () => (slug ? categories?.find((c) => c.slug === slug) : undefined),
        [categories, slug],
    );

    const { state, apiParams, setFilters, clearFilters } = useListingQuery(category, brandsQuery.data);

    const productsQuery = useQuery({
        queryKey: queryKeys.catalog.list(apiParams as Record<string, unknown>),
        queryFn: () => catalogPublicListingApi.searchProducts(apiParams),
        // A category slug only becomes an id once `/categories` has answered;
        // firing before that (or when the slug matches no category) would fetch
        // the UNFILTERED set and show the whole catalogue under a dead slug.
        enabled: !slug || !!category,
        staleTime: 60 * 1000,
    });

    // Legacy `?categoryId=<guid>` (old menu links, bookmarks, external ads) is
    // accepted once and rewritten to the canonical slug URL.
    const legacyCategoryId = params.get('categoryId');
    const legacyTarget = useMemo(() => {
        if (!legacyCategoryId || !categories) return null;
        const match = categories.find((c) => c.id === legacyCategoryId);
        return match?.slug ? buildPath(ROUTES.CATEGORY, match.slug) : ROUTES.PRODUCTS;
    }, [legacyCategoryId, categories]);

    useEffect(() => {
        if (drawerOpen) setDrawerOpen(false);
        // Closing the mobile drawer on navigation, not on every filter change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    if (legacyTarget) return <Navigate to={legacyTarget} replace />;

    const specFilters = mapFacetsToFilters(productsQuery.data?.facets);
    const specLabels = Object.fromEntries(specFilters.map((f) => [f.key, f.name]));
    const total = productsQuery.data?.total ?? 0;
    const heading = isSearchRoute
        ? state.q
            ? `Kết quả cho “${state.q}”`
            : 'Tìm kiếm sản phẩm'
        : category?.name ?? 'Tất cả sản phẩm';

    const unknownCategory = !!slug && categoriesQuery.isSuccess && !category;
    const title = unknownCategory ? 'Không tìm thấy danh mục' : heading;

    const breadcrumb = [
        { label: 'Trang chủ', to: ROUTES.HOME },
        ...(category ? [{ label: 'Sản phẩm', to: ROUTES.PRODUCTS }, { label: category.name }] : [{ label: title }]),
    ];

    return (
        <div className="min-h-screen bg-bg pb-16">
            <SEO
                title={title}
                description={
                    category?.description ||
                    'Danh mục sản phẩm chính hãng tại Quang Hưởng Computer — giá niêm yết đã gồm VAT, bảo hành đầy đủ.'
                }
                // D11: a filtered or sorted listing is noindex,follow with the
                // canonical pointing at the clean URL.
                noindex={unknownCategory || isSearchRoute || state.hasFilters || state.page > 1 || state.sort !== 'newest'}
                canonicalUrl={
                    typeof window !== 'undefined' ? `${window.location.origin}${location.pathname}` : undefined
                }
            />

            <ListingPageHeader
                breadcrumb={breadcrumb}
                title={title}
                total={total}
                showCount={!unknownCategory}
                isLoading={productsQuery.isPending}
            />

            <div className="mx-auto mt-4 flex w-full max-w-shell gap-6 px-4">
                <aside className="hidden w-64 shrink-0 lg:block">
                    <div className="sticky top-24 rounded-2xl border border-line bg-surface p-4">
                        <h2 className="mb-2 text-sm font-semibold text-fg">Bộ lọc</h2>
                        <ListingFilterPanel
                            state={state}
                            brands={brandsQuery.data ?? []}
                            specFilters={specFilters}
                            onChange={setFilters}
                        />
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={SlidersHorizontal}
                            className="lg:hidden"
                            onClick={() => setDrawerOpen(true)}
                        >
                            Bộ lọc
                        </Button>
                        <ListingSortSelect
                            value={state.sort}
                            onChange={(sort) => setFilters({ sort })}
                            className="ml-auto w-48"
                        />
                    </div>

                    <div className="mb-3">
                        <ListingAppliedChips
                            state={state}
                            brands={brandsQuery.data}
                            specLabels={specLabels}
                            onChange={setFilters}
                            onClear={clearFilters}
                        />
                    </div>

                    <ListingResults
                        query={productsQuery}
                        unknownCategory={unknownCategory}
                        hasFilters={state.hasFilters}
                        onClearFilters={clearFilters}
                        onBrowseAll={() => navigate(ROUTES.PRODUCTS)}
                        onPageChange={(page) => {
                            setFilters({ page: page > 1 ? page : null });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    />
                </main>
            </div>

            <ListingFilterDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                total={total}
                state={state}
                brands={brandsQuery.data ?? []}
                specFilters={specFilters}
                onChange={setFilters}
                onClear={clearFilters}
            />
        </div>
    );
};

export default ProductListingPage;
