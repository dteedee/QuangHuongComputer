import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogApi, type Product, type ProductReview } from '../api/catalog';
import { salesApi } from '../api/sales';
import { aiApi, type AiRecommendation } from '../api/ai';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, Minus, Plus, ShoppingCart, Check, Truck, Shield, HeadphonesIcon, Star, Filter, ShoppingBag, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../api/client';
import { WriteReviewModal, RatingBreakdown, ReviewItem } from '../components/reviews';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';
import SEO from '../components/SEO';
import { generateProductSchema, generateBreadcrumbSchema } from '../utils/structuredData';

interface Specification {
  [key: string]: string;
}


type ReviewSortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [addingToCart, setAddingToCart] = useState(false);
  const [showAddedNotification, setShowAddedNotification] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AiRecommendation[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('newest');
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const { addToRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 800);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate rating breakdown from reviews
  const ratingCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        counts[review.rating as keyof typeof counts]++;
      }
    });
    return counts;
  }, [reviews]);

  // Calculate average rating from reviews
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  // Sort reviews based on selected option
  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];
    switch (reviewSort) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'highest':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sorted.sort((a, b) => a.rating - b.rating);
      case 'helpful':
        return sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
      default:
        return sorted;
    }
  }, [reviews, reviewSort]);

  // Check if user has purchased this product
  const checkPurchaseStatus = async (productId: string) => {
    if (!isAuthenticated) {
      setHasPurchased(false);
      return;
    }

    setCheckingPurchase(true);
    try {
      const result = await salesApi.verifyPurchase(productId);
      setHasPurchased(result.hasPurchased);
    } catch (error) {
      console.error('Failed to check purchase status:', error);
      setHasPurchased(false);
    } finally {
      setCheckingPurchase(false);
    }
  };

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      toast('Vui lòng đăng nhập để viết đánh giá!', {
        icon: '🔐',
        duration: 3000
      });
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }

    if (!hasPurchased) {
      toast('Bạn cần mua sản phẩm này trước khi đánh giá!', {
        icon: '🛒',
        duration: 3000
      });
      return;
    }

    setShowReviewModal(true);
  };

  const handleReviewSubmitted = () => {
    // Reload reviews after submitting
    if (id) {
      loadReviews(id);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await client.post(`/catalog/reviews/${reviewId}/helpful`);
    } catch (error) {
      console.error('Failed to mark review as helpful:', error);
    }
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
      loadAiRecommendations(id);
      loadReviews(id);
      checkPurchaseStatus(id);
    }
    window.scrollTo(0, 0);
  }, [id, isAuthenticated]);

  // Track recently viewed products
  useEffect(() => {
    if (product && id) {
      addToRecentlyViewed(id);
    }
  }, [product, id, addToRecentlyViewed]);

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

  const loadAiRecommendations = async (productId: string) => {
    setLoadingAi(true);
    try {
      const { recommendations } = await aiApi.getRecommendations(productId);
      setAiRecommendations(recommendations);
    } catch (error) {
      console.error('Failed to load AI recommendations:', error);
    } finally {
      setLoadingAi(false);
    }
  };

  const loadReviews = async (productId: string) => {
    setLoadingReviews(true);
    try {
      const response = await client.get(`/catalog/products/${productId}/reviews`);
      // Handle both array response and paginated response
      const reviewsData = Array.isArray(response.data) ? response.data : response.data.reviews || [];
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
    try {
      // Pass quantity directly instead of calling in loop
      addToCart(product, quantity);
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

  const productImages = useMemo(() => {
    if (!product) return [];
    const images: string[] = [];
    if (product.imageUrl) images.push(product.imageUrl);
    if (product.galleryImages) {
      try {
        const gallery = JSON.parse(product.galleryImages);
        if (Array.isArray(gallery)) {
          images.push(...gallery);
        }
      } catch (e) {
        // ignore
      }
    }
    return images;
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent mx-auto"></div>
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
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover"
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
      {/* SEO with Product JSON-LD */}
      <SEO
        title={product.metaTitle || product.name}
        description={product.metaDescription || product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || `Mua ${product.name} chính hãng giá tốt tại Quang Hưởng Computer`}
        keywords={product.metaKeywords || `${product.name}, mua ${product.name}, ${product.sku}`}
        image={product.imageUrl || '/logo.png'}
        type="product"
        canonicalUrl={product.canonicalUrl}
        structuredData={[
          generateProductSchema(product),
          generateBreadcrumbSchema([
            { name: 'Trang chủ', url: '/' },
            { name: 'Sản phẩm', url: '/products' },
            { name: product.name },
          ]),
        ]}
      />
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
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-accent font-medium">
              Trang chủ
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button onClick={() => navigate('/products')} className="text-gray-500 hover:text-accent font-medium">
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
                {productImages.length > 0 && !imgErrors[productImages[selectedImage]] ? (
                  <img
                    src={productImages[selectedImage]}
                    alt={product?.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                    onError={() => setImgErrors(prev => ({ ...prev, [productImages[selectedImage]]: true }))}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                    <span className="text-6xl font-black mb-4">{product?.name?.charAt(0) || '?'}</span>
                  </div>
                )}
                {discount && (
                  <div className="absolute top-4 left-4 bg-accent text-white px-3 py-1 rounded-full font-bold text-xs shadow-lg shadow-red-500/30">
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
                    className={`aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-accent ring-1 ring-accent' : 'border-transparent hover:border-accent/50'
                      }`}
                  >
                    {!imgErrors[image] ? (
                      <img 
                        src={image} 
                        alt={`${product.name} ${index + 1}`} 
                        className="w-full h-full object-cover mix-blend-multiply" 
                        onError={() => setImgErrors(prev => ({ ...prev, [image]: true }))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <span className="text-3xl font-black">{product?.name?.charAt(0) || '?'}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 tracking-tight leading-tight">{product.name}</h1>
                <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                  <span className="bg-gray-100 px-2.5 py-1 rounded text-gray-700">Mã SP: {product.sku}</span>
                  {averageRating > 0 && (
                     <span className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2.5 py-1 rounded">
                       <Star className="w-4 h-4 fill-current" />
                       <span className="font-bold text-gray-700">{averageRating.toFixed(1)}</span>
                       <span className="text-gray-500 font-normal">({reviews.length} đánh giá)</span>
                     </span>
                  )}
                </p>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex items-end gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-accent tracking-tight leading-none">{formatPrice(product.price)}</span>
                  {product.oldPrice && (
                    <>
                      <span className="text-base text-gray-400 line-through font-medium mb-1">
                        {formatPrice(product.oldPrice)}
                      </span>
                      {discount && (
                        <span className="bg-red-50 border border-red-100 text-accent px-2 py-0.5 rounded text-xs font-semibold mb-1">
                          -{discount}%
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Giá đã bao gồm VAT</p>
              </div>

              {/* Stock Status Box */}
              <div>
                <p className="block text-xs font-bold text-gray-700 uppercase mb-2 tracking-wide">Trạng thái kho</p>
                <div className={`flex flex-col gap-2 px-5 py-4 rounded-xl border ${product.stockQuantity > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  product.stockQuantity > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-100'
                  }`}>
                  <div className="flex items-center gap-2">
                    {product.stockQuantity > 10 && <Check className="w-5 h-5 text-emerald-600" />}
                    <span className="font-bold text-sm">
                      {product.stockQuantity > 10 ? 'Còn hàng (Sẵn sàng giao ngay)' :
                        product.stockQuantity > 0 ? `Chỉ còn ${product.stockQuantity} sản phẩm` :
                          'Hết hàng'}
                    </span>
                  </div>
                  {/* Progress Meter for low stock */}
                  {(product.stockQuantity > 0 && product.stockQuantity <= 10) && (
                    <div className="w-full bg-amber-200/50 rounded-full h-1.5 mt-1 overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(product.stockQuantity / 10) * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="bg-gradient-to-r from-amber-400 to-amber-500 h-1.5 rounded-full"
                      />
                    </div>
                  )}
                </div>
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
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button
                    onClick={handleBuyNow}
                    disabled={product.stockQuantity === 0}
                    className="flex-[2] py-4 bg-gradient-to-r from-accent to-[#b91c1c] text-white rounded-xl hover:shadow-lg hover:shadow-red-500/30 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all uppercase tracking-widest font-black text-sm flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    <ShoppingBag className="w-5 h-5 transition-transform group-hover:-translate-y-1" />
                    Mua Ngay
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stockQuantity === 0 || addingToCart}
                    className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 hover:border-accent hover:text-accent disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-all uppercase tracking-widest font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}
                  </button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-gray-100">
                <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Truck className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-xs font-semibold text-gray-900 leading-tight">Miễn phí vận chuyển</span>
                  <span className="text-xs text-gray-500 mt-1">Đơn hàng &gt; 5tr</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Shield className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-xs font-semibold text-gray-900 leading-tight">Bảo hành chính hãng</span>
                  <span className="text-xs text-gray-500 mt-1">{product.warrantyInfo || '12 tháng'}</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <HeadphonesIcon className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-xs font-semibold text-gray-900 leading-tight">Hỗ trợ 24/7</span>
                  <span className="text-xs text-gray-500 mt-1">0904.235.090</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="border-t border-gray-100">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('description')}
                className={`flex-1 md:flex-none px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'description'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Mô tả sản phẩm
              </button>
              <button
                onClick={() => setActiveTab('specifications')}
                className={`flex-1 md:flex-none px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'specifications'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Thông số kỹ thuật
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 md:flex-none px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'reviews'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Đánh giá
              </button>
            </div>

            <div className="p-8 bg-gray-50/30">
              {activeTab === 'description' && (
                <div className="prose max-w-none text-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Giới thiệu sản phẩm</h3>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="max-w-3xl">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Thông số kỹ thuật</h3>
                  {Object.keys(specifications).length > 0 ? (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                      {Object.entries(specifications).map(([key, value], index) => (
                        <div key={key} className={`grid grid-cols-3 gap-4 py-3.5 px-5 ${index % 2 === 0 ? 'bg-gray-50/80' : 'bg-white'}`}>
                          <div className="text-gray-600 font-medium text-sm">{key}</div>
                          <div className="col-span-2 text-gray-900 font-semibold text-sm">{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic bg-white p-6 rounded-2xl border border-gray-100">Chưa có thông số kỹ thuật</p>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Đánh giá từ khách hàng ({reviews.length})
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Show different UI based on purchase status */}
                      {checkingPurchase ? (
                        <div className="text-gray-500 text-sm">
                          Đang kiểm tra...
                        </div>
                      ) : hasPurchased ? (
                        <button
                          onClick={handleWriteReview}
                          className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-accent-hover transition-colors"
                        >
                          Viết đánh giá
                        </button>
                      ) : isAuthenticated ? (
                        <div className="flex items-center gap-2">
                          <button
                            disabled
                            className="px-5 py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm font-semibold cursor-not-allowed"
                          >
                            Viết đánh giá
                          </button>
                          <span className="text-xs text-gray-500 hidden sm:flex items-center gap-1">
                            Mua để đánh giá
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={handleWriteReview}
                          className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-accent-hover transition-colors"
                        >
                          Đăng nhập để đánh giá
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rating Breakdown */}
                  {reviews.length > 0 && (
                    <RatingBreakdown
                      averageRating={averageRating}
                      totalReviews={reviews.length}
                      ratingCounts={ratingCounts}
                    />
                  )}

                  {/* Sort Options */}
                  {reviews.length > 1 && (
                    <div className="flex items-center gap-3 pt-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Sắp xếp:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'newest', label: 'Mới nhất' },
                          { value: 'oldest', label: 'Cũ nhất' },
                          { value: 'highest', label: 'Cao nhất' },
                          { value: 'lowest', label: 'Thấp nhất' },
                          { value: 'helpful', label: 'Hữu ích' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setReviewSort(option.value as ReviewSortOption)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              reviewSort === option.value
                                ? 'bg-accent text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reviews List */}
                  {loadingReviews ? (
                    <div className="py-10 text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mx-auto"></div>
                      <p className="mt-4 text-gray-500 font-medium">Đang tải đánh giá...</p>
                    </div>
                  ) : sortedReviews.length > 0 ? (
                    <div className="space-y-4">
                      {sortedReviews.map((review) => (
                        <ReviewItem
                          key={review.id}
                          review={review}
                          onMarkHelpful={handleMarkHelpful}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white text-gray-300 mb-4 shadow-sm">
                        <Star size={32} />
                      </div>
                      <h4 className="text-gray-900 font-bold mb-2">Chưa có đánh giá nào</h4>
                      {hasPurchased ? (
                        <>
                          <p className="text-gray-500 text-sm mb-4">Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm này!</p>
                          <button
                            onClick={handleWriteReview}
                            className="px-6 py-2.5 bg-accent text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all hover:bg-accent-hover"
                          >
                            Viết đánh giá đầu tiên
                          </button>
                        </>
                      ) : isAuthenticated ? (
                        <p className="text-gray-500 text-sm">
                          Mua sản phẩm này để trở thành người đầu tiên đánh giá!
                        </p>
                      ) : (
                        <>
                          <p className="text-gray-500 text-sm mb-4">Đăng nhập và mua sản phẩm để đánh giá!</p>
                          <button
                            onClick={handleWriteReview}
                            className="px-6 py-2.5 bg-accent text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all hover:bg-accent-hover"
                          >
                            Đăng nhập ngay
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        {aiRecommendations.length > 0 && !loadingAi && (
          <div className="mt-12 mb-8 bg-gradient-to-r from-red-50 to-white p-6 sm:p-8 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6 text-accent">
                <Sparkles className="w-6 h-6" />
                <h2 className="text-xl font-bold tracking-tight">Thường được mua kèm</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {aiRecommendations.map((rec) => (
                  <div key={rec.id} className="bg-white p-4 rounded-2xl border border-red-50 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center p-2">
                      {rec?.imageUrl ? (
                        <img src={rec.imageUrl} alt={rec?.name} className="w-full h-full object-contain mix-blend-multiply" />
                      ) : (
                        <span className="text-2xl font-black text-gray-300 uppercase">{rec?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1 leading-tight">{rec.name}</h3>
                      <div className="text-accent font-bold text-sm">{formatPrice(rec.price)}</div>
                      <div className="text-[10px] text-gray-500 mt-1 uppercase font-semibold tracking-wider">Độ tương thích {Math.round(rec.similarityScore * 100)}%</div>
                    </div>
                    <button onClick={() => navigate(`/product/${rec.id}`)} className="w-8 h-8 rounded-full bg-red-50 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {/* Decorative blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          </div>
        )}

        {/* Related Products */}
        <div className="mt-12 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sản phẩm liên quan</h2>
            <button
              onClick={handleViewAllRelated}
              className="text-accent text-sm font-semibold hover:text-accent-hover transition-colors flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loadingRelated ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[4/5] bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer"
                >
                  <div className="aspect-square bg-white p-6 flex items-center justify-center relative overflow-hidden">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl font-black uppercase">
                        {p?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    {p.oldPrice && p.oldPrice > p.price && (
                      <div className="absolute top-3 left-3 bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-2 py-0.5 rounded-md">
                        -{Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1.5 border-t border-gray-50">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm h-10 group-hover:text-accent transition-colors leading-snug">
                      {p.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-accent font-bold text-base">{formatPrice(p.price)}</span>
                      {p.oldPrice && p.oldPrice > p.price && (
                        <span className="text-gray-400 line-through text-xs font-medium">
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
              <p className="text-gray-500 text-sm font-medium">Không tìm thấy sản phẩm liên quan</p>
            </div>
          )}
        </div>

        {/* Recently Viewed Products */}
        <div className="mt-8">
          <RecentlyViewedProducts currentProductId={id} title="Bạn đã xem gần đây" />
        </div>
      </div>

      {/* Write Review Modal */}
      {product && (
        <WriteReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          productId={product.id}
          productName={product.name}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Sticky Bottom Actions */}
      <AnimatePresence>
        {showStickyBar && product && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-6 pt-4 px-4 sm:pb-4"
          >
            <div className="container mx-auto max-w-5xl flex items-center justify-between gap-4">
              <div className="hidden md:flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-gray-50 rounded-lg p-1">
                    {productImages[0] && (
                        <img src={productImages[0]} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                    )}
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                   <div className="text-accent font-bold">{formatPrice(product.price)}</div>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={handleBuyNow}
                    disabled={product.stockQuantity === 0}
                    className="flex-1 md:flex-none px-6 py-3.5 bg-accent text-white rounded-xl hover:bg-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-bold text-sm shadow-sm whitespace-nowrap active:scale-95"
                  >
                    MUA NGAY
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stockQuantity === 0 || addingToCart}
                    className="flex-1 md:flex-none px-6 py-3.5 bg-white border-2 border-accent text-accent rounded-xl hover:bg-red-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-transparent disabled:cursor-not-allowed transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-sm whitespace-nowrap active:scale-95"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="hidden sm:inline">{addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}</span>
                  </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
