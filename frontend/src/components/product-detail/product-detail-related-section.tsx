/**
 * "Sản phẩm liên quan" — `GET /products/{id}/related`. Renders W3-1's
 * `ProductCard` as-is instead of the hand-rolled tile that used to live here
 * (different image handling, different badges, no stock state: two product
 * tiles on one page that did not match).
 */
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Product } from '../../api/catalog';
import { ROUTES } from '../../routes/route-paths';
import { ProductCard } from '../ProductCard';
import { Skeleton } from '../ui';
import { Stagger, StaggerItem } from '../motion';

interface ProductDetailRelatedSectionProps {
  loading: boolean;
  relatedProducts: Product[];
  categoryId?: string;
  /** A real failure must not look like "no related products". */
  isError?: boolean;
}

export default function ProductDetailRelatedSection({
  loading, relatedProducts, categoryId, isError,
}: ProductDetailRelatedSectionProps) {
  if (isError) return null;

  return (
    <section aria-labelledby="related-heading">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="related-heading" className="text-2xl font-bold tracking-tight text-fg">
          Sản phẩm liên quan
        </h2>
        <Link
          to={categoryId ? `${ROUTES.PRODUCTS}?category=${categoryId}` : ROUTES.PRODUCTS}
          className="flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline"
        >
          Xem tất cả <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />)}
        </div>
      ) : relatedProducts.length > 0 ? (
        <Stagger className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {relatedProducts.map((p) => (
            <StaggerItem key={p.id}>
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-surface py-10 text-center text-sm text-fg-muted">
          Chưa có sản phẩm liên quan trong danh mục này.
        </p>
      )}
    </section>
  );
}
