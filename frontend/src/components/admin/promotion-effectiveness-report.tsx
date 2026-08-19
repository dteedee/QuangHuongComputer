import { Users, Percent, BarChart3 } from 'lucide-react';
import type { Promotion } from '../../api/promotions';

interface PromotionEffectivenessReportProps {
  promotion: Promotion;
}

/**
 * Backend chưa có endpoint báo cáo hiệu quả khuyến mãi theo ngày (doanh thu/chi phí
 * giảm giá). Trước đây component này tự sinh số liệu giả (doanh thu ước tính từ đơn
 * giá trung bình bịa) — đã bỏ để tránh hiển thị dữ liệu không có thật. Hiện chỉ hiển
 * thị số liệu thật có sẵn từ đối tượng Promotion (lượt dùng) + empty-state cho phần
 * biểu đồ doanh thu/ROI khi nào có endpoint báo cáo thật.
 */
export function PromotionEffectivenessReport({ promotion }: PromotionEffectivenessReportProps) {
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

      <div className="border border-gray-200 rounded-xl p-8 bg-white flex flex-col items-center text-center gap-2">
        <BarChart3 className="w-8 h-8 text-gray-300" />
        <p className="text-sm font-semibold text-gray-700">Chưa có báo cáo doanh thu/ROI theo ngày</p>
        <p className="text-xs text-gray-500 max-w-sm">
          Hệ thống báo cáo hiệu quả khuyến mãi (doanh thu tạo ra, chi phí giảm giá, ROI theo thời gian)
          chưa có endpoint dữ liệu thật. Sẽ bổ sung khi backend cung cấp báo cáo chuyên biệt.
        </p>
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
