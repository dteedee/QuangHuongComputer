import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { catalogApi, type Product, type ProductReview, type ProductVariant, type ProductMedia, type ProductDetailBundle, type SpecificationGroup, type ProductSpecificationValue, type StockByBranch } from '../api/catalog';
import { salesApi } from '../api/sales';
import client from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { generateProductSchema, generateBreadcrumbSchema } from '../utils/structuredData';
import { parseLegacySpecifications, PRODUCT_ID_UUID_REGEX } from '../utils/parse-legacy-product-specifications';

import SEO from '../components/SEO';
import { WriteReviewModal } from '../components/reviews';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';
import RecommendationCarousel from '../components/recommendation-carousel';
import {
    ProductMediaGallery,
    ProductDetailInfo,
    ProductDetailTabs,
    ProductDetailRelatedSection,
    ProductDetailStickyBuyBar,
    ProductDetailBreadcrumb,
    ProductDetailAddedToCartToast,
    ProductDetailLoadingState,
    ProductDetailNotFoundState,
    type ProductDetailTabKey,
} from '../components/product-detail';

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
            const base = PRODUCT_ID_UUID_REGEX.test(productParam)
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
        return <ProductDetailLoadingState />;
    }

    if (!product) {
        return <ProductDetailNotFoundState onBackToList={() => navigate('/products')} />;
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
            <ProductDetailAddedToCartToast show={showAddedNotification} />

            {/* Breadcrumb */}
            <ProductDetailBreadcrumb productName={product.name} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-8 pb-32 lg:pb-10">
                {/* Grid 2 cột: gallery + info */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-small overflow-hidden">
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
                <ProductDetailRelatedSection
                    loading={loadingRelated}
                    relatedProducts={relatedProducts}
                    categoryId={product.categoryId}
                />

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
            {product && (
                <ProductDetailStickyBuyBar
                    show={showStickyBar}
                    product={product}
                    displayMedia={displayMedias[0]}
                    displayPrice={displayPrice}
                    stockQuantity={selectedVariant?.stockQuantity ?? product.stockQuantity}
                    addingToCart={addingToCart}
                    onBuyNow={handleBuyNow}
                    onAddToCart={handleAddToCart}
                />
            )}
        </div>
    );
}
