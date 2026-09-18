import { RealFlashSaleSection } from './real-flash-sale-section';

/**
 * Flash sale strip cho layout fallback (khi CMS không trả section nào) — mirrors
 * FlashDeal.tsx (mục CMS `flash_deal`) qua cùng RealFlashSaleSection.
 *
 * W0-12 (step 4, D01 override): trước bịa y hệt FlashDeal.tsx cũ (`products.slice(0, 5)`,
 * giá nguyên, tiêu đề "Flash Sale - Giá Sốc" hardcode). Giờ chỉ hiện khi có flash sale Active
 * thật áp được vào sản phẩm.
 */
export const FallbackFlashStrip = () => <RealFlashSaleSection limit={5} />;
