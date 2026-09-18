/**
 * Status → tone/label maps shared by the quotation and instalment queues
 * (Architecture: kept inside `quotations/` so no glob is shared with any
 * other track — `installments/` imports from here too, both are this
 * track's own files). Colour is never the only channel — `StatusBadge`
 * always renders the dot + this Vietnamese label.
 */
import { createStatusMap } from '../../../../../components/ui/kit-utils';
import type { QuotationStatus } from '../../../../../api/sales/quotations';
import type { InstallmentStatus } from '../../../../../api/sales/installments-admin';

export const quotationStatusBadge = createStatusMap<QuotationStatus>({
  Draft: ['neutral', 'Nháp'],
  Sent: ['info', 'Đã gửi'],
  Accepted: ['success', 'Đã chấp nhận'],
  Rejected: ['danger', 'Bị từ chối'],
  Expired: ['warning', 'Hết hạn'],
  Converted: ['success', 'Đã chuyển đơn'],
});

export const installmentStatusBadge = createStatusMap<InstallmentStatus>({
  PendingApproval: ['warning', 'Chờ duyệt'],
  Approved: ['info', 'Đã duyệt'],
  Active: ['info', 'Đang trả góp'],
  Completed: ['success', 'Hoàn tất'],
  Rejected: ['danger', 'Bị từ chối'],
  Expired: ['neutral', 'Hết hạn giữ hàng'],
});
