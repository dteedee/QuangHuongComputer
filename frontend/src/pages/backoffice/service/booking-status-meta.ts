import type { BookingStatus } from '../../../api/repair';

export const STATUS_LABEL: Record<BookingStatus, string> = {
    Pending: 'Chờ duyệt',
    Approved: 'Đã duyệt',
    Rejected: 'Đã từ chối',
    Converted: 'Đã chuyển phiếu sửa',
    NoShow: 'Khách không đến',
};

export const STATUS_CLS: Record<BookingStatus, string> = {
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-blue-100 text-blue-700',
    Rejected: 'bg-red-100 text-red-700',
    Converted: 'bg-emerald-100 text-emerald-700',
    NoShow: 'bg-gray-100 text-gray-600',
};

/** Ngày hẹn (yyyy-MM-dd, lưu theo ngày) đã tới chưa, so với hôm nay giờ Việt Nam — server kiểm lại. */
export const appointmentDayReached = (preferredDate: string) =>
    preferredDate.slice(0, 10) <= new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
