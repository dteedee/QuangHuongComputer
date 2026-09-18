/**
 * Product detail page (PDP).
 *
 * One read does the work: `GET /catalog/products/by-slug/{slug}?include=media,
 * specs,variants` (or by GUID for the legacy `/product/:id` route). The old
 * three-step "base, then a bundle with an include list the server does not
 * understand, then category spec-groups, all silently swallowed" is gone.
 *
 * D11: `SEO` carries an ABSOLUTE canonical (it used to pass a relative path),
 * the OG/JSON-LD head comes from the .NET SEO shell, and a missing product
 * renders the not-found state with `noindex` instead of a blank 200.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { buildPath, ROUTES } from '../routes/route-paths';

import { catalogPublicProductApi } from '../api/catalog/public-product';
import type { ProductMediaView } from '../api/catalog/public-product';
import type { Product, ProductVariant } from '../api/catalog';
import { flashSalePublicApi } from '../api/promotions/public';
import { salesApi } from '../api/sales';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { trackEcommerce } from '../utils/analytics';
import { useQuery } from '@tanstack/react-query';

import SEO from '../components/SEO';
import { notify } from '../components/ui';
import { RecentlyViewedProducts } from '../components/RecentlyViewedProducts';
import RecommendationCarousel from '../components/recommendation-carousel';
import { WriteReviewModal } from '../components/reviews';
import {
    ProductDetailAddedToCartToast,
    ProductDetailBreadcrumb,
    ProductDetailErrorState,
    ProductDetailInfo,
    ProductDetailLoadingState,
    ProductDetailNotFoundState,
    ProductDetailRelatedSection,
    ProductDetailStickyBuyBar,
    ProductDetailTabs,
    ProductKeySpecsSummary,
    ProductMediaGallery,
    type ProductDetailTabKey,
} from '../components/product-detail';
import {
    statusOf,
    useProductDetail,
    useProductReviews,
    useRelatedProducts,
    useReviewStats,
} from '../components/product-detail/use-product-detail-data';

const REVIEW_PAGE_SIZE = 5;

export default function ProductDetailPage() {
    const { slug, id } = useParams<{ slug?: string; id?: string }>();
    const param = slug || id || '';
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { isAuthenticated } = useAuth();
    const { addToRecentlyViewed } = useRecentlyViewed();

    const productQuery = useProductDetail(param);
    const product = productQuery.data;

    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<ProductDetailTabKey>('description');
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
    const [addingToCart, setAddingToCart] = useState(false);
    const [showAddedNotification, setShowAddedNotification] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
    const [checkingPurchase, setCheckingPurchase] = useState(false);
    const [showStickyBar, setShowStickyBar] = useState(false);
    const [reviewPage, setReviewPage] = useState(1);

    const relatedQuery = useRelatedProducts(product?.id);
    const reviewsQuery = useProductReviews(product?.id, reviewPage, REVIEW_PAGE_SIZE);
    const statsQuery = useReviewStats(product?.id);

    // Flash sale: the real price + window, or nothing at all. Never a fake deal.
    const flashQuery = useQuery({
        queryKey: ['content', 'promotions', 'active'],
        queryFn: flashSalePublicApi.getActive,
        staleTime: 60 * 1000,
    });

    const medias = useMemo<ProductMediaView[]>(() => {
        const rows = product?.medias ?? [];
        return [...rows].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
    }, [product?.medias]);

    const variants = useMemo<ProductVariant[]>(() => product?.variants ?? [], [product?.variants]);

    const selectedVariant = useMemo(
        () => variants.find((v) => v.id === selectedVariantId),
        [variants, selectedVariantId]
    );

    // Pick the default variant once the product lands; reset when the slug changes.
    useEffect(() => {
        if (variants.length === 0) { setSelectedVariantId(undefined); return; }
        const def = variants.find((v) => v.isDefault) ?? variants[0];
        setSelectedVariantId(def?.id);
    }, [variants]);

    useEffect(() => {
        setQuantity(1);
        setReviewPage(1);
        setActiveTab('description');
        window.scrollTo(0, 0);
    }, [param]);

    const flashForProduct = useMemo(() => {
        if (!product) return null;
        for (const sale of flashQuery.data ?? []) {
            const hit = sale.products.find(
                (p) => p.productId === product.id
                    && (!p.variantId || p.variantId === selectedVariantId)
                    && !p.isSoldOut
            );
            if (hit && hit.flashPrice > 0) return { ...hit, endAt: sale.endAt };
        }
        return null;
    }, [flashQuery.data, product, selectedVariantId]);

    const displayPrice = flashForProduct?.flashPrice
        ?? selectedVariant?.price
        ?? product?.price
        ?? 0;
    const displayOldPrice = flashForProduct
        ? selectedVariant?.price ?? product?.price
        : selectedVariant?.oldPrice ?? product?.oldPrice;
    const discount = displayOldPrice && displayOldPrice > displayPrice
        ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)
        : null;

    // ---- side effects on the loaded product ---------------------------------
    useEffect(() => {
        if (!product?.id) return;
        addToRecentlyViewed({
            id: product.id,
            name: product.name,
            price: product.price,
            oldPrice: product.oldPrice,
            slug: product.slug,
            sku: product.sku,
            imageUrl: product.imageUrl,
            thumbnailUrl: product.thumbnailUrl,
            stockQuantity: product.stockQuantity,
            status: product.status,
            averageRating: product.averageRating,
            reviewCount: product.reviewCount,
        });
        trackEcommerce('view_item', {
            value: product.price,
            items: [{ item_id: product.id, item_name: product.name, price: product.price }],
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id, addToRecentlyViewed]);

    useEffect(() => {
        let cancelled = false;
        if (!product?.id) return;
        if (!isAuthenticated) { setHasPurchased(false); return; }
        setCheckingPurchase(true);
        salesApi.verifyPurchase(product.id)
            .then((r) => { if (!cancelled) setHasPurchased(r.hasPurchased); })
            .catch(() => { if (!cancelled) setHasPurchased(false); })
            .finally(() => { if (!cancelled) setCheckingPurchase(false); });
        return () => { cancelled = true; };
    }, [product?.id, isAuthenticated]);

    useEffect(() => {
        const handleScroll = () => setShowStickyBar(window.scrollY > 800);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ---- actions ------------------------------------------------------------
    const handleAddToCart = useCallback(async (): Promise<boolean> => {
        if (!product) return false;
        setAddingToCart(true);
        try {
            const ok = await addToCart(
                { id: product.id, name: product.name, price: displayPrice, stockQuantity: selectedVariant?.stockQuantity ?? product.stockQuantity },
                quantity,
                selectedVariant
                    ? { variantId: selectedVariant.id, variantName: selectedVariant.name, silent: true }
                    : { silent: true },
            );
            if (ok) {
                setShowAddedNotification(true);
                window.setTimeout(() => setShowAddedNotification(false), 3000);
                trackEcommerce('add_to_cart', {
                    value: displayPrice * quantity,
                    items: [{ item_id: product.id, item_name: product.name, quantity }],
                });
            }
            return ok;
        } finally {
            setAddingToCart(false);
        }
    }, [addToCart, displayPrice, product, quantity, selectedVariant]);

    /** "Mua ngay" only navigates once the server really took the line. */
    const handleBuyNow = useCallback(async () => {
        const ok = await handleAddToCart();
        if (ok) navigate(ROUTES.CHECKOUT);
    }, [handleAddToCart, navigate]);

    const handleWriteReview = useCallback(() => {
        if (!isAuthenticated) {
            navigate(ROUTES.LOGIN, { state: { from: buildPath(ROUTES.PRODUCT_DETAIL, param) } });
            return;
        }
        if (!hasPurchased) {
            notify.info('Bạn cần mua sản phẩm này trước khi đánh giá.');
            return;
        }
        setShowReviewModal(true);
    }, [hasPurchased, isAuthenticated, navigate, param]);

    const handleMarkHelpful = useCallback(async (reviewId: string) => {
        try {
            await catalogPublicProductApi.markReviewHelpful(reviewId);
            void reviewsQuery.refetch();
        } catch (err) {
            const status = statusOf(err);
            if (status === 401 || status === 403) notify.info('Vui lòng đăng nhập để bình chọn đánh giá.');
            else if (status === 409) notify.info('Bạn đã bình chọn đánh giá này rồi.');
            else notify.error('Không gửi được bình chọn. Vui lòng thử lại.');
            throw err;
        }
    }, [reviewsQuery]);

    const handleCompareClick = useCallback(() => {
        // The canonical path is `/so-sanh`; `/compare` is a redirect that drops
        // the query string, so `?add=` never reached the page.
        if (product?.id) navigate(`${ROUTES.COMPARE}?add=${product.id}`);
    }, [navigate, product?.id]);

    // ---- states -------------------------------------------------------------
    if (productQuery.isPending) return <ProductDetailLoadingState />;

    if (productQuery.isError && statusOf(productQuery.error) !== 404) {
        return (
            <>
                <SEO title="Không tải được sản phẩm" noindex />
                <ProductDetailErrorState
                    error={productQuery.error}
                    onRetry={() => void productQuery.refetch()}
                />
            </>
        );
    }

    if (!product) {
        return (
            <>
                <SEO
                    title="Không tìm thấy sản phẩm"
                    description="Sản phẩm bạn tìm không còn tồn tại trên Quang Hưởng Computer."
                    noindex
                />
                <ProductDetailNotFoundState onBackToList={() => navigate(ROUTES.PRODUCTS)} />
            </>
        );
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const canonicalPath = buildPath(ROUTES.PRODUCT_DETAIL, product.slug || product.id);
    const absoluteCanonical = product.canonicalUrl?.startsWith('http')
        ? product.canonicalUrl
        : `${origin}${product.canonicalUrl || canonicalPath}`;

    const reviewData = reviewsQuery.data;
    const stats = statsQuery.data;

    return (
        <div className="min-h-screen bg-bg">
            <SEO
                title={product.metaTitle || product.name}
                description={
                    product.metaDescription
                    || product.description?.replace(/<[^>]*>/g, '').slice(0, 160)
                    || `Mua ${product.name} chính hãng, giá tốt tại Quang Hưởng Computer.`
                }
                keywords={product.metaKeywords || `${product.name}, ${product.sku}`}
                image={medias[0]?.url || product.imageUrl || undefined}
                type="product"
                url={`${origin}${canonicalPath}`}
                canonicalUrl={absoluteCanonical}
            />

            <ProductDetailAddedToCartToast show={showAddedNotification} />

            <ProductDetailBreadcrumb productName={product.name} />

            <div className="mx-auto max-w-7xl space-y-8 px-4 pb-32 pt-6 sm:px-6 lg:pb-10 lg:pt-10">
                <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
                    <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
                        <div className="border-b border-line p-4 sm:p-6 lg:col-span-3 lg:border-b-0 lg:border-r">
                            <div className="lg:sticky lg:top-24 space-y-4">
                                <ProductMediaGallery
                                    medias={medias}
                                    productName={product.name}
                                    activeVariantId={selectedVariant?.id}
                                    fallbackImageUrl={product.imageUrl}
                                    discountBadge={discount}
                                />
                                <ProductKeySpecsSummary specGroups={product.specGroups} />
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 lg:col-span-2">
                            <ProductDetailInfo
                                product={product as Product}
                                variants={variants}
                                selectedVariant={selectedVariant}
                                onVariantChange={(v) => setSelectedVariantId(v.id)}
                                quantity={quantity}
                                onQuantityChange={setQuantity}
                                onAddToCart={() => { void handleAddToCart(); }}
                                onBuyNow={() => { void handleBuyNow(); }}
                                addingToCart={addingToCart}
                                averageRating={stats?.averageRating ?? product.averageRating ?? 0}
                                reviewCount={stats?.totalReviews ?? product.reviewCount ?? 0}
                                flashPrice={flashForProduct?.flashPrice ?? null}
                                flashEndAt={flashForProduct?.endAt ?? null}
                            />
                        </div>
                    </div>
                </div>

                <ProductDetailTabs
                    product={product as Product}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    medias={medias}
                    specGroups={product.specGroups}
                    onCompareClick={handleCompareClick}
                    reviews={reviewData?.reviews ?? []}
                    reviewTotal={reviewData?.total ?? 0}
                    reviewPage={reviewPage}
                    reviewPageSize={REVIEW_PAGE_SIZE}
                    onReviewPageChange={setReviewPage}
                    loadingReviews={reviewsQuery.isPending}
                    reviewsError={reviewsQuery.isError ? reviewsQuery.error : undefined}
                    onRetryReviews={() => void reviewsQuery.refetch()}
                    stats={stats}
                    hasPurchased={hasPurchased}
                    checkingPurchase={checkingPurchase}
                    isAuthenticated={isAuthenticated}
                    onWriteReview={handleWriteReview}
                    onMarkHelpful={handleMarkHelpful}
                />

                <RecommendationCarousel productId={product.id} title="Sản phẩm gợi ý cho bạn" />

                <ProductDetailRelatedSection
                    loading={relatedQuery.isPending}
                    isError={relatedQuery.isError}
                    relatedProducts={relatedQuery.data ?? []}
                    categoryId={product.categoryId}
                />

                <RecentlyViewedProducts currentProductId={product.id} title="Bạn đã xem gần đây" />
            </div>

            <WriteReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                productId={product.id}
                productName={product.name}
                onReviewSubmitted={() => {
                    void reviewsQuery.refetch();
                    void statsQuery.refetch();
                }}
            />

            <ProductDetailStickyBuyBar
                show={showStickyBar}
                product={product as Product}
                displayMedia={medias[0]}
                displayPrice={displayPrice}
                stockQuantity={selectedVariant?.stockQuantity ?? product.stockQuantity}
                addingToCart={addingToCart}
                onBuyNow={() => { void handleBuyNow(); }}
                onAddToCart={() => { void handleAddToCart(); }}
            />
        </div>
    );
}
