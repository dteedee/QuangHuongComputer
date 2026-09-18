/**
 * The PDP tab strip, on the kit's `Tabs` (Radix + the design-system underline
 * motion) instead of a hand-rolled button row. Counts are real: the video tab
 * only exists when the product actually has video media, and the review count
 * comes from the approved-only stats endpoint, not from the page currently
 * loaded in memory.
 */
import { useMemo } from 'react';

import type { Product, ProductReview, ProductSpecGroup } from '../../api/catalog';
import type { ProductMediaView } from '../../api/catalog/public-product';
import { Tab, TabList, TabPanel, Tabs } from '../ui';
import ProductBuyingGuideTab from './product-buying-guide-tab';
import ProductDescriptionTab from './product-description-tab';
import ProductQaTab from './product-qa-tab';
import ProductReviewsTab from './product-reviews-tab';
import ProductSpecificationsTab from './product-specifications-tab';
import ProductVideoPlayer from './product-video-player';
import type { ReviewStats } from './use-product-detail-data';

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

    medias: ProductMediaView[];
    specGroups?: ProductSpecGroup[] | null;
    onCompareClick?: () => void;

    reviews: ProductReview[];
    reviewTotal: number;
    reviewPage: number;
    reviewPageSize: number;
    onReviewPageChange: (page: number) => void;
    loadingReviews: boolean;
    reviewsError?: unknown;
    onRetryReviews: () => void;
    stats?: ReviewStats;
    hasPurchased: boolean | null;
    checkingPurchase: boolean;
    isAuthenticated: boolean;
    onWriteReview: () => void;
    onMarkHelpful: (reviewId: string) => Promise<void> | void;
}

export default function ProductDetailTabs({
    product, activeTab, onTabChange,
    medias, specGroups, onCompareClick,
    reviews, reviewTotal, reviewPage, reviewPageSize, onReviewPageChange,
    loadingReviews, reviewsError, onRetryReviews, stats, hasPurchased,
    checkingPurchase, isAuthenticated, onWriteReview, onMarkHelpful,
}: ProductDetailTabsProps) {
    const videoMedias = useMemo(
        () => medias.filter((m) => m.type === 'Video' || m.type === 'YoutubeEmbed'),
        [medias]
    );

    const tabs: Array<{ key: ProductDetailTabKey; label: string; count?: number }> = [
        { key: 'description', label: 'Mô tả sản phẩm' },
        { key: 'specifications', label: 'Thông số kỹ thuật' },
        ...(videoMedias.length > 0
            ? [{ key: 'video' as const, label: 'Video', count: videoMedias.length }]
            : []),
        { key: 'buying', label: 'Mua & trả góp' },
        {
            key: 'reviews',
            label: 'Đánh giá',
            // `count` renders a chip, so 0 would print "Đánh giá 0" — omit it.
            count: (stats?.totalReviews ?? reviewTotal) || undefined,
        },
        { key: 'qa', label: 'Hỏi đáp' },
    ];

    return (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ProductDetailTabKey)}>
                <TabList className="border-b border-line">
                    {tabs.map((tab) => (
                        <Tab key={tab.key} value={tab.key} count={tab.count}>
                            {tab.label}
                        </Tab>
                    ))}
                </TabList>

                <div className="bg-sunken/40 p-4 sm:p-6">
                    <TabPanel value="description">
                        <ProductDescriptionTab
                            description={product.description}
                            attributes={product.attributes}
                        />
                    </TabPanel>
                    <TabPanel value="specifications">
                        <ProductSpecificationsTab specGroups={specGroups} onCompareClick={onCompareClick} />
                    </TabPanel>
                    {videoMedias.length > 0 && (
                        <TabPanel value="video">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {videoMedias.map((m) => (
                                    <div key={m.id} className="aspect-video overflow-hidden rounded-xl bg-black">
                                        <ProductVideoPlayer media={m} />
                                    </div>
                                ))}
                            </div>
                        </TabPanel>
                    )}
                    <TabPanel value="buying">
                        <ProductBuyingGuideTab warrantyInfo={product.warrantyInfo} />
                    </TabPanel>
                    <TabPanel value="reviews">
                        <ProductReviewsTab
                            reviews={reviews}
                            total={reviewTotal}
                            page={reviewPage}
                            pageSize={reviewPageSize}
                            onPageChange={onReviewPageChange}
                            loadingReviews={loadingReviews}
                            error={reviewsError}
                            onRetry={onRetryReviews}
                            stats={stats}
                            hasPurchased={hasPurchased}
                            checkingPurchase={checkingPurchase}
                            isAuthenticated={isAuthenticated}
                            onWriteReview={onWriteReview}
                            onMarkHelpful={onMarkHelpful}
                        />
                    </TabPanel>
                    <TabPanel value="qa">
                        <ProductQaTab productId={product.id} productName={product.name} />
                    </TabPanel>
                </div>
            </Tabs>
        </div>
    );
}
