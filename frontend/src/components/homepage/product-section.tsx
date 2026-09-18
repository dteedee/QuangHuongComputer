/**
 * A homepage product row, SERVER-filtered.
 *
 * The old version pulled one 50-item page and filtered it in the browser, so a
 * section silently emptied as soon as the catalogue passed ~70 products. Now
 * each section is its own `useQuery` against
 * `GET /catalog/products/search?categoryId=…&pageSize=…`.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { ErrorState, Skeleton } from '../ui';
import { Reveal } from '../motion';
import { catalogPublicListingApi, type ListingSort } from '../../api/catalog/public-listing';
import { queryKeys } from '../../lib/query-keys';
import { buildPath, ROUTES } from '../../routes/route-paths';

export interface ProductSectionProps {
    title: string;
    /** Category to scope the row to. Omit for a catalogue-wide row. */
    categoryId?: string;
    /** Slug for the "Xem tất cả" link. Resolved from the category list when omitted. */
    categorySlug?: string;
    limit?: number;
    sortBy?: ListingSort;
    showViewAll?: boolean;
}

const SectionSkeleton = ({ count }: { count: number }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="space-y-2 p-3">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-5 w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

export const ProductSection = ({
    title,
    categoryId,
    categorySlug,
    limit = 10,
    sortBy = 'newest',
    showViewAll = true,
}: ProductSectionProps) => {
    // Shared cache entry with the header/mega menu — no extra request.
    const categoriesQuery = useQuery({
        queryKey: queryKeys.catalog.list({ resource: 'categories' }),
        queryFn: catalogPublicListingApi.getCategories,
        staleTime: 5 * 60 * 1000,
        enabled: !!categoryId && !categorySlug,
    });

    const query = useQuery({
        queryKey: queryKeys.catalog.list({ section: title, categoryId, limit, sortBy }),
        queryFn: () => catalogPublicListingApi.searchProducts({ categoryId, pageSize: limit, sortBy }),
        staleTime: 60 * 1000,
    });

    // An empty row is noise on a homepage — render nothing rather than a hole.
    if (!query.isPending && !query.isError && (query.data?.products.length ?? 0) === 0) return null;

    const slug = categorySlug ?? categoriesQuery.data?.find((c) => c.id === categoryId)?.slug;
    const viewAllHref = slug ? buildPath(ROUTES.CATEGORY, slug) : ROUTES.PRODUCTS;

    return (
        <section className="mx-auto mt-10 w-full max-w-shell px-4">
            <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="text-lg font-bold uppercase tracking-tight text-fg sm:text-xl">{title}</h2>
                {showViewAll && (
                    <Link
                        to={viewAllHref}
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-text hover:underline"
                    >
                        Xem tất cả <ChevronRight size={15} aria-hidden />
                    </Link>
                )}
            </div>

            {query.isPending ? (
                <SectionSkeleton count={Math.min(limit, 5)} />
            ) : query.isError ? (
                <ErrorState
                    inline
                    title="Không tải được sản phẩm"
                    error={query.error}
                    onRetry={() => query.refetch()}
                />
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {query.data.products.map((product, i) => (
                        <Reveal key={product.id} index={i} cap={6} className="h-full">
                            <ProductCard product={product} />
                        </Reveal>
                    ))}
                </div>
            )}
        </section>
    );
};

export default ProductSection;
