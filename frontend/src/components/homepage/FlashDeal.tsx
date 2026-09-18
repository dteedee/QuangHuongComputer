/**
 * CMS section adapter (`sectionType: flash_deal`).
 *
 * Renders the REAL flash sale from `GET /api/content/promotions/active`. The
 * CMS `configuration` (tag/limit/subtitle) is deliberately ignored: a homepage
 * section config cannot define which products are on sale — the promotion
 * engine does. When no sale is active, nothing renders.
 */
import { FlashSaleSection } from './flash-sale-section';

export const FlashDeal = () => <FlashSaleSection />;

export default FlashDeal;
