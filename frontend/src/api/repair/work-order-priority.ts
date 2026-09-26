/** Work-order priority set at intake (`WorkOrderPriority` on the backend). */
export type WorkOrderPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export const WORK_ORDER_PRIORITIES: WorkOrderPriority[] = ['Low', 'Normal', 'High', 'Urgent'];

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
    Low: 'Thấp',
    Normal: 'Bình thường',
    High: 'Cao',
    Urgent: 'Gấp',
};

/** StatusBadge tone per priority — colour is never the only channel (label always shown). */
export const WORK_ORDER_PRIORITY_TONE: Record<WorkOrderPriority, 'neutral' | 'info' | 'warning' | 'danger'> = {
    Low: 'neutral',
    Normal: 'info',
    High: 'warning',
    Urgent: 'danger',
};
