/**
 * Brand rail on the homepage.
 *
 * Two defects fixed here (W3-1):
 * 1. **Mobile overflow (integration request W0 #61).** The grid used
 *    `gridTemplateColumns: repeat(${columns}, 1fr)` with `columns` up to 8, and
 *    `1fr` resolves to the content-based minimum, so 8 tracks could not fit in
 *    358px of usable width — `document.documentElement.scrollWidth` measured
 *    467px at a 390px viewport. Now `repeat(auto-fill, minmax(96px, 1fr))`,
 *    which wraps instead of overflowing.
 * 2. **Fabricated logos.** The CMS section config ships
 *    `https://placehold.co/160x64/...?text=ASUS` placeholder images, and every
 *    real `brands[].logoUrl` in the catalogue is null. Placeholder art
 *    presented as a brand logo is exactly what this overhaul removes, so the
 *    rail renders the REAL brands from `GET /catalog/brands` as text tiles and
 *    links each one to the listing filtered by that brand.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { Img, Skeleton } from '../ui';
import { Reveal } from '../motion';
import { catalogPublicListingApi } from '../../api/catalog/public-listing';
import { LISTING_PARAMS } from '../listing/use-listing-query';
import { queryKeys } from '../../lib/query-keys';
import { ROUTES } from '../../routes/route-paths';

interface BrandShowcaseProps {
    title?: string;
    config?: { showTitle?: boolean; limit?: number };
}

export const BrandShowcase = ({ title, config }: BrandShowcaseProps) => {
    const { showTitle = true, limit = 12 } = config ?? {};
    const query = useQuery({
        queryKey: queryKeys.catalog.list({ resource: 'brands' }),
        queryFn: catalogPublicListingApi.getBrands,
        staleTime: 5 * 60 * 1000,
    });

    const brands = (query.data ?? [])
        .filter((b) => b.isActive && (b.productCount ?? 0) > 0)
        .slice(0, limit);

    if (!query.isPending && brands.length === 0) return null;

    return (
        <section className="mx-auto mt-10 w-full max-w-shell px-4">
            {showTitle && (
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-fg sm:text-xl">
                    <Award size={20} className="text-brand" aria-hidden />
                    {title || 'Thương hiệu phân phối'}
                </h2>
            )}

            <div
                className="grid gap-3"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
            >
                {query.isPending
                    ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)
                    : brands.map((brand, i) => (
                          <Reveal key={brand.id} index={i} cap={6} className="h-full">
                              <Link
                                  to={`${ROUTES.PRODUCTS}?${LISTING_PARAMS.brand}=${encodeURIComponent(brand.slug ?? '')}`}
                                  className="flex h-[72px] min-w-0 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-2 text-center transition-colors duration-140 hover:border-brand-line"
                              >
                                  {brand.logoUrl ? (
                                      <Img
                                          src={brand.logoUrl}
                                          alt={brand.name}
                                          ratio="2/1"
                                          wrapperClassName="w-full bg-transparent"
                                      />
                                  ) : (
                                      <span className="truncate text-sm font-semibold text-fg-muted">{brand.name}</span>
                                  )}
                              </Link>
                          </Reveal>
                      ))}
            </div>
        </section>
    );
};

export default BrandShowcase;
