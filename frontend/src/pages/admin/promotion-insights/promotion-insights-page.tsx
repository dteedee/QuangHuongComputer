/**
 * Promotion effectiveness / insights (W3-18). Reads `GET
 * /api/reports/promotion-effectiveness` (D10/W2-16) — a date range, a
 * per-promotion table (orders/revenue/discount/redemption) and a coupon
 * breakdown, all straight from the API (no client-side estimation, per Risk
 * Assessment). Drill-in reuses `PromotionEffectivenessReport` (carved out of
 * W3-11 into this track).
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Input, StatCard, Dialog, ErrorState } from '../../../components/ui';
import { fadeUpAdmin } from '../../../design-system/motion';
import { promotionInsightsApi, type PromotionEffectivenessRow } from '../../../api/promotions/insights';
import { promotionsApi, type Promotion } from '../../../api/promotions/admin';
import { PromotionInsightsTable, CouponBreakdownTable } from './promotion-insights-table';
import { PromotionEffectivenessReport } from '../../../components/admin/promotion-effectiveness-report';

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function PromotionInsightsPage() {
  const [startDate, setStartDate] = useState(todayIso(-30));
  const [endDate, setEndDate] = useState(todayIso());
  const [detailRow, setDetailRow] = useState<PromotionEffectivenessRow | null>(null);

  const reportQuery = useQuery({
    queryKey: ['promotion-insights', 'effectiveness', startDate, endDate],
    queryFn: () => promotionInsightsApi.getEffectiveness({ startDate, endDate }),
  });

  // Best-effort name lookup — requires `Content.ManageCoupons`, a DIFFERENT
  // permission than this page's `Reporting.ViewSales`. A user without it gets
  // a 403 here; caught and ignored so the table still renders with raw ids
  // instead of the whole page failing (integration-requests-w3.md).
  const namesQuery = useQuery({
    queryKey: ['promotion-insights', 'names'],
    queryFn: () => promotionsApi.list(),
    retry: false,
    throwOnError: false,
  });
  const promotionsById = useMemo(() => {
    const map = new Map<string, Promotion>();
    (namesQuery.data ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [namesQuery.data]);

  const detailPromotion = detailRow ? promotionsById.get(detailRow.promotionId) : undefined;

  const totalRevenue = reportQuery.data?.promotions.reduce((s, p) => s + p.revenue, 0) ?? null;
  const totalDiscount = reportQuery.data?.promotions.reduce((s, p) => s + p.discountGiven, 0) ?? null;
  const totalOrders = reportQuery.data?.promotions.reduce((s, p) => s + p.orderCount, 0) ?? null;

  return (
    <motion.div variants={fadeUpAdmin} initial="hidden" animate="show" className="space-y-4 pb-8">
      <PageHeader
        title="Hiệu quả khuyến mãi"
        description="Số đơn, doanh thu, tiền giảm và tỉ lệ dùng lại theo từng chương trình — số liệu thật từ báo cáo, không tự tính."
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input type="date" label="Từ ngày" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate} />
        <Input type="date" label="Đến ngày" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} max={todayIso()} />
      </div>

      {reportQuery.isError ? (
        <ErrorState error={reportQuery.error} onRetry={() => reportQuery.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Tổng số đơn (kỳ)" value={reportQuery.isPending ? undefined : totalOrders} />
          <StatCard label="Tổng doanh thu (kỳ)" value={reportQuery.isPending ? undefined : totalRevenue !== null ? `${totalRevenue.toLocaleString('vi-VN')}đ` : null} />
          <StatCard label="Tổng tiền đã giảm (kỳ)" value={reportQuery.isPending ? undefined : totalDiscount !== null ? `${totalDiscount.toLocaleString('vi-VN')}đ` : null} />
        </div>
      )}

      <PromotionInsightsTable
        rows={reportQuery.data?.promotions}
        loading={reportQuery.isPending}
        error={reportQuery.isError ? reportQuery.error : undefined}
        onRetry={() => reportQuery.refetch()}
        promotionsById={promotionsById}
        onViewDetail={setDetailRow}
      />

      <CouponBreakdownTable
        rows={reportQuery.data?.coupons}
        loading={reportQuery.isPending}
        error={reportQuery.isError ? reportQuery.error : undefined}
        onRetry={() => reportQuery.refetch()}
      />

      <Dialog
        open={!!detailRow}
        onOpenChange={(o) => !o && setDetailRow(null)}
        title={detailPromotion?.name ?? 'Chi tiết khuyến mãi'}
        size="lg"
      >
        {detailRow && detailPromotion ? (
          <PromotionEffectivenessReport promotion={detailPromotion} report={detailRow} />
        ) : (
          <p className="text-sm text-fg-muted">
            Không tải được thông tin đầy đủ của khuyến mãi này (có thể do quyền truy cập hoặc khuyến mãi đã bị xoá).
            Số liệu hiệu quả trong kỳ: {detailRow?.orderCount.toLocaleString('vi-VN')} đơn ·{' '}
            {detailRow?.revenue.toLocaleString('vi-VN')}đ doanh thu · {detailRow?.discountGiven.toLocaleString('vi-VN')}đ đã giảm.
          </p>
        )}
      </Dialog>
    </motion.div>
  );
}
