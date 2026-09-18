/**
 * "Đã xem gần đây" strip. Renders W3-1's `ProductCard` from the snapshots the
 * `useRecentlyViewed` hook keeps in localStorage — no network call, so opening
 * a PDP no longer inflates the `viewCount` of every remembered product.
 */
import { Clock } from 'lucide-react';

import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import type { Product } from '../api/catalog';
import { ProductCard } from './ProductCard';
import { Button } from './ui';

interface RecentlyViewedProductsProps {
  currentProductId?: string;
  title?: string;
  maxItems?: number;
  showClearButton?: boolean;
}

export function RecentlyViewedProducts({
  currentProductId,
  title = 'Sản phẩm đã xem',
  maxItems = 8,
  showClearButton = false,
}: RecentlyViewedProductsProps) {
  const { recentlyViewedProducts, clearRecentlyViewed } = useRecentlyViewed();

  const products = recentlyViewedProducts
    .filter((p) => p.id !== currentProductId)
    .slice(0, maxItems);

  if (products.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2
          id="recently-viewed-heading"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight text-fg"
        >
          <Clock className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
          {title}
        </h2>
        {showClearButton && (
          <Button variant="ghost" size="sm" onClick={clearRecentlyViewed}>
            Xoá lịch sử
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={{
              ...p,
              averageRating: p.averageRating ?? 0,
              reviewCount: p.reviewCount ?? 0,
            } as unknown as Product}
          />
        ))}
      </div>
    </section>
  );
}

export default RecentlyViewedProducts;
