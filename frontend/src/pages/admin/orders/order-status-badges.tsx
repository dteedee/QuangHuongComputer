/**
 * Vietnamese labels + badge classes shared by the list, kanban and detail
 * drawer (W3-10). Single place so the wording never drifts between views.
 */
import { CheckCircle2, Clock, Package, Truck, XCircle } from 'lucide-react';
import type { OrderStatus, PaymentStatus } from '../../../api/sales/types';

export interface StatusVisual {
    color: string;
    bg: string;
    icon: React.ReactNode;
    label: string;
}

export const getOrderStatusInfo = (status: string): StatusVisual => {
    switch (status) {
        case 'Draft': return { color: 'text-amber-500', bg: 'bg-amber-50', icon: <Clock size={16} />, label: 'Bản nháp' };
        case 'Pending': return { color: 'text-orange-500', bg: 'bg-orange-50', icon: <Clock size={16} />, label: 'Chờ xác nhận' };
        case 'Confirmed': return { color: 'text-blue-500', bg: 'bg-blue-50', icon: <CheckCircle2 size={16} />, label: 'Đã xác nhận' };
        case 'Paid': return { color: 'text-indigo-500', bg: 'bg-indigo-50', icon: <CheckCircle2 size={16} />, label: 'Đã thanh toán' };
        case 'Fulfilled': return { color: 'text-cyan-600', bg: 'bg-cyan-50', icon: <Package size={16} />, label: 'Đã đóng gói' };
        case 'Shipped': return { color: 'text-purple-500', bg: 'bg-purple-50', icon: <Truck size={16} />, label: 'Đang giao' };
        case 'Delivered': return { color: 'text-emerald-500', bg: 'bg-emerald-50', icon: <Package size={16} />, label: 'Đã giao' };
        case 'Completed': return { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <CheckCircle2 size={16} />, label: 'Hoàn tất' };
        case 'Cancelled': return { color: 'text-rose-500', bg: 'bg-rose-50', icon: <XCircle size={16} />, label: 'Đã hủy' };
        default: return { color: 'text-gray-500', bg: 'bg-gray-50', icon: <Clock size={16} />, label: status };
    }
};

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
