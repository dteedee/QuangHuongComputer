import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShoppingCart, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useCart } from '../context/CartContext';
import { catalogApi, type Product } from '../api/catalog';
import toast from 'react-hot-toast';

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
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Filter out current product and limit items
  const productIds = recentlyViewed
    .filter(id => id !== currentProductId)
    .slice(0, maxItems);

  // Fetch product details
  useEffect(() => {
    const fetchProducts = async () => {
      if (productIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const fetchedProducts = await Promise.all(
          productIds.map(async (id) => {
            try {
              return await catalogApi.getProduct(id);
            } catch {
              return null;
            }
          })
        );

        // Filter out null results and maintain order
        const validProducts = fetchedProducts.filter((p): p is Product => p !== null);
        setProducts(validProducts);
      } catch (error) {
        console.error('Failed to fetch recently viewed products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [productIds.join(',')]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.stockQuantity > 0) {
      addToCart(product, 1);
      toast.success('Đã thêm vào giỏ hàng!');
    }
  };

  const handleClear = () => {
    if (window.confirm('Xóa tất cả sản phẩm đã xem?')) {
      clearRecentlyViewed();
      setProducts([]);
    }
  };

  const scrollLeft = () => {
    const container = document.getElementById('recently-viewed-container');
    if (container) {
      container.scrollBy({ left: -280, behavior: 'smooth' });
      setScrollPosition(container.scrollLeft - 280);
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('recently-viewed-container');
    if (container) {
      container.scrollBy({ left: 280, behavior: 'smooth' });
      setScrollPosition(container.scrollLeft + 280);
    }
  };

  // Don't render if no products
  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#D70018]" />
          <h2 className="text-lg font-bold text-gray-900 uppercase">{title}</h2>
          <span className="text-sm text-gray-400">({products.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {showClearButton && products.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Xóa
            </button>
          )}
          {products.length > 4 && (
            <div className="flex items-center gap-1">
              <button
                onClick={scrollLeft}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={scrollRight}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[200px] flex-shrink-0">
              <div className="aspect-square bg-gray-100 rounded-xl animate-pulse mb-3" />
              <div className="h-4 bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-5 bg-gray-100 rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        /* Products Grid */
        <div
          id="recently-viewed-container"
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => navigate(`/products/${product.id}`)}
              className="w-[200px] flex-shrink-0 bg-white rounded-xl border border-gray-100 hover:border-[#D70018]/30 hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
            >
              {/* Image */}
              <div className="aspect-square bg-gray-50 p-3 relative overflow-hidden">
                <img
                  src={product.imageUrl || `https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=200&h=200&fit=crop`}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300"
                />
                {product.oldPrice && product.oldPrice > product.price && (
                  <div className="absolute top-2 left-2 bg-[#D70018] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                  </div>
                )}
                {/* Quick Add Button */}
                <button
                  onClick={(e) => handleAddToCart(e, product)}
                  disabled={product.stockQuantity === 0}
                  className="absolute bottom-2 right-2 p-2 bg-white shadow-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#D70018] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-xs font-bold text-gray-900 line-clamp-2 h-8 group-hover:text-[#D70018] transition-colors uppercase leading-tight">
                  {product.name}
                </h3>
                <div className="mt-2">
                  <span className="text-sm font-black text-[#D70018]">
                    {formatPrice(product.price)}
                  </span>
                  {product.oldPrice && product.oldPrice > product.price && (
                    <span className="text-[10px] text-gray-400 line-through ml-2">
                      {formatPrice(product.oldPrice)}
                    </span>
                  )}
                </div>
                {product.stockQuantity === 0 && (
                  <span className="text-[10px] text-red-500 font-medium">Hết hàng</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentlyViewedProducts;
