import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useComparison } from '../context/ComparisonContext';
import { catalogApi } from '../api/catalog';
import type { Product, ProductAttribute } from '../api/catalog';
import { formatCurrency } from '../utils/format';
import { ArrowLeft, Scale, X, ShoppingCart, Star, Check, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

interface ProductWithDetails extends Product {
  attributes?: ProductAttribute[];
}

export function ComparePage() {
  const { items, removeFromComparison, clearComparison } = useComparison();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/products');
      return;
    }
    loadProducts();
  }, [items.length]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productPromises = items.map(async (item) => {
        const product = await catalogApi.getProduct(item.id);
        return { ...product, attributes: [] as ProductAttribute[] };
      });
      const loadedProducts = await Promise.all(productPromises);
      setProducts(loadedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const parseSpecifications = (specs?: string): Record<string, string> => {
    if (!specs) return {};
    try {
      return JSON.parse(specs);
    } catch {
      return {};
    }
  };

  const getAllSpecKeys = (): string[] => {
    const keys = new Set<string>();
    products.forEach((product) => {
      const specs = parseSpecifications(product.specifications);
      Object.keys(specs).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  };

  const getAllAttributeNames = (): string[] => {
    const names = new Set<string>();
    products.forEach((product) => {
      product.attributes?.forEach((attr) => names.add(attr.attributeName));
    });
    return Array.from(names);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-xl w-1/4 mb-8" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const specKeys = getAllSpecKeys();
  const attributeNames = getAllAttributeNames();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-accent transition-colors mb-2 text-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
              Tiếp tục mua sắm
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Scale className="text-accent" size={24} />
              So sánh sản phẩm ({products.length})
            </h1>
          </div>
          <button
            onClick={() => { clearComparison(); navigate('/products'); }}
            className="border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all text-sm font-semibold cursor-pointer"
          >
            Xóa tất cả
          </button>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-48 p-4 text-left text-sm font-semibold text-gray-500 bg-gray-50">
                    Sản phẩm
                  </th>
                  {products.map((product) => (
                    <th key={product.id} className="p-4 text-center min-w-[240px]">
                      <div className="relative">
                        <button
                          onClick={() => removeFromComparison(product.id)}
                          className="absolute -top-2 -right-2 p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-red-100 hover:text-accent transition-all cursor-pointer"
                          title="Xóa khỏi so sánh"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <Link to={`/products/${product.id}`}>
                          <div className="w-36 h-36 mx-auto mb-3 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-gray-300 text-sm">No image</span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-800 hover:text-accent transition-colors line-clamp-2 text-sm">
                            {product.name}
                          </h3>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Price */}
                <tr className="border-b border-gray-100 bg-red-50/40">
                  <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">Giá</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <div className="text-xl font-bold text-accent">
                        {formatCurrency(product.price)}
                      </div>
                      {product.oldPrice && product.oldPrice > product.price && (
                        <div className="text-sm text-gray-400 line-through">
                          {formatCurrency(product.oldPrice)}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">Đánh giá</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.round(product.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                          />
                        ))}
                        <span className="ml-2 text-xs text-gray-500">({product.reviewCount})</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Stock Status */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">Tình trạng</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        product.stockQuantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* SKU */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">SKU</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center text-sm text-gray-600">
                      {product.sku || '-'}
                    </td>
                  ))}
                </tr>

                {/* Specifications */}
                {specKeys.length > 0 && (
                  <>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={products.length + 1} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Thông số kỹ thuật
                      </td>
                    </tr>
                    {specKeys.map((key) => (
                      <tr key={key} className="border-b border-gray-100">
                        <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">{key}</td>
                        {products.map((product) => {
                          const specs = parseSpecifications(product.specifications);
                          const value = specs[key];
                          return (
                            <td key={product.id} className="p-4 text-center text-sm text-gray-600">
                              {value || <Minus className="w-3 h-3 mx-auto text-gray-300" />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}

                {/* Attributes */}
                {attributeNames.length > 0 && (
                  <>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={products.length + 1} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Thuộc tính
                      </td>
                    </tr>
                    {attributeNames.map((name) => (
                      <tr key={name} className="border-b border-gray-100">
                        <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">{name}</td>
                        {products.map((product) => {
                          const attr = product.attributes?.find((a) => a.attributeName === name);
                          return (
                            <td key={product.id} className="p-4 text-center text-sm text-gray-600">
                              {attr?.attributeValue || <Minus className="w-3 h-3 mx-auto text-gray-300" />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}

                {/* Warranty */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">Bảo hành</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center text-sm text-gray-600">
                      {product.warrantyInfo || '-'}
                    </td>
                  ))}
                </tr>

                {/* Add to Cart */}
                <tr className="bg-gray-50">
                  <td className="p-4 bg-gray-50" />
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stockQuantity === 0}
                        className="w-full py-3 bg-accent hover:bg-red-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer text-sm px-4"
                      >
                        <ShoppingCart size={16} />
                        Thêm vào giỏ
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparison Summary */}
        {products.length >= 2 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tóm tắt so sánh</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Best Price */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">Giá tốt nhất</p>
                {(() => {
                  const cheapest = products.reduce((min, p) => p.price < min.price ? p : min);
                  return (
                    <div className="flex items-center gap-2">
                      <Check className="text-emerald-600 flex-shrink-0" size={16} />
                      <span className="font-medium text-gray-800 text-sm truncate">{cheapest.name}</span>
                      <span className="ml-auto text-emerald-700 font-bold text-sm whitespace-nowrap">
                        {formatCurrency(cheapest.price)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Best Rating */}
              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">Đánh giá cao nhất</p>
                {(() => {
                  const bestRated = products.reduce((max, p) => p.averageRating > max.averageRating ? p : max);
                  return (
                    <div className="flex items-center gap-2">
                      <Star className="text-yellow-500 flex-shrink-0 fill-yellow-500" size={16} />
                      <span className="font-medium text-gray-800 text-sm truncate">{bestRated.name}</span>
                      <span className="ml-auto text-yellow-700 font-bold text-sm">
                        {bestRated.averageRating.toFixed(1)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Most Popular */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Bán chạy nhất</p>
                {(() => {
                  const mostPopular = products.reduce((max, p) => p.soldCount > max.soldCount ? p : max);
                  return (
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="text-blue-600 flex-shrink-0" size={16} />
                      <span className="font-medium text-gray-800 text-sm truncate">{mostPopular.name}</span>
                      <span className="ml-auto text-blue-700 font-bold text-sm whitespace-nowrap">
                        {mostPopular.soldCount} đã bán
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComparePage;
