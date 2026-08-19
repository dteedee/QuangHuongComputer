import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatNumber } from '../../utils/format';
import type { Product } from '../../api/catalog';

interface ProductDetailRelatedSectionProps {
  loading: boolean;
  relatedProducts: Product[];
  categoryId?: string;
}

/** "Sản phẩm liên quan" section shown on the product detail page. */
export default function ProductDetailRelatedSection({ loading, relatedProducts, categoryId }: ProductDetailRelatedSectionProps) {
  const navigate = useNavigate();

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sản phẩm liên quan</h2>
        <button
          onClick={() => navigate(categoryId ? `/products?category=${categoryId}` : '/products')}
          className="text-accent text-sm font-semibold hover:text-accent-hover transition-colors flex items-center gap-1 cursor-pointer"
        >
          Xem tất cả <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : relatedProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {relatedProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/san-pham/${p.slug || p.id}`)}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group overflow-hidden"
            >
              <div className="aspect-[4/3] bg-white p-4 flex items-center justify-center relative overflow-hidden">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <span className="text-gray-300 text-4xl font-black">{p.name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className="p-3 border-t border-gray-50 space-y-1">
                <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm group-hover:text-accent transition-colors leading-snug min-h-[2.5rem]">
                  {p.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-accent font-bold">
                    {formatNumber(p.price)}<sup className="text-[10px] font-bold ml-0.5">₫</sup>
                  </span>
                  {p.oldPrice && p.oldPrice > p.price && (
                    <span className="text-gray-400 line-through text-xs">{formatNumber(p.oldPrice)}₫</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">Không tìm thấy sản phẩm liên quan</p>
        </div>
      )}
    </section>
  );
}
