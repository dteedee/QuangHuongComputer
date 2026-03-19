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

  // Parse specifications from JSON string
  const parseSpecifications = (specs?: string): Record<string, string> => {
    if (!specs) return {};
    try {
      return JSON.parse(specs);
    } catch {
      return {};
    }
  };

  // Get all unique specification keys across all products
  const getAllSpecKeys = (): string[] => {
    const keys = new Set<string>();
    products.forEach((product) => {
      const specs = parseSpecifications(product.specifications);
      Object.keys(specs).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  };

  // Get all unique attribute names across all products
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
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg" />
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
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-red-600 transition mb-2"
            >
              <ArrowLeft />
              Tiếp tục mua sắm
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Scale className="text-red-600" />
              So sánh sản phẩm ({products.length})
            </h1>
          </div>
          <button
            onClick={() => {
              clearComparison();
              navigate('/products');
            }}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
          >
            Xóa tất cả
          </button>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Product Images & Basic Info */}
              <thead>
                <tr className="border-b">
                  <th className="w-48 p-4 text-left text-sm font-medium text-gray-500 bg-gray-50">
                    Sản phẩm
                  </th>
                  {products.map((product) => (
                    <th key={product.id} className="p-4 text-center min-w-[250px]">
                      <div className="relative">
                        <button
                          onClick={() => removeFromComparison(product.id)}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                          title="Xóa khỏi so sánh"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <Link to={`/products/${product.id}`}>
                          <div className="w-40 h-40 mx-auto mb-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                No image
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-800 hover:text-red-600 transition line-clamp-2">
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
                <tr className="border-b bg-red-50">
                  <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">Giá</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
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
                <tr className="border-b">
                  <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">Đánh giá</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.round(product.averageRating)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                              }`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-gray-500">
                          ({product.reviewCount} đánh giá)
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Stock Status */}
                <tr className="border-b">
                  <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">Tình trạng</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${product.stockQuantity > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* SKU */}
                <tr className="border-b">
                  <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">SKU</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center text-sm text-gray-600">
                      {product.sku || '-'}
                    </td>
                  ))}
                </tr>

                {/* Specifications */}
                {specKeys.length > 0 && (
                  <>
                    <tr className="border-b bg-gray-100">
                      <td colSpan={products.length + 1} className="p-3 text-sm font-bold text-gray-700">
                        Thông số kỹ thuật
                      </td>
                    </tr>
                    {specKeys.map((key) => (
                      <tr key={key} className="border-b">
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
                    <tr className="border-b bg-gray-100">
                      <td colSpan={products.length + 1} className="p-3 text-sm font-bold text-gray-700">
                        Thuộc tính
                      </td>
                    </tr>
                    {attributeNames.map((name) => (
                      <tr key={name} className="border-b">
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
                <tr className="border-b">
                  <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">Bảo hành</td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center text-sm text-gray-600">
                      {product.warrantyInfo || '-'}
                    </td>
                  ))}
                </tr>

                {/* Add to Cart */}
                <tr className="bg-gray-50">
                  <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50"></td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stockQuantity === 0}
                        className="w-full py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <ShoppingCart />
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
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Tóm tắt so sánh</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Best Price */}
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium mb-2">Giá tốt nhất</p>
                {(() => {
                  const cheapest = products.reduce((min, p) =>
                    p.price < min.price ? p : min
                  );
                  return (
                    <div className="flex items-center gap-3">
                      <Check className="text-green-600" />
                      <span className="font-medium text-gray-800">{cheapest.name}</span>
                      <span className="ml-auto text-green-600 font-bold">
                        {formatCurrency(cheapest.price)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Best Rating */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700 font-medium mb-2">Đánh giá cao nhất</p>
                {(() => {
                  const bestRated = products.reduce((max, p) =>
                    p.averageRating > max.averageRating ? p : max
                  );
                  return (
                    <div className="flex items-center gap-3">
                      <Star className="text-yellow-500" />
                      <span className="font-medium text-gray-800">{bestRated.name}</span>
                      <span className="ml-auto text-yellow-600 font-bold flex items-center gap-1">
                        {bestRated.averageRating.toFixed(1)}
                        <Star className="w-3 h-3" />
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Most Popular */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-2">Bán chạy nhất</p>
                {(() => {
                  const mostPopular = products.reduce((max, p) =>
                    p.soldCount > max.soldCount ? p : max
                  );
                  return (
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="text-blue-600" />
                      <span className="font-medium text-gray-800">{mostPopular.name}</span>
                      <span className="ml-auto text-blue-600 font-bold">
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
