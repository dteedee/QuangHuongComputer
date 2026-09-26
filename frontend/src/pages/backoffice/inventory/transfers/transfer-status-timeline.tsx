/**
 * Vertical status timeline of a transfer: Lập phiếu → Duyệt → Xuất kho → Nhận hàng (or Huỷ).
 * A step that has not happened yet is shown muted, so staff see what is still pending.
 */
import { Check, Circle, X } from 'lucide-react';
import type { TransferDetail } from '../../../../api/inventory-transfers';
import { transferTimelineSteps } from './transfer-timeline-steps';
import { formatPrintDate } from '../../../../components/print/print-date';
import { cn } from '../../../../lib/utils';

export function TransferStatusTimeline({ transfer }: { transfer: TransferDetail }) {
    const steps = transferTimelineSteps(transfer);
    return (
        <ol aria-label="Tiến trình phiếu chuyển kho" className="space-y-3">
            {steps.map((s) => {
                const Icon = s.tone === 'cancelled' ? X : s.tone === 'done' ? Check : Circle;
                return (
                    <li key={s.label} className="flex gap-3">
                        <span
                            className={cn(
                                'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                                s.tone === 'done' && 'bg-success-subtle text-success',
                                s.tone === 'todo' && 'bg-sunken text-fg-subtle',
                                s.tone === 'cancelled' && 'bg-danger-subtle text-danger',
                            )}
                            aria-hidden
                        >
                            <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                            <p className={cn('text-13 font-medium', s.tone === 'todo' ? 'text-fg-subtle' : 'text-fg')}>{s.label}</p>
                            <p className="text-2xs text-fg-muted">
                                {s.at ? <span className="num">{formatPrintDate(s.at, true)}</span> : 'Chưa thực hiện'}
                                {s.by ? ` · ${s.by}` : ''}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
