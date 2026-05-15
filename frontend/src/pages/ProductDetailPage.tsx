import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogApi, type Product, type ProductReview } from '../api/catalog';
import { salesApi } from '../api/sales';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  ChevronRight, Minus, Plus, ShoppingCart, Check,
  Truck, Shield, HeadphonesIcon, Star, ShoppingBag,
} from 'lucide-react';
import RecommendationCarousel from '../components/recommendation-carousel';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../api/client';
import { WriteReviewModal } from '../components/reviews';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';
import SEO from '../components/SEO';
import { generateProductSchema, generateBreadcrumbSchema } from '../utils/structuredData';
import { formatCurrency } from '../utils/format';
import { ProductDescriptionTab, ProductSpecificationsTab, ProductReviewsTab } from '../components/product-detail';

interface Specification { [key: string]: string; }

export default function ProductDetailPage() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const param = slug || id || '';
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { addToRecentlyViewed } = useRecentlyViewed();

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
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowStickyBar(window.scrollY > 800);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const ratingCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating as keyof typeof counts]++;
    });
    return counts;
  }, [reviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  }, [reviews]);

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const loadProduct = async (productParam: string) => {
    setLoading(true);
    try {
      const data = UUID_REGEX.test(productParam)
        ? await catalogApi.getProduct(productParam)
        : await catalogApi.getProductBySlug(productParam);
      setProduct(data);
    } catch {
      navigate('/products', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedProducts = async (productId: string) => {
    setLoadingRelated(true);
    try {
      const response = await client.get(`/catalog/products/${productId}/related`);
      const valid = Array.isArray(response.data)
        ? response.data.filter((p: any) => p?.id && p?.name && typeof p.price === 'number' && !Number.isNaN(p.price))
        : [];
      setRelatedProducts(valid);
    } catch { /* silent */ } finally { setLoadingRelated(false); }
  };

  const loadReviews = async (productId: string) => {
    setLoadingReviews(true);
    try {
      const response = await client.get(`/catalog/products/${productId}/reviews`);
      setReviews(Array.isArray(response.data) ? response.data : response.data.reviews || []);
    } catch { setReviews([]); } finally { setLoadingReviews(false); }
  };

  const checkPurchaseStatus = async (productId: string) => {
    if (!isAuthenticated) { setHasPurchased(false); return; }
    setCheckingPurchase(true);
    try {
      const result = await salesApi.verifyPurchase(productId);
      setHasPurchased(result.hasPurchased);
    } catch { setHasPurchased(false); } finally { setCheckingPurchase(false); }
  };

  useEffect(() => { if (param) { loadProduct(param); } window.scrollTo(0, 0); }, [param]);
  useEffect(() => {
    if (product?.id) { loadRelatedProducts(product.id); loadReviews(product.id); checkPurchaseStatus(product.id); }
  }, [product?.id, isAuthenticated]);
  useEffect(() => { if (product?.id) addToRecentlyViewed(product.id); }, [product?.id, addToRecentlyViewed]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try { addToCart(product, quantity); setShowAddedNotification(true); setTimeout(() => setShowAddedNotification(false), 3000); }
    catch { /* silent */ } finally { setAddingToCart(false); }
  };
  const handleBuyNow = () => { handleAddToCart(); navigate('/checkout'); };

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      toast('Vui long dang nhap de viet danh gia!', { icon: '🔐', duration: 3000 });
      navigate('/login', { state: { from: `/san-pham/${param}` } });
      return;
    }
    if (!hasPurchased) { toast('Ban can mua san pham nay truoc khi danh gia!', { icon: '🛒', duration: 3000 }); return; }
    setShowReviewModal(true);
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try { await client.post(`/catalog/reviews/${reviewId}/helpful`); } catch { /* silent */ }
  };

  const getDiscountPercentage = () => {
    if (!product || !product.oldPrice || product.oldPrice <= product.price) return null;
    return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  };

  const parseSpecifications = (specString?: string): Specification => {
    if (!specString) return {};
    try {
      const parsed = JSON.parse(specString);
      if (Array.isArray(parsed)) {
        const res: Specification = {};
        parsed.forEach((item: any) => { if (item?.label) res[item.label] = item.value; });
        return res;
      }
      return parsed;
    } catch {
      const specs: Specification = {};
      specString.split('\n').forEach((line) => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) specs[key.trim()] = valueParts.join(':').trim();
      });
      return specs;
    }
  };

  const productImages = useMemo(() => {
    if (!product) return [];
    const images: string[] = [];
    if (product.imageUrl) images.push(product.imageUrl);
    if (product.galleryImages) {
      try { const g = JSON.parse(product.galleryImages); if (Array.isArray(g)) images.push(...g); } catch { /* ignore */ }
    }
    return images;
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent mx-auto" />
          <p className="mt-4 text-gray-600 text-sm">Dang tai...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Khong tim thay san pham</h2>
          <button onClick={() => navigate('/products')} className="bg-accent hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer">
            Quay lai danh sach
          </button>
        </div>
      </div>
    );
  }

  const discount = getDiscountPercentage();
  const specifications = parseSpecifications(product.specifications);
  const tabs = [
    { key: 'description' as const, label: 'Mo ta san pham' },
    { key: 'specifications' as const, label: 'Thong so ky thuat' },
    { key: 'reviews' as const, label: `Danh gia (${reviews.length})` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={product.metaTitle || product.name}
        description={product.metaDescription || product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || `Mua ${product.name} chinh hang gia tot tai Quang Huong Computer`}
        keywords={product.metaKeywords || `${product.name}, mua ${product.name}, ${product.sku}`}
        image={product.imageUrl || '/logo.png'}
        type="product"
        canonicalUrl={product.canonicalUrl || `/san-pham/${product.slug || product.id}`}
        structuredData={[
          generateProductSchema(product),
          generateBreadcrumbSchema([
            { name: 'Trang chu', url: '/' },
            { name: 'San pham', url: '/products' },
            { name: product.name },
          ]),
        ]}
      />

      {/* Added to Cart Notification */}
      <AnimatePresence>
        {showAddedNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50"
          >
            <Check className="w-5 h-5" />
            <span className="font-medium text-sm">Da them vao gio hang!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-accent transition-colors cursor-pointer">Trang chu</button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <button onClick={() => navigate('/products')} className="text-gray-500 hover:text-accent transition-colors cursor-pointer">San pham</button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-900 font-semibold truncate max-w-xs">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-8">
        {/* Product Main: 2-column layout */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* Image Gallery -- 40% on desktop */}
            <div className="lg:col-span-2 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
              <div className="relative aspect-[4/3] bg-white rounded-xl overflow-hidden border border-gray-100">
                {productImages.length > 0 && !imgErrors[productImages[selectedImage]] ? (
                  <img
                    src={productImages[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={() => setImgErrors((prev) => ({ ...prev, [productImages[selectedImage]]: true }))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <span className="text-6xl font-black">{product.name?.charAt(0) || '?'}</span>
                  </div>
                )}
                {discount && (
                  <span className="absolute top-3 left-3 bg-accent text-white px-2.5 py-1 rounded-lg font-bold text-xs">
                    -{discount}%
                  </span>
                )}
              </div>
              {/* Thumbnail Strip */}
              {productImages.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {productImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedImage === index ? 'border-accent ring-1 ring-accent/30' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {!imgErrors[image] ? (
                        <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover"
                          onError={() => setImgErrors((prev) => ({ ...prev, [image]: true }))} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 text-sm font-bold">
                          {product.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info -- 60% on desktop */}
            <div className="lg:col-span-3 p-4 sm:p-6 space-y-5">
              {/* Name + SKU + Rating */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{product.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">SKU: {product.sku}</span>
                  {averageRating > 0 && (
                    <span className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded text-xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-gray-700">{averageRating.toFixed(1)}</span>
                      <span className="text-gray-500">({reviews.length})</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Price Block */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl font-bold text-accent">{formatCurrency(product.price)}</span>
                  {product.oldPrice && product.oldPrice > product.price && (
                    <>
                      <span className="text-gray-400 line-through text-sm">{formatCurrency(product.oldPrice)}</span>
                      {discount && (
                        <span className="bg-red-50 text-accent border border-red-100 px-2 py-0.5 rounded text-xs font-semibold">
                          -{discount}%
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Gia da bao gom VAT</p>
              </div>

              {/* Stock Status */}
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
                product.stockQuantity > 10
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : product.stockQuantity > 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {product.stockQuantity > 10 && <Check className="w-4 h-4" />}
                <span>
                  {product.stockQuantity > 10 ? 'Con hang' :
                    product.stockQuantity > 0 ? `Chi con ${product.stockQuantity} san pham` : 'Het hang'}
                </span>
              </div>

              {/* Quantity + Add to Cart Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center rounded-xl border border-gray-200 bg-white">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40 cursor-pointer rounded-l-xl">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input type="number" value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stockQuantity, Number(e.target.value))))}
                    className="w-14 h-10 text-center border-x border-gray-200 focus:outline-none font-bold text-gray-900 text-sm" min="1" max={product.stockQuantity} />
                  <button onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))} disabled={quantity >= product.stockQuantity}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40 cursor-pointer rounded-r-xl">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-gray-500 text-xs">{product.stockQuantity} san pham co san</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleBuyNow} disabled={product.stockQuantity === 0}
                  className="flex-[2] bg-accent hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                  <ShoppingBag className="w-5 h-5" /> MUA NGAY
                </button>
                <button onClick={handleAddToCart} disabled={product.stockQuantity === 0 || addingToCart}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 hover:border-accent hover:text-accent transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold cursor-pointer">
                  <ShoppingCart className="w-5 h-5" />
                  {addingToCart ? 'Dang them...' : 'Them vao gio'}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                {[
                  { icon: Truck, title: 'Mien phi van chuyen', sub: 'Don hang > 5tr' },
                  { icon: Shield, title: 'Bao hanh chinh hang', sub: product.warrantyInfo || '12 thang' },
                  { icon: HeadphonesIcon, title: 'Ho tro 24/7', sub: '0904.235.090' },
                ].map(({ icon: Icon, title, sub }) => (
                  <div key={title} className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Icon className="w-5 h-5 text-gray-400 mb-1.5" />
                    <span className="text-xs font-semibold text-gray-900 leading-tight">{title}</span>
                    <span className="text-[11px] text-gray-500 mt-0.5">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 md:flex-none px-6 py-4 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.key ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6 sm:p-8 bg-gray-50/30">
            {activeTab === 'description' && <ProductDescriptionTab description={product.description} />}
            {activeTab === 'specifications' && <ProductSpecificationsTab specifications={specifications} />}
            {activeTab === 'reviews' && (
              <ProductReviewsTab
                reviews={reviews} loadingReviews={loadingReviews} averageRating={averageRating}
                ratingCounts={ratingCounts} hasPurchased={hasPurchased} checkingPurchase={checkingPurchase}
                isAuthenticated={isAuthenticated} onWriteReview={handleWriteReview} onMarkHelpful={handleMarkHelpful}
              />
            )}
          </div>
        </div>

        {/* AI Recommendations */}
        {product.id && <RecommendationCarousel productId={product.id} title="San pham goi y cho ban" />}

        {/* Related Products */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">San pham lien quan</h2>
            <button onClick={() => navigate(product.categoryId ? `/products?category=${product.categoryId}` : '/products')}
              className="text-accent text-sm font-semibold hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer">
              Xem tat ca <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {loadingRelated ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <div key={p.id} onClick={() => navigate(`/san-pham/${p.slug || p.id}`)}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden">
                  <div className="aspect-[4/3] bg-white p-4 flex items-center justify-center relative overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-gray-300 text-4xl font-black">{p.name?.charAt(0) || '?'}</span>
                    )}
                    {p.oldPrice && p.oldPrice > p.price && (
                      <span className="absolute top-2 left-2 bg-red-50 text-accent border border-red-100 text-xs font-bold px-2 py-0.5 rounded">
                        -{Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-50 space-y-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm group-hover:text-accent transition-colors leading-snug min-h-[2.5rem]">
                      {p.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-accent font-bold">{formatCurrency(p.price)}</span>
                      {p.oldPrice && p.oldPrice > p.price && (
                        <span className="text-gray-400 line-through text-xs">{formatCurrency(p.oldPrice)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">Khong tim thay san pham lien quan</p>
            </div>
          )}
        </section>

        {/* Recently Viewed */}
        <RecentlyViewedProducts currentProductId={product.id} title="Ban da xem gan day" />
      </div>

      {/* Write Review Modal */}
      {product && (
        <WriteReviewModal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)}
          productId={product.id} productName={product.name}
          onReviewSubmitted={() => { if (product.id) loadReviews(product.id); }} />
      )}

      {/* Sticky Bottom Bar */}
      <AnimatePresence>
        {showStickyBar && product && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gray-50 rounded-lg p-0.5 flex-shrink-0">
                  {productImages[0] && <img src={productImages[0]} alt="" className="w-full h-full object-contain" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                  <span className="text-accent font-bold text-sm">{formatCurrency(product.price)}</span>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={handleBuyNow} disabled={product.stockQuantity === 0}
                  className="flex-1 md:flex-none bg-accent hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap">
                  MUA NGAY
                </button>
                <button onClick={handleAddToCart} disabled={product.stockQuantity === 0 || addingToCart}
                  className="flex-1 md:flex-none border-2 border-accent text-accent px-6 py-3 rounded-xl hover:bg-red-50 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">{addingToCart ? 'Dang them...' : 'Them vao gio'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
