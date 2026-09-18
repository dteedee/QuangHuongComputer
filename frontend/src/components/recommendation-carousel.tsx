/**
 * "Sản phẩm gợi ý" — `GET /api/ai/recommendations/{productId}`.
 *
 * The payload carries only id, name, slug, price and an image. It deliberately
 * does NOT render W3-1's `ProductCard`: that tile prints a SKU chip, a rating
 * and a stock state, and feeding it defaults would put "Còn hàng" and an empty
 * "Mã:" under a product whose stock this endpoint never told us about. So the
 * rail shows exactly the four fields that are real, on the same tokens, and
 * links to the PDP where everything else is true.
 *
 * Nothing at all is rendered when the endpoint returns no recommendation.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { getRecommendations } from '../api/ai';
import { buildPath, ROUTES } from '../routes/route-paths';
import { Img, Skeleton, formatDong } from './ui';

interface RecommendationCarouselProps {
  productId: string;
  title?: string;
}

interface RecommendedProduct {
  productId?: string;
  id?: string;
  productName?: string;
  name?: string;
  slug?: string;
  imageUrl?: string;
  price?: number;
}

export default function RecommendationCarousel({
  productId,
  title = 'Sản phẩm gợi ý',
}: RecommendationCarouselProps) {
  const query = useQuery<RecommendedProduct[]>({
    queryKey: ['ai', 'recommendations', productId],
    queryFn: async () => {
      const data = await getRecommendations(productId);
      const list = Array.isArray(data) ? data : (data?.recommendations ?? []);
      return Array.isArray(list) ? (list as RecommendedProduct[]) : [];
    },
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (query.isPending) {
    return (
      <section>
        <Skeleton className="mb-4 h-7 w-56" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
        </div>
      </section>
    );
  }

  const products = (query.data ?? [])
    .filter((p) => (p.productId || p.id) && (p.productName || p.name))
    .slice(0, 4);
  if (query.isError || products.length === 0) return null;

  return (
    <section aria-labelledby="recommendations-heading">
      <h2 id="recommendations-heading" className="mb-4 text-xl font-bold tracking-tight text-fg">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => {
          const id = (p.productId || p.id)!;
          const name = (p.productName || p.name)!;
          return (
            <Link
              key={id}
              to={buildPath(ROUTES.PRODUCT_DETAIL, p.slug || id)}
              className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition duration-220 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md motion-reduce:transform-none"
            >
              <Img
                src={p.imageUrl}
                alt={name}
                ratio="4/3"
                fit="contain"
                blend
                wrapperClassName="rounded-t-xl"
              />
              <div className="flex flex-1 flex-col border-t border-line p-3">
                <h3 className="line-clamp-2 text-sm font-medium leading-snug text-fg group-hover:text-brand-text">
                  {name}
                </h3>
                {p.price != null && p.price > 0 && (
                  <p className="num price mt-auto pt-2 text-base font-bold text-brand-text">
                    {formatDong(p.price)}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
