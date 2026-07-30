import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Wallet, Users, Percent } from 'lucide-react';
import type { Promotion } from '../../api/promotions';

interface PromotionEffectivenessReportProps {
  promotion: Promotion;
}

interface UsagePoint { date: string; usage: number; revenue: number; discount: number; }

const formatVnd = (n: number) => `${(n || 0).toLocaleString('vi-VN')}đ`;

/**
 * Backend chưa có endpoint report chuyên biệt (làm ở Phase 09).
 * Tạm sinh dữ liệu mô phỏng dựa trên currentUsage để admin thấy layout.
 */
function buildMockSeries(p: Promotion): UsagePoint[] {
  const totalUsage = p.currentUsage || 0;
  const days = 14;
  const points: UsagePoint[] = [];
  const now = new Date();
  const seed = totalUsage / days;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const wave = 0.6 + Math.abs(Math.sin(i / 2));
    const usage = Math.max(0, Math.round(seed * wave));
    const avgOrder = 1_500_000;
    const revenue = usage * avgOrder;
    const discountPerOrder = p.discountType === 'Percent'
      ? Math.min(p.discountValue * avgOrder / 100, p.maxDiscountAmount ?? Number.POSITIVE_INFINITY)
      : p.discountType === 'Fixed' ? p.discountValue
      : 30_000;
    points.push({
      date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      usage,
      revenue,
      discount: usage * discountPerOrder,
    });
  }
  return points;
}

export function PromotionEffectivenessReport({ promotion }: PromotionEffectivenessReportProps) {
  const series = useMemo(() => buildMockSeries(promotion), [promotion]);
  const totals = useMemo(() => {
    const revenue = series.reduce((s, p) => s + p.revenue, 0);
    const discount = series.reduce((s, p) => s + p.discount, 0);
    const roi = discount > 0 ? (revenue - discount) / discount : 0;
    return { revenue, discount, roi };
  }, [series]);

  const usagePct = promotion.maxTotalUsage
    ? Math.min(100, Math.round((promotion.currentUsage / promotion.maxTotalUsage) * 100))
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          label="Doanh thu tạo ra"
          value={formatVnd(totals.revenue)}
          hint="Ước tính 14 ngày gần nhất"
          tone="green"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5 text-red-600" />}
          label="Chi phí giảm giá"
          value={formatVnd(totals.discount)}
          hint="Số tiền đã miễn giảm"
          tone="red"
        />
        <StatCard
          icon={<Percent className="w-5 h-5 text-amber-600" />}
          label="ROI"
          value={totals.discount > 0 ? `${(totals.roi * 100).toFixed(1)}%` : '—'}
          hint="(Doanh thu − Discount) / Discount"
          tone="amber"
        />
      </div>

      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Lượt dùng theo ngày</h4>
            <p className="text-xs text-gray-500">
              Dữ liệu mô phỏng — Phase 09 sẽ nối endpoint báo cáo thật.
            </p>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(210,43,43,0.06)' }}
                formatter={(value: number) => value.toLocaleString('vi-VN')}
              />
              <Bar dataKey="usage" name="Lượt dùng" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
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
