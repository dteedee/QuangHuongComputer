import { Mail, MousePointerClick, AlertTriangle } from 'lucide-react';
import type { CustomerDetail } from '../../api/crm';
import { formatDateTime } from '../../api/crm';

/**
 * Customer 360 "Nhận email / opt-out" card.
 *
 * NOTE (honesty, no fabrication): CRM's backend has no global per-customer
 * consent/opt-out field or endpoint yet — only `EmailCampaignRecipient.
 * UnsubscribedAt` (per-campaign) exists (grepped `backend/Services/CRM/Domain`,
 * 2026-09-19). A toggle here would call nothing real, so this shows the real
 * aggregate signals instead (email open/click counts from `CustomerDetailDto`)
 * and states the gap plainly. Filed as an integration request for W2-8/CRM
 * backend to add a real opt-out field before this card can offer a toggle.
 */
export function Customer360ConsentCard({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">Tương tác email</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Mail size={14} className="text-gray-400" />
          Đã mở: <span className="font-medium text-gray-900">{customer.emailOpenCount}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MousePointerClick size={14} className="text-gray-400" />
          Đã click: <span className="font-medium text-gray-900">{customer.emailClickCount}</span>
        </div>
      </div>
      {customer.lastEmailOpenedAt && (
        <p className="text-xs text-gray-400 mt-2">Mở gần nhất: {formatDateTime(customer.lastEmailOpenedAt)}</p>
      )}
      <div className="mt-3 flex items-start gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg p-2">
        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
        <span>Hệ thống hiện chỉ theo dõi unsubscribe theo từng chiến dịch, chưa có cờ "từ chối nhận email" chung cho khách hàng. Chưa thể bật/tắt opt-out tại đây.</span>
      </div>
    </div>
  );
}
