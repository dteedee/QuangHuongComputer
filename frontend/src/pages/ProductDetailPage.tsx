import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogApi, type Product } from '../api/catalog';
import { useCart } from '../context/CartContext';
import { ChevronRight, Minus, Plus, ShoppingCart, Check, Truck, Shield, HeadphonesIcon } from 'lucide-react';

interface Specification {
  [key: string]: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [addingToCart, setAddingToCart] = useState(false);
  const [showAddedNotification, setShowAddedNotification] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
    window.scrollTo(0, 0);
  }, [id]);

  const loadProduct = async (productId: string) => {
    setLoading(true);
    try {
      const data = await catalogApi.getProduct(productId);
      setProduct(data);
    } catch (error) {
      console.error('Failed to load product:', error);
      navigate('/products', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
    try {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      setShowAddedNotification(true);
      setTimeout(() => setShowAddedNotification(false), 3000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getDiscountPercentage = () => {
    if (!product) return null;
    if (product.oldPrice && product.oldPrice > product.price) {
      return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
    }
    return null;
  };

  const parseSpecifications = (specString?: string): Specification => {
    if (!specString) return {};

    try {
      const parsed = JSON.parse(specString);
      if (Array.isArray(parsed)) {
        const res: Specification = {};
        parsed.forEach((item: any) => {
          if (item && item.label) res[item.label] = item.value;
        });
        return res;
      }
      return parsed;
    } catch {
      // If not JSON, try parsing line-by-line
      const specs: Specification = {};
      const lines = specString.split('\n');
      lines.forEach((line) => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          specs[key.trim()] = valueParts.join(':').trim();
        }
      });
      return specs;
    }
  };

  const productImages = [
    `https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&h=600&fit=crop`,
    `https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&h=600&fit=crop`,
    `https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&h=600&fit=crop`,
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Không tìm thấy sản phẩm</h2>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const discount = getDiscountPercentage();
  const specifications = parseSpecifications(product.specifications);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Added to Cart Notification */}
      {showAddedNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in">
          <Check className="w-5 h-5" />
          <span>Đã thêm vào giỏ hàng!</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-700">
              Trang chủ
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button onClick={() => navigate('/products')} className="text-blue-600 hover:text-blue-700">
              Sản phẩm
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
                {discount && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-semibold">
                    -{discount}%
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              <div className="grid grid-cols-4 gap-3">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
                      }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <p className="text-lg text-gray-600">{product.sku}</p>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-blue-600">{formatPrice(product.price)}</span>
                  {product.oldPrice && (
                    <>
                      <span className="text-xl text-gray-400 line-through">
                        {formatPrice(product.oldPrice)}
                      </span>
                      {discount && (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-medium">
                          Tiết kiệm {formatPrice(product.oldPrice - product.price)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Stock Status */}
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${product.stockQuantity > 10 ? 'bg-green-50 text-green-700' :
                product.stockQuantity > 0 ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                {product.stockQuantity > 10 && <Check className="w-5 h-5" />}
                <span className="font-medium">
                  {product.stockQuantity > 10 ? 'Còn hàng' :
                    product.stockQuantity > 0 ? `Chỉ còn ${product.stockQuantity} sản phẩm` :
                      'Hết hàng'}
                </span>
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stockQuantity, Number(e.target.value))))}
                    className="w-20 h-12 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max={product.stockQuantity}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    className="w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity >= product.stockQuantity}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <span className="text-gray-600 text-sm ml-2">
                    {product.stockQuantity} sản phẩm có sẵn
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stockQuantity === 0 || addingToCart}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stockQuantity === 0}
                  className="flex-1 px-6 py-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Mua ngay
                </button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex flex-col items-center text-center p-3">
                  <Truck className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium">Giao hàng miễn phí</span>
                  <span className="text-xs text-gray-500">Đơn từ 5 triệu</span>
                </div>
                <div className="flex flex-col items-center text-center p-3">
                  <Shield className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium">Bảo hành</span>
                  <span className="text-xs text-gray-500">{product.warrantyInfo || '12 tháng'}</span>
                </div>
                <div className="flex flex-col items-center text-center p-3">
                  <HeadphonesIcon className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium">Hỗ trợ 24/7</span>
                  <span className="text-xs text-gray-500">Hotline: 1900 xxxx</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="border-t">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('description')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${activeTab === 'description'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                Mô tả sản phẩm
              </button>
              <button
                onClick={() => setActiveTab('specifications')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${activeTab === 'specifications'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                Thông số kỹ thuật
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                Đánh giá
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  <h3 className="text-xl font-semibold mb-4">Giới thiệu sản phẩm</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="max-w-2xl">
                  <h3 className="text-xl font-semibold mb-4">Thông số kỹ thuật</h3>
                  {Object.keys(specifications).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(specifications).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-3 gap-4 py-3 border-b">
                          <div className="text-gray-600 font-medium">{key}</div>
                          <div className="col-span-2 text-gray-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Chưa có thông số kỹ thuật</p>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Đánh giá từ khách hàng</h3>
                  <p className="text-gray-500">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
              >
                <img
                  src={`https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&h=300&fit=crop`}
                  alt="Related product"
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    Sản phẩm liên quan {i}
                  </h3>
                  <p className="text-blue-600 font-bold">
                    {formatPrice(product.price * (0.8 + Math.random() * 0.4))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
