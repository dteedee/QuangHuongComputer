import React from 'react';
import { RealFlashSaleSection } from './real-flash-sale-section';

interface FlashDealProps {
    title: string;
    config: {
        limit?: number;
        showViewAll?: boolean;
        showSubtitle?: boolean;
        subtitle?: string;
    };
}

/**
 * DynamicHomepage section type `flash_deal` — CMS-configured wrapper quanh
 * RealFlashSaleSection (real-flash-sale-section.tsx).
 *
 * W0-12 (step 4, D01 override): TRƯỚC ĐÂY `deals = products.slice(0, limit)` — 5 sản phẩm đầu
 * ở giá NGUYÊN, gắn tiêu đề "FLASH SALE - GIÁ SỐC HÔM NAY" dù không có khuyến mãi nào (comment
 * cũ: "In a real app, you'd fetch by tag or filter. For now, just slice first products.").
 * Giờ chỉ hiện khi `/api/content/flash-sales/active` có sale Active áp được vào >=1 sản phẩm —
 * giá + countdown lấy từ dữ liệu FlashSale thật (flash-sale-pricing.ts).
 */
export const FlashDeal: React.FC<FlashDealProps> = ({ title, config }) => {
    const { limit = 5, showViewAll = true, showSubtitle = true, subtitle } = config;
    return (
        <RealFlashSaleSection
            title={title}
            subtitle={showSubtitle ? subtitle : undefined}
            limit={limit}
            showViewAll={showViewAll}
        />
    );
};
