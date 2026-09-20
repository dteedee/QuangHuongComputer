/**
 * Lịch sử đơn hàng từ `OrderHistories` — mỗi thao tác (chuyển trạng thái,
 * huỷ, thu tiền, ghi chú) phải hiện ở đây (Success Criteria của phase file).
 */
import { History } from 'lucide-react';
import { StatusBadge } from '../../../components/ui';
import type { OrderDetailHistoryEntry } from '../../../api/sales/types';
import { getOrderStatusInfo } from './order-status-badges';

const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });

export const OrderTimeline = ({ history }: { history: OrderDetailHistoryEntry[] }) => {
    if (history.length === 0) {
        return <p className="text-13 text-fg-muted">Chưa có lịch sử thao tác.</p>;
    }

    return (
        <ol className="flex flex-col gap-3">
            {history.map((entry, idx) => {
                const status = getOrderStatusInfo(entry.toStatus);
                return (
                    <li key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center pt-0.5">
                            <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-fg-subtle" aria-hidden />
                            {idx < history.length - 1 && <span className="mt-1 w-px flex-1 bg-line" aria-hidden />}
                        </div>
                        <div className="flex-1 pb-3">
                            <p className="flex flex-wrap items-center gap-1.5 text-13 text-fg">
                                {entry.fromStatus && (
                                    <>
                                        <span className="text-fg-muted">{getOrderStatusInfo(entry.fromStatus).label}</span>
                                        <span aria-hidden className="text-fg-subtle">→</span>
                                    </>
                                )}
                                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            </p>
                            <p className="mt-0.5 text-2xs text-fg-subtle">
                                {formatDateTime(entry.createdAt)}{entry.changedBy ? ` · ${entry.changedBy}` : ''}
                            </p>
                            {entry.notes && (
                                <p className="mt-1 flex items-start gap-1 text-xs text-fg-muted">
                                    <History size={12} aria-hidden className="mt-0.5 shrink-0" />
                                    {entry.notes}
                                </p>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};
