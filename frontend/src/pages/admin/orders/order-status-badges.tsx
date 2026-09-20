/**
 * Nhãn tiếng Việt + tone của `StatusBadge` dùng chung cho danh sách, kanban và
 * ngăn chi tiết. Một chỗ duy nhất để chữ không lệch giữa ba khung nhìn.
 *
 * design-guidelines §9.1: trạng thái nghiệp vụ đi qua `StatusBadge`, KHÔNG tự
 * chọn màu (bản cũ tự chọn màu Tailwind thô, đã bỏ).
 */
import { CheckCircle2, Clock, Package, Truck, XCircle } from 'lucide-react';
import type { OrderStatus, PaymentStatus } from '../../../api/sales/types';
import type { StatusTone } from '../../../components/ui';

export interface StatusVisual {
    tone: StatusTone;
    icon: React.ReactNode;
    label: string;
}

/** Enum backend -> [tone, nhãn]. Khai báo MỘT lần cho nghiệp vụ đơn hàng. */
const ORDER_STATUS: Record<string, StatusVisual> = {
    Draft: { tone: 'neutral', icon: <Clock size={14} />, label: 'Bản nháp' },
    Pending: { tone: 'warning', icon: <Clock size={14} />, label: 'Chờ xác nhận' },
    Confirmed: { tone: 'info', icon: <CheckCircle2 size={14} />, label: 'Đã xác nhận' },
    Paid: { tone: 'info', icon: <CheckCircle2 size={14} />, label: 'Đã thanh toán' },
    Fulfilled: { tone: 'info', icon: <Package size={14} />, label: 'Đã đóng gói' },
    Shipped: { tone: 'violet', icon: <Truck size={14} />, label: 'Đang giao' },
    Delivered: { tone: 'success', icon: <Package size={14} />, label: 'Đã giao' },
    Completed: { tone: 'success', icon: <CheckCircle2 size={14} />, label: 'Hoàn tất' },
    Cancelled: { tone: 'danger', icon: <XCircle size={14} />, label: 'Đã huỷ' },
};

export const getOrderStatusInfo = (status: string): StatusVisual =>
    ORDER_STATUS[status] ?? { tone: 'neutral', icon: <Clock size={14} />, label: status };

export const getPaymentStatusLabel = (status: PaymentStatus | string): string => {
    switch (status) {
        case 'Pending': return 'Chờ thanh toán';
        case 'PartiallyPaid': return 'Đã cọc một phần';
        case 'Processing': return 'Đang xử lý';
        case 'Paid': return 'Đã thanh toán';
        case 'Failed': return 'Thất bại';
        case 'Refunded': return 'Đã hoàn tiền';
        default: return status;
    }
};

/** Tone cho trạng thái thanh toán — chỉ dùng ở cột "Thanh toán" của danh sách. */
export const getPaymentStatusTone = (status: PaymentStatus | string): StatusTone => {
    switch (status) {
        case 'Paid': return 'success';
        case 'PartiallyPaid': return 'info';
        case 'Failed': return 'danger';
        case 'Refunded': return 'violet';
        default: return 'neutral';
    }
};

export const getChannelLabel = (channel?: string): string => {
    switch (channel) {
        case 'Web': return 'Website';
        case 'Pos': return 'Tại quầy';
        case 'Guest': return 'Khách vãng lai';
        case 'Quotation': return 'Báo giá';
        default: return channel || 'Website';
    }
};

/** Trạng thái không thể huỷ - đơn đã hoàn tất/kết thúc vòng đời (khớp OrderStateMachine). */
export const NON_CANCELLABLE_STATUSES: OrderStatus[] = ['Completed', 'Cancelled'];
