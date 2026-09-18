/**
 * Promotions — the ONE type genuinely shared between `public.ts` (storefront)
 * and `admin.ts` (back-office). (W1-9, step 7c.)
 *
 * `Promotion`/`EvaluateRequest`/`EvaluateResponse` are deliberately NOT unified
 * here: the two old flat files (`api/promotion.ts` singular, `api/promotion
 * s.ts` plural) each declare a DIFFERENT response shape for the SAME endpoint
 * (`POST /promotions/evaluate` — storefront expects `{subtotal, discountTotal,
 * shippingDiscount, finalTotal, appliedPromotions, freeGifts, warnings}`,
 * admin expects `{isApplicable, subtotal, lineDiscounts, orderDiscount,
 * shippingDiscount, totalDiscount, finalTotal, freeGifts, appliedPromotions,
 * warnings}`). That mismatch predates this track and is filed as an
 * integration request rather than silently "fixed" here — see
 * `reports/integration-requests-w1.md`.
 */
export type PromotionDiscountType = 'Percent' | 'Fixed' | 'FreeShip' | 'BuyXGetY' | 'Tiered';
