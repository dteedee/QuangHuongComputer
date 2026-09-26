/** Steps of the transfer timeline, derived from the detail's timestamps (pure, unit-tested). */
import type { TransferDetail } from '../../../../api/inventory-transfers';

export interface TransferTimelineStep {
    label: string;
    at?: string | null;
    by?: string | null;
    tone: 'done' | 'todo' | 'cancelled';
}

export function transferTimelineSteps(t: TransferDetail): TransferTimelineStep[] {
    const step = (label: string, at?: string | null, by?: string | null): TransferTimelineStep =>
        ({ label, at, by, tone: at ? 'done' : 'todo' });
    const steps = [step('Lập phiếu', t.requestedAt, t.requestedBy)];
    if (t.status === 'Cancelled') {
        if (t.approvedAt) steps.push(step('Duyệt', t.approvedAt, t.approvedBy));
        steps.push({ label: 'Huỷ phiếu', at: t.cancelledAt, by: t.cancelledBy, tone: 'cancelled' });
        return steps;
    }
    steps.push(
        step('Duyệt', t.approvedAt, t.approvedBy),
        step('Xuất kho', t.shippedAt, t.shippedBy),
        step(t.hasDiscrepancy ? 'Nhận hàng (thiếu)' : 'Nhận hàng', t.receivedAt, t.receivedBy),
    );
    return steps;
}
