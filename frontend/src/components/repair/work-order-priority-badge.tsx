import { StatusBadge } from '../ui';
import {
    WORK_ORDER_PRIORITY_LABELS, WORK_ORDER_PRIORITY_TONE, type WorkOrderPriority,
} from '../../api/repair/work-order-priority';

/** Priority chip for lists/cards. "Bình thường" is the default and stays hidden to keep lists calm. */
export function WorkOrderPriorityBadge({ priority }: { priority?: WorkOrderPriority | null }) {
    if (!priority || priority === 'Normal') return null;
    return <StatusBadge tone={WORK_ORDER_PRIORITY_TONE[priority]}>{WORK_ORDER_PRIORITY_LABELS[priority]}</StatusBadge>;
}
