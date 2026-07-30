import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Check, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { catalogApi, type Product, type ProductReview, type ProductVariant, type ProductMedia, type ProductDetailBundle, type SpecificationGroup, type ProductSpecificationValue, type StockByBranch } from '../api/catalog';
import { salesApi } from '../api/sales';
import client from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { formatCurrency } from '../utils/format';
import { generateProductSchema, generateBreadcrumbSchema } from '../utils/structuredData';

import SEO from '../components/SEO';
import { WriteReviewModal } from '../components/reviews';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';
import RecommendationCarousel from '../components/recommendation-carousel';
import {
    ProductMediaGallery,
    ProductDetailInfo,
    ProductDetailTabs,
    type ProductDetailTabKey,
} from '../components/product-detail';

interface LegacySpecs { [key: string]: string; }

/** Parse legacy JSON string specifications to key→value map. */
function parseLegacySpecifications(specString?: string): LegacySpecs {
    if (!specString) return {};
    try {
        const parsed = JSON.parse(specString);
        if (Array.isArray(parsed)) {
            const res: LegacySpecs = {};
            parsed.forEach((item: { label?: string; value?: string }) => {
                if (item?.label) res[item.label] = item.value ?? '';
            });
            return res;
        }
        if (parsed && typeof parsed === 'object') {
            const res: LegacySpecs = {};
            Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
                res[k] = String(v);
            });
            return res;
        }
        return {};
    } catch {
        const specs: LegacySpecs = {};
        specString.split('\n').forEach((line) => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) specs[key.trim()] = valueParts.join(':').trim();
        });
        return specs;
    }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProductDetailPage() {
    const { slug, id } = useParams<{ slug?: string; id?: string }>();
    const param = slug || id || '';
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { isAuthenticated } = useAuth();
    const { addToRecentlyViewed } = useRecentlyViewed();

    // ============ State ============
    const [product, setProduct] = useState<Product | null>(null);
    const [medias, setMedias] = useState<ProductMedia[]>([]);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [specGroups, setSpecGroups] = useState<SpecificationGroup[] | undefined>();
    const [specValues, setSpecValues] = useState<ProductSpecificationValue[] | undefined>();
    const [stockByBranch, setStockByBranch] = useState<StockByBranch[] | undefined>();
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();

    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<ProductDetailTabKey>('description');
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

    // ============ Derived ============
    const ratingCounts = useMemo(() => {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            if (r.rating >= 1 && r.rating <= 5) counts[r.rating] = (counts[r.rating] || 0) + 1;
        });
        return counts;
    }, [reviews]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    }, [reviews]);

    const legacySpecs = useMemo(
        () => parseLegacySpecifications(product?.specifications),
        [product?.specifications]
    );

    // Fallback media list from legacy imageUrl + galleryImages nếu backend chưa trả medias
    const legacyImages = useMemo<string[]>(() => {
        if (!product) return [];
        const list: string[] = [];
        if (product.imageUrl) list.push(product.imageUrl);
        if (product.galleryImages) {
            try {
                const g = JSON.parse(product.galleryImages);
                if (Array.isArray(g)) list.push(...g);
            } catch { /* ignore */ }
        }
        return list;
    }, [product]);

    const displayMedias = useMemo<ProductMedia[]>(() => {
        if (medias.length > 0) return medias;
        return legacyImages.map((url, index) => ({
            id: `legacy-${index}`,
            productId: product?.id ?? '',
            type: 'Image' as const,
            url,
            sortOrder: index,
            isPrimary: index === 0,
        }));
    }, [medias, legacyImages, product?.id]);

    const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
    const displayOldPrice = selectedVariant?.oldPrice ?? product?.oldPrice;
    const discount = displayOldPrice && displayOldPrice > displayPrice
        ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)
        : null;

    // ============ Data loading ============
    const loadProduct = useCallback(async (productParam: string) => {
        setLoading(true);
        try {
            // Bước 1: lấy product cơ bản (theo slug/id) — luôn phải có
            const base = UUID_REGEX.test(productParam)
                ? await catalogApi.getProduct(productParam)
                : await catalogApi.getProductBySlug(productParam);
            setProduct(base);

            // Bước 2: thử fetch bundle (media/variants/specs). Nếu backend chưa hỗ trợ, silent fail.
            try {
                const bundle = await catalogApi.getProductWithDetails(base.id) as Partial<ProductDetailBundle>;
                if (Array.isArray(bundle.medias)) setMedias(bundle.medias);
                if (Array.isArray(bundle.variants)) setVariants(bundle.variants);
                if (Array.isArray(bundle.specs)) setSpecValues(bundle.specs);
                if (Array.isArray(bundle.specGroups)) setSpecGroups(bundle.specGroups);
                if (Array.isArray(bundle.stockByBranch)) setStockByBranch(bundle.stockByBranch);

                // Chọn variant mặc định
                if (Array.isArray(bundle.variants) && bundle.variants.length > 0) {
                    const def = bundle.variants.find((v) => v.isDefault) ??
                        bundle.variants.find((v) => v.id === base.defaultVariantId) ??
                        bundle.variants[0];
                    setSelectedVariant(def);
                }
            } catch {
                // Backend endpoint chưa sẵn — chạy chế độ legacy.
                setMedias([]);
                setVariants([]);
                setSpecValues(undefined);
                setSpecGroups(undefined);
                setSelectedVariant(undefined);
            }

            // Bước 3: nếu có categoryId + specGroups chưa có, thử fetch riêng
            if (base.categoryId && !specGroups) {
                try {
                    const groups = await catalogApi.getSpecGroupsByCategory(base.categoryId);
                    if (Array.isArray(groups)) setSpecGroups(groups);
                } catch { /* silent */ }
            }
        } catch {
            navigate('/products', { replace: true });
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const loadRelatedProducts = async (productId: string) => {
        setLoadingRelated(true);
        try {
            const response = await client.get<Product[]>(`/catalog/products/${productId}/related`);
            const valid = Array.isArray(response.data)
                ? response.data.filter((p) => p?.id && p?.name && typeof p.price === 'number' && !Number.isNaN(p.price))
                : [];
            setRelatedProducts(valid);
        } catch { /* silent */ } finally { setLoadingRelated(false); }
    };

    const loadReviews = async (productId: string) => {
        setLoadingReviews(true);
        try {
            const response = await client.get<{ reviews?: ProductReview[] } | ProductReview[]>(`/catalog/products/${productId}/reviews`);
            const data = response.data;
            setReviews(Array.isArray(data) ? data : data.reviews || []);
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

    // ============ Effects ============
    useEffect(() => {
        const handleScroll = () => setShowStickyBar(window.scrollY > 800);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (param) { void loadProduct(param); }
        window.scrollTo(0, 0);
    }, [param, loadProduct]);

    useEffect(() => {
        if (product?.id) {
            void loadRelatedProducts(product.id);
            void loadReviews(product.id);
            void checkPurchaseStatus(product.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id, isAuthenticated]);

    useEffect(() => { if (product?.id) addToRecentlyViewed(product.id); }, [product?.id, addToRecentlyViewed]);

    // ============ Handlers ============
    const handleAddToCart = async () => {
        if (!product) return;
        setAddingToCart(true);
        try {
            addToCart(product, quantity);
            setShowAddedNotification(true);
            setTimeout(() => setShowAddedNotification(false), 3000);
        } catch { /* silent */ } finally { setAddingToCart(false); }
    };

    const handleBuyNow = () => { void handleAddToCart(); navigate('/checkout'); };

    const handleWriteReview = () => {
        if (!isAuthenticated) {
            toast('Vui lòng đăng nhập để viết đánh giá!', { icon: '🔐', duration: 3000 });
            navigate('/login', { state: { from: `/san-pham/${param}` } });
            return;
        }
        if (!hasPurchased) {
            toast('Bạn cần mua sản phẩm này trước khi đánh giá!', { icon: '🛒', duration: 3000 });
            return;
        }
        setShowReviewModal(true);
    };

    const handleMarkHelpful = async (reviewId: string) => {
        try { await client.post(`/catalog/reviews/${reviewId}/helpful`); } catch { /* silent */ }
    };

    const handleCompareClick = () => {
        if (product?.id) navigate(`/compare?add=${product.id}`);
    };

    // ============ Render ============
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--accent-primary)] mx-auto" />
                    <p className="mt-4 text-gray-600 text-sm">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy sản phẩm</h2>
                    <button
                        onClick={() => navigate('/products')}
                        className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer"
                    >
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title={product.metaTitle || product.name}
                description={product.metaDescription || product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || `Mua ${product.name} chính hãng giá tốt tại Quang Hưởng Computer`}
                keywords={product.metaKeywords || `${product.name}, mua ${product.name}, ${product.sku}`}
                image={product.imageUrl || '/logo.png'}
                type="product"
                canonicalUrl={product.canonicalUrl || `/san-pham/${product.slug || product.id}`}
                structuredData={[
                    generateProductSchema(product),
                    generateBreadcrumbSchema([
                        { name: 'Trang chủ', url: '/' },
                        { name: 'Sản phẩm', url: '/products' },
                        { name: product.name },
                    ]),
                ]}
            />

            {/* Notification added to cart */}
            <AnimatePresence>
                {showAddedNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50"
                    >
                        <Check className="w-5 h-5" />
                        <span className="font-medium text-sm">Đã thêm vào giỏ hàng!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                    <nav className="flex items-center gap-2 text-sm">
                        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-[var(--accent-primary)] transition-colors cursor-pointer">Trang chủ</button>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                        <button onClick={() => navigate('/products')} className="text-gray-500 hover:text-[var(--accent-primary)] transition-colors cursor-pointer">Sản phẩm</button>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                        <span className="text-gray-900 font-semibold truncate max-w-xs">{product.name}</span>
                    </nav>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-8 pb-32 lg:pb-10">
                {/* Grid 2 cột: gallery + info */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                        {/* Cột trái: gallery — 60% desktop */}
                        <div className="lg:col-span-3 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
                            <div className="lg:sticky lg:top-24">
                                <ProductMediaGallery
                                    medias={displayMedias}
                                    productName={product.name}
                                    activeVariantId={selectedVariant?.id}
                                    fallbackImageUrl={product.imageUrl}
                                    discountBadge={discount}
                                />
                            </div>
                        </div>

                        {/* Cột phải: info */}
                        <div className="lg:col-span-2 p-4 sm:p-6">
                            <ProductDetailInfo
                                product={product}
                                variants={variants}
                                selectedVariant={selectedVariant}
                                onVariantChange={setSelectedVariant}
                                quantity={quantity}
                                onQuantityChange={setQuantity}
                                onAddToCart={handleAddToCart}
                                onBuyNow={handleBuyNow}
                                addingToCart={addingToCart}
                                averageRating={averageRating}
                                reviewCount={reviews.length}
                                stockByBranch={stockByBranch}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <ProductDetailTabs
                    product={product}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    medias={displayMedias}
                    legacySpecs={legacySpecs}
                    specGroups={specGroups}
                    specValues={specValues}
                    onCompareClick={handleCompareClick}
                    reviews={reviews}
                    loadingReviews={loadingReviews}
                    averageRating={averageRating}
                    ratingCounts={ratingCounts}
                    hasPurchased={hasPurchased}
                    checkingPurchase={checkingPurchase}
                    isAuthenticated={isAuthenticated}
                    onWriteReview={handleWriteReview}
                    onMarkHelpful={handleMarkHelpful}
                />

                {/* Recommendations */}
                {product.id && <RecommendationCarousel productId={product.id} title="Sản phẩm gợi ý cho bạn" />}

                {/* Related */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Sản phẩm liên quan</h2>
                        <button
                            onClick={() => navigate(product.categoryId ? `/products?category=${product.categoryId}` : '/products')}
                            className="text-[var(--accent-primary)] text-sm font-semibold hover:text-[var(--accent-primary-hover)] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            Xem tất cả <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    {loadingRelated ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : relatedProducts.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {relatedProducts.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => navigate(`/san-pham/${p.slug || p.id}`)}
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                                >
                                    <div className="aspect-[4/3] bg-white p-4 flex items-center justify-center relative overflow-hidden">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <span className="text-gray-300 text-4xl font-black">{p.name?.charAt(0) || '?'}</span>
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-gray-50 space-y-1">
                                        <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm group-hover:text-[var(--accent-primary)] transition-colors leading-snug min-h-[2.5rem]">
                                            {p.name}
                                        </h3>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[var(--accent-primary)] font-bold">{formatCurrency(p.price)}</span>
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
                            <p className="text-gray-500 text-sm">Không tìm thấy sản phẩm liên quan</p>
                        </div>
                    )}
                </section>

                {/* Recently viewed */}
                <RecentlyViewedProducts currentProductId={product.id} title="Bạn đã xem gần đây" />
            </div>

            {/* Review modal */}
            {product && (
                <WriteReviewModal
                    isOpen={showReviewModal}
                    onClose={() => setShowReviewModal(false)}
                    productId={product.id}
                    productName={product.name}
                    onReviewSubmitted={() => { if (product.id) void loadReviews(product.id); }}
                />
            )}

            {/* Sticky bar mobile */}
            <AnimatePresence>
                {showStickyBar && product && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                    >
                        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                            <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg p-0.5 flex-shrink-0">
                                    {displayMedias[0] && <img src={displayMedias[0].url} alt="" className="w-full h-full object-contain" />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                                    <span className="text-[var(--accent-primary)] font-bold text-sm">{formatCurrency(displayPrice)}</span>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={handleBuyNow}
                                    disabled={(selectedVariant?.stockQuantity ?? product.stockQuantity) === 0}
                                    className="flex-1 md:flex-none bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                                >
                                    MUA NGAY
                                </button>
                                <button
                                    onClick={handleAddToCart}
                                    disabled={(selectedVariant?.stockQuantity ?? product.stockQuantity) === 0 || addingToCart}
                                    className="flex-1 md:flex-none border-2 border-[var(--accent-primary)] text-[var(--accent-primary)] px-6 py-3 rounded-xl hover:bg-red-50 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                                >
                                    <ShoppingCart className="w-4 h-4" />
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
