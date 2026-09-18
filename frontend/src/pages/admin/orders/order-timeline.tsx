/**
 * Lịch sử đơn hàng từ `OrderHistories` — mỗi thao tác (chuyển trạng thái,
 * huỷ, thu tiền, ghi chú) phải hiện ở đây (Success Criteria của phase file).
 */
import { History } from 'lucide-react';
import type { OrderDetailHistoryEntry } from '../../../api/sales/types';
import { getOrderStatusInfo } from './order-status-badges';

const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });

export const OrderTimeline = ({ history }: { history: OrderDetailHistoryEntry[] }) => {
    if (history.length === 0) {
        return <p className="text-xs font-semibold text-gray-400 uppercase">Chưa có lịch sử thao tác.</p>;
    }

    return (
        <ol className="space-y-4">
            {history.map((entry, idx) => {
                const status = getOrderStatusInfo(entry.toStatus);
                return (
                    <li key={entry.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${status.bg} ${status.color}`}>
                                {status.icon}
                            </span>
                            {idx < history.length - 1 && <span className="flex-1 w-px bg-gray-100 dark:bg-gray-800 mt-1" />}
                        </div>
                        <div className="pb-4 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {entry.fromStatus ? `${getOrderStatusInfo(entry.fromStatus).label} → ` : ''}{status.label}
                            </p>
                            <p className="text-[11px] font-semibold text-gray-400 uppercase mt-0.5">{formatDateTime(entry.createdAt)}{entry.changedBy ? ` · ${entry.changedBy}` : ''}</p>
                            {entry.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic flex items-start gap-1"><History size={12} className="mt-0.5 shrink-0" />{entry.notes}</p>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};
