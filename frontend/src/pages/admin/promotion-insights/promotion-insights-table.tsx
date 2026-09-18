import { Eye } from 'lucide-react';
import { DataTable, Button, type DataTableColumn } from '../../../components/ui';
import type { Promotion } from '../../../api/promotions/admin';
import type { PromotionEffectivenessRow, CouponEffectivenessRow } from '../../../api/promotions/insights';

interface PromotionInsightsTableProps {
  rows: PromotionEffectivenessRow[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Name lookup — best-effort (see `promotion-insights-page.tsx`); a row
   *  whose promotion isn't in this map still shows, keyed by id. */
  promotionsById: Map<string, Promotion>;
  onViewDetail: (row: PromotionEffectivenessRow) => void;
}

export function PromotionInsightsTable({ rows, loading, error, onRetry, promotionsById, onViewDetail }: PromotionInsightsTableProps) {
  const columns: DataTableColumn<PromotionEffectivenessRow>[] = [
    {
      id: 'name', header: 'Khuyến mãi', locked: true,
      cell: (r) => promotionsById.get(r.promotionId)?.name ?? <span className="font-mono text-xs text-fg-muted">{r.promotionId}</span>,
    },
    { id: 'orders', header: 'Số đơn', align: 'right', cell: (r) => <span className="num">{r.orderCount.toLocaleString('vi-VN')}</span> },
    { id: 'revenue', header: 'Doanh thu', align: 'right', cell: (r) => <span className="money">{r.revenue.toLocaleString('vi-VN')}đ</span> },
    { id: 'discount', header: 'Đã giảm', align: 'right', cell: (r) => <span className="money">{r.discountGiven.toLocaleString('vi-VN')}đ</span> },
    { id: 'redemption', header: 'Tỉ lệ dùng lại', align: 'right', cell: (r) => <span className="num">{r.redemptionRate}%</span> },
    {
      id: 'actions', header: '', width: '1%', locked: true,
      cell: (r) => <Button size="sm" variant="ghost" onClick={() => onViewDetail(r)}><Eye size={14} className="mr-1.5" />Chi tiết</Button>,
    },
  ];

  return (
    <DataTable
      caption="Hiệu quả từng chương trình khuyến mãi"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.promotionId}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={{ title: 'Không có lượt dùng khuyến mãi nào trong kỳ', description: 'Chọn một khoảng thời gian khác để xem hiệu quả khuyến mãi.' }}
    />
  );
}

export function CouponBreakdownTable({ rows, loading, error, onRetry }: { rows: CouponEffectivenessRow[] | undefined; loading: boolean; error: unknown; onRetry: () => void }) {
  const columns: DataTableColumn<CouponEffectivenessRow>[] = [
    { id: 'code', header: 'Mã giảm giá', locked: true, cell: (r) => <span className="font-mono">{r.couponCode}</span> },
    { id: 'orders', header: 'Số đơn', align: 'right', cell: (r) => <span className="num">{r.orderCount.toLocaleString('vi-VN')}</span> },
    { id: 'revenue', header: 'Doanh thu', align: 'right', cell: (r) => <span className="money">{r.revenue.toLocaleString('vi-VN')}đ</span> },
    { id: 'discount', header: 'Đã giảm', align: 'right', cell: (r) => <span className="money">{r.discountGiven.toLocaleString('vi-VN')}đ</span> },
  ];

  return (
    <DataTable
      caption="Hiệu quả theo mã giảm giá"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.couponCode}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={{ title: 'Không có mã giảm giá nào được dùng trong kỳ' }}
    />
  );
}
