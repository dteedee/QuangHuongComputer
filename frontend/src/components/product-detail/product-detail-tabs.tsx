import { useMemo } from 'react';
import type { Product, ProductMedia, ProductReview, SpecificationGroup, ProductSpecificationValue } from '../../api/catalog';
import ProductDescriptionTab from './product-description-tab';
import ProductSpecificationsTab from './product-specifications-tab';
import ProductReviewsTab from './product-reviews-tab';
import ProductBuyingGuideTab from './product-buying-guide-tab';
import ProductQaTab from './product-qa-tab';
import ProductVideoPlayer from './product-video-player';

export type ProductDetailTabKey =
    | 'description'
    | 'specifications'
    | 'video'
    | 'buying'
    | 'reviews'
    | 'qa';

interface ProductDetailTabsProps {
    product: Product;
    activeTab: ProductDetailTabKey;
    onTabChange: (tab: ProductDetailTabKey) => void;

    medias: ProductMedia[];
    legacySpecs?: Record<string, string>;
    specGroups?: SpecificationGroup[];
    specValues?: ProductSpecificationValue[];
    onCompareClick?: () => void;

    reviews: ProductReview[];
    loadingReviews: boolean;
    averageRating: number;
    ratingCounts: Record<number, number>;
    hasPurchased: boolean | null;
    checkingPurchase: boolean;
    isAuthenticated: boolean;
    onWriteReview: () => void;
    onMarkHelpful: (reviewId: string) => void;
}

/**
 * Khu tabs của trang chi tiết: 6 tab (Mô tả / Thông số / Video / Mua & trả góp / Đánh giá / Hỏi đáp).
 */
export default function ProductDetailTabs({
    product, activeTab, onTabChange,
    medias, legacySpecs, specGroups, specValues, onCompareClick,
    reviews, loadingReviews, averageRating, ratingCounts, hasPurchased,
    checkingPurchase, isAuthenticated, onWriteReview, onMarkHelpful,
}: ProductDetailTabsProps) {
    const videoMedias = useMemo(
        () => medias.filter((m) => m.type === 'Video' || m.type === 'YoutubeEmbed'),
        [medias]
    );

    const tabs: Array<{ key: ProductDetailTabKey; label: string }> = [
        { key: 'description', label: 'Mô tả sản phẩm' },
        { key: 'specifications', label: 'Thông số kỹ thuật' },
        { key: 'video', label: `Video (${videoMedias.length})` },
        { key: 'buying', label: 'Mua & trả góp' },
        { key: 'reviews', label: `Đánh giá (${reviews.length})` },
        { key: 'qa', label: 'Hỏi đáp' },
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className={`flex-shrink-0 px-5 py-4 font-semibold text-sm border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                            activeTab === tab.key
                                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-5 sm:p-6 bg-gray-50/30">
                {activeTab === 'description' && <ProductDescriptionTab description={product.description} />}
                {activeTab === 'specifications' && (
                    <ProductSpecificationsTab
                        specGroups={specGroups}
                        specValues={specValues}
                        legacySpecs={legacySpecs}
                        onCompareClick={onCompareClick}
                    />
                )}
                {activeTab === 'video' && (
                    videoMedias.length === 0 ? (
                        <p className="text-gray-500 italic text-sm bg-white p-6 rounded-xl border border-gray-100">
                            Chưa có video cho sản phẩm này.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {videoMedias.map((m) => (
                                <div key={m.id} className="bg-black rounded-xl overflow-hidden aspect-video">
                                    <ProductVideoPlayer media={m} />
                                </div>
                            ))}
                        </div>
                    )
                )}
                {activeTab === 'buying' && (
                    <ProductBuyingGuideTab price={product.price} warrantyInfo={product.warrantyInfo} />
                )}
                {activeTab === 'reviews' && (
                    <ProductReviewsTab
                        reviews={reviews}
                        loadingReviews={loadingReviews}
                        averageRating={averageRating}
                        ratingCounts={ratingCounts}
                        hasPurchased={hasPurchased}
                        checkingPurchase={checkingPurchase}
                        isAuthenticated={isAuthenticated}
                        onWriteReview={onWriteReview}
                        onMarkHelpful={onMarkHelpful}
                    />
                )}
                {activeTab === 'qa' && <ProductQaTab productId={product.id} />}
            </div>
        </div>
    );
}
