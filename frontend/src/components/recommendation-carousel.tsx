import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecommendations } from '../api/ai';

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
  score?: number;
  similarityScore?: number;
}

export default function RecommendationCarousel({
  productId,
  title = 'Sản phẩm gợi ý',
}: RecommendationCarouselProps) {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);

  useEffect(() => {
    if (!productId) return;
    getRecommendations(productId)
      .then(data => {
        const list = Array.isArray(data) ? data : data.recommendations || [];
        setProducts(list);
      })
      .catch(() => {});
  }, [productId]);

  if (products.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4 text-gray-900">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {products.map((p, idx) => {
          const pid = p.productId || p.id || idx.toString();
          const pname = p.productName || p.name || 'Sản phẩm';
          const score = p.score ?? p.similarityScore ?? 0;
          const href = `/san-pham/${p.slug || pid}`;

          return (
            <Link
              key={pid}
              to={href}
              className="min-w-[200px] max-w-[200px] bg-white rounded-lg shadow hover:shadow-md transition-shadow p-3 flex-shrink-0"
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={pname}
                  className="w-full h-32 object-contain mb-2"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center mb-2">
                  <span className="text-3xl font-black text-gray-300 uppercase">
                    {pname.charAt(0)}
                  </span>
                </div>
              )}
              <h3 className="text-sm font-medium line-clamp-2 text-gray-900 leading-snug">
                {pname}
              </h3>
              {p.price != null && p.price > 0 && (
                <p className="text-red-600 font-bold mt-1 text-sm">
                  {p.price.toLocaleString('vi-VN')}đ
                </p>
              )}
              {score > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Phù hợp: {(score * 100).toFixed(0)}%
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
