/**
 * `api/promotion.ts` — BARREL (singular file name kept for existing
 * importers). Real code moved to `api/promotions/public.ts` (W1-9, step 7c).
 * `CheckoutPage.tsx` / `promotion-step.tsx` / `promotion-input.tsx` keep
 * importing from here unchanged.
 */
export * from './promotions/public';
