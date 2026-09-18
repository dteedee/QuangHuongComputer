/**
 * Promotion effectiveness — admin client for `GET /api/reports/promotion-effectiveness`
 * (backend: `Reporting/Endpoints/PromotionEffectivenessEndpoints.cs`, D10/W2-16,
 * permission `Reporting.ViewSales`). Deliberately a NEW file (D10) so it never
 * couples to W3-11's `api/promotions/{admin,types}.ts`.
 *
 * Every number here is the API's own — this module never estimates a trend or
 * a rate client-side (phase-77 Risk Assessment: "numbers disagree with the
 * finance report"). `redemptionRate` is a repeat-usage rate (share of usages
 * that are NOT a customer's first use), exactly as the backend computes it —
 * see the endpoint's Vietnamese comment.
 */
import { client } from '../client';

export interface PromotionEffectivenessRow {
  promotionId: string;
  orderCount: number;
  revenue: number;
  discountGiven: number;
  usageCount: number;
  uniqueCustomers: number;
  /** Percent, 0-100, one decimal. Share of usages that are repeat use, not first use. */
  redemptionRate: number;
}

export interface CouponEffectivenessRow {
  couponCode: string;
  orderCount: number;
  revenue: number;
  discountGiven: number;
}

export interface PromotionEffectivenessReport {
  period: { start: string; end: string };
  promotions: PromotionEffectivenessRow[];
  coupons: CouponEffectivenessRow[];
}

export const promotionInsightsApi = {
  /** `startDate`/`endDate` as `yyyy-MM-dd`; omit either to use the backend's default period. */
  getEffectiveness: async (params?: { startDate?: string; endDate?: string }) => {
    const { data } = await client.get<PromotionEffectivenessReport>('/reports/promotion-effectiveness', {
      params,
    });
    return data;
  },
};
