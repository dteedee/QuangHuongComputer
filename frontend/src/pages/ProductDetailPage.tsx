import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogApi, type Product } from '../api/catalog';
import { useCart } from '../context/CartContext';
import { ChevronRight, Minus, Plus, ShoppingCart, Check, Truck, Shield, HeadphonesIcon, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';

interface Specification {
  [key: string]: string;
}

interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
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
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const handleWriteReview = () => {
    // Navigate to a review page or open a modal
    toast('Chức năng đánh giá sản phẩm đã sẵn sàng! Bạn có thể viết đánh giá bên dưới.', {
      icon: '✍️',
      duration: 3000
    });
    setActiveTab('reviews');
  };

  const handleViewAllRelated = () => {
    if (product?.categoryId) {
      navigate(`/products?category=${product.categoryId}`);
    } else {
      navigate('/products');
    }
  };

  useEffect(() => {
    if (id) {
      loadProduct(id);
      loadRelatedProducts(id);
      loadReviews(id);
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

  const loadRelatedProducts = async (productId: string) => {
    setLoadingRelated(true);
    try {
      const response = await client.get(`/catalog/products/${productId}/related`);
      setRelatedProducts(response.data);
    } catch (error) {
      console.error('Failed to load related products:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const loadReviews = async (productId: string) => {
    setLoadingReviews(true);
    try {
      const response = await client.get(`/catalog/products/${productId}/reviews`);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoadingReviews(false);
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#D70018] mx-auto"></div>
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
            className="px-6 py-3 bg-[#D70018] text-white rounded-lg hover:bg-[#b50014]"
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
    <div className="min-h-screen bg-gray-50 font-sans">
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
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-[#D70018] font-medium">
              Trang chủ
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button onClick={() => navigate('/products')} className="text-gray-500 hover:text-[#D70018] font-medium">
              Sản phẩm
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-bold">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply"
                />
                {discount && (
                  <div className="absolute top-4 left-4 bg-[#D70018] text-white px-3 py-1 rounded-full font-bold text-xs shadow-lg shadow-red-500/30">
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
                    className={`aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-[#D70018] ring-1 ring-[#D70018]' : 'border-transparent hover:border-[#D70018]/50'
                      }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover mix-blend-multiply" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">{product.name}</h1>
                <p className="text-lg text-gray-500 font-medium">Mã SP: <span className="text-gray-900">{product.sku}</span></p>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-[#D70018] tracking-tight">{formatPrice(product.price)}</span>
                  {product.oldPrice && (
                    <>
                      <span className="text-lg text-gray-400 line-through font-medium">
                        {formatPrice(product.oldPrice)}
                      </span>
                      {discount && (
                        <span className="bg-red-100 text-[#D70018] px-2 py-1 rounded-lg text-xs font-bold uppercase">
                          Tiết kiệm {formatPrice(product.oldPrice - product.price)}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">Giá đã bao gồm VAT</p>
              </div>

              {/* Stock Status */}
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${product.stockQuantity > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                product.stockQuantity > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-red-50 text-red-700 border-red-100'
                }`}>
                {product.stockQuantity > 10 && <Check className="w-5 h-5" />}
                <span className="font-bold text-sm">
                  {product.stockQuantity > 10 ? 'Còn hàng (Sẵn sàng giao ngay)' :
                    product.stockQuantity > 0 ? `Chỉ còn ${product.stockQuantity} sản phẩm` :
                      'Hết hàng'}
                </span>
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2 tracking-wide">Số lượng</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(product.stockQuantity, Number(e.target.value))))}
                      className="w-16 h-12 text-center border-x border-gray-200 focus:outline-none font-bold text-gray-900"
                      min="1"
                      max={product.stockQuantity}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
                      disabled={quantity >= product.stockQuantity}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-gray-500 text-xs font-medium">
                    {product.stockQuantity} sản phẩm có sẵn
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleBuyNow}
                  disabled={product.stockQuantity === 0}
                  className="px-6 py-4 bg-[#D70018] text-white rounded-xl hover:bg-[#b50014] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-black uppercase text-sm shadow-lg shadow-red-500/20 active:scale-95"
                >
                  Mua ngay
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stockQuantity === 0 || addingToCart}
                  className="px-6 py-4 bg-white border-2 border-[#D70018] text-[#D70018] rounded-xl hover:bg-red-50 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all font-bold uppercase text-sm flex items-center justify-center gap-2 active:scale-95 group"
                >
                  <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}
                </button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                  <Truck className="w-6 h-6 text-[#D70018] mb-2" />
                  <span className="text-xs font-bold uppercase">Miễn phí vẫn chuyển</span>
                  <span className="text-[10px] text-gray-500 mt-1">Đơn hàng > 5tr</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                  <Shield className="w-6 h-6 text-[#D70018] mb-2" />
                  <span className="text-xs font-bold uppercase">Bảo hành chính hãng</span>
                  <span className="text-[10px] text-gray-500 mt-1">{product.warrantyInfo || '12 tháng'}</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                  <HeadphonesIcon className="w-6 h-6 text-[#D70018] mb-2" />
                  <span className="text-xs font-bold uppercase">Hỗ trợ 24/7</span>
                  <span className="text-[10px] text-gray-500 mt-1">1900.6321</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="border-t border-gray-100">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('description')}
                className={`px-8 py-4 font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'description'
                  ? 'border-[#D70018] text-[#D70018] bg-red-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Mô tả sản phẩm
              </button>
              <button
                onClick={() => setActiveTab('specifications')}
                className={`px-8 py-4 font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'specifications'
                  ? 'border-[#D70018] text-[#D70018] bg-red-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Thông số kỹ thuật
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-8 py-4 font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'reviews'
                  ? 'border-[#D70018] text-[#D70018] bg-red-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Đánh giá
              </button>
            </div>

            <div className="p-8 bg-gray-50/30">
              {activeTab === 'description' && (
                <div className="prose max-w-none text-gray-600">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">Giới thiệu sản phẩm</h3>
                  <p className="leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="max-w-3xl">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase">Thông số kỹ thuật</h3>
                  {Object.keys(specifications).length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {Object.entries(specifications).map(([key, value], index) => (
                        <div key={key} className={`grid grid-cols-3 gap-4 py-3 px-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <div className="text-gray-500 font-semibold text-sm">{key}</div>
                          <div className="col-span-2 text-gray-900 font-medium text-sm">{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có thông số kỹ thuật</p>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 uppercase">Đánh giá từ khách hàng ({reviews.length})</h3>
                      <div className="flex items-center gap-1 mt-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill={i <= 4.5 ? "currentColor" : "none"} />)}
                        <span className="text-gray-500 text-sm font-bold ml-2">4.5 / 5.0</span>
                      </div>
                    </div>
                    <button
                      onClick={handleWriteReview}
                      className="px-6 py-2.5 bg-[#D70018] text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                    >
                      Viết đánh giá
                    </button>
                  </div>

                  {loadingReviews ? (
                    <div className="py-10 text-center text-gray-500 font-medium">Đang tải đánh giá...</div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-black text-gray-900 text-sm uppercase italic">Khách hàng ẩn danh</span>
                                {review.isVerifiedPurchase && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                                    <Check size={10} /> Đã mua hàng
                                  </span>
                                )}
                              </div>
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} fill={i <= review.rating ? "currentColor" : "none"} />)}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          {review.title && <h4 className="font-black text-gray-900 text-sm mb-2 uppercase">{review.title}</h4>}
                          <p className="text-gray-600 text-sm font-medium leading-relaxed">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-300 mb-4">
                        <Star size={32} />
                      </div>
                      <p className="text-gray-500 font-medium italic text-sm">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-12 mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6 border-l-4 border-[#D70018] pl-4">
            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">Sản phẩm liên quan</h2>
            <button
              onClick={handleViewAllRelated}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-[10px] uppercase rounded-lg transition-all"
            >
              Xem tất cả
            </button>
          </div>

          {loadingRelated ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[4/5] bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden group cursor-pointer"
                >
                  <div className="aspect-square bg-gray-50 p-4 flex items-center justify-center relative overflow-hidden">
                    <img
                      src={p.imageUrl || `https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&h=300&fit=crop`}
                      alt={p.name}
                      className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                    />
                    {p.oldPrice && p.oldPrice > p.price && (
                      <div className="absolute top-3 left-3 bg-[#D70018] text-white text-[10px] font-black px-2 py-1 rounded-full uppercase shadow-lg shadow-red-500/30">
                        -{Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-gray-900 line-clamp-2 text-xs h-8 group-hover:text-[#D70018] transition-colors leading-tight uppercase">
                      {p.name}
                    </h3>
                    <div className="flex flex-col">
                      <span className="text-[#D70018] font-black text-base">{formatPrice(p.price)}</span>
                      {p.oldPrice && (
                        <span className="text-gray-400 line-through text-[10px] font-bold">
                          {formatPrice(p.oldPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm italic font-medium">Không tìm thấy sản phẩm liên quan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
