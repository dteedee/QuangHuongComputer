import { Users, Percent, BarChart3, ShoppingCart, TicketPercent, Repeat } from 'lucide-react';
import type { Promotion } from '../../api/promotions/admin';
import type { PromotionEffectivenessRow } from '../../api/promotions/insights';

interface PromotionEffectivenessReportProps {
  promotion: Promotion;
  /**
   * Real period totals from `GET /api/reports/promotion-effectiveness`
   * (W3-18). Optional so `PromotionsPage.tsx` (W3-11), which does not fetch
   * this report, keeps working unchanged — omitting it just keeps the older
   * "no report endpoint yet" empty state below.
   */
  report?: PromotionEffectivenessRow | null;
}

/**
 * `report` used to always be undefined (no endpoint existed — see git history).
 * W2-16 shipped `/api/reports/promotion-effectiveness`; when the caller passes
 * a matching row this now renders the real per-period numbers instead of the
 * "chưa có endpoint" placeholder. There is still no per-day trend in the
 * response (only period totals), so no line chart is drawn — that would be
 * inventing a shape the API does not return (D12 rule 7).
 */
export function PromotionEffectivenessReport({ promotion, report }: PromotionEffectivenessReportProps) {
  const usagePct = promotion.maxTotalUsage
    ? Math.min(100, Math.round((promotion.currentUsage / promotion.maxTotalUsage) * 100))
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          label="Đã dùng"
          value={
            promotion.maxTotalUsage
              ? `${promotion.currentUsage.toLocaleString('vi-VN')} / ${promotion.maxTotalUsage.toLocaleString('vi-VN')}`
              : `${promotion.currentUsage.toLocaleString('vi-VN')}`
          }
          hint={usagePct !== null ? `${usagePct}% trần lượt dùng` : 'Không giới hạn'}
          tone="blue"
        />
        <StatCard
          icon={<Percent className="w-5 h-5 text-amber-600" />}
          label="Giá trị giảm"
          value={
            promotion.discountType === 'Percent'
              ? `${promotion.discountValue}%`
              : promotion.discountType === 'Fixed'
              ? `${promotion.discountValue.toLocaleString('vi-VN')}đ`
              : '—'
          }
          hint={promotion.maxDiscountAmount ? `Tối đa ${promotion.maxDiscountAmount.toLocaleString('vi-VN')}đ` : 'Không giới hạn'}
          tone="amber"
        />
      </div>

      {report ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<ShoppingCart className="w-5 h-5 text-green-600" />} label="Số đơn (kỳ)" value={report.orderCount.toLocaleString('vi-VN')} hint="Đơn đã ghi nhận doanh thu" tone="green" />
          <StatCard icon={<TicketPercent className="w-5 h-5 text-red-600" />} label="Đã giảm (kỳ)" value={`${report.discountGiven.toLocaleString('vi-VN')}đ`} hint={`Doanh thu ${report.revenue.toLocaleString('vi-VN')}đ`} tone="red" />
          <StatCard icon={<Repeat className="w-5 h-5 text-blue-600" />} label="Tỉ lệ dùng lại" value={`${report.redemptionRate}%`} hint={`${report.uniqueCustomers} khách khác nhau / ${report.usageCount} lượt`} tone="blue" />
          <StatCard icon={<BarChart3 className="w-5 h-5 text-amber-600" />} label="Trung bình/đơn" value={report.orderCount > 0 ? `${Math.round(report.revenue / report.orderCount).toLocaleString('vi-VN')}đ` : '—'} hint="Doanh thu / số đơn" tone="amber" />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-8 bg-white flex flex-col items-center text-center gap-2">
          <BarChart3 className="w-8 h-8 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">Chưa có số liệu hiệu quả cho kỳ đã chọn</p>
          <p className="text-xs text-gray-500 max-w-sm">
            Chưa có lượt sử dụng khuyến mãi này được ghi nhận trong kỳ báo cáo đang chọn.
          </p>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'red' | 'amber';
}

const toneClass: Record<StatCardProps['tone'], string> = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  red: 'bg-red-50',
  amber: 'bg-amber-50',
};

function StatCard({ icon, label, value, hint, tone }: StatCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClass[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">{hint}</p>
    </div>
  );
}

export default PromotionEffectivenessReport;
