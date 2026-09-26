import { createStatusMap } from '../ui';

/** Trạng thái hoa hồng -> [tone, nhãn]. Khai báo một lần, dùng cho sổ hoa hồng và "của tôi". */
export const commissionStatus = createStatusMap({
    Pending: ['warning', 'Chờ duyệt'],
    Approved: ['info', 'Đã duyệt'],
    Paid: ['success', 'Đã trả'],
    Reversed: ['neutral', 'Đã huỷ'],
});

/** Nguồn phát sinh -> nhãn ngắn. */
export function commissionSourceLabel(sourceType: string): string {
    if (sourceType === 'RepairWorkOrder') return 'Phiếu sửa';
    if (sourceType === 'RepairWorkOrderClawback') return 'Thu hồi';
    return sourceType;
}
