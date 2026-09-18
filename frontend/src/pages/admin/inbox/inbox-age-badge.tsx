import { Badge } from '../../../components/ui';
import { ContactMessageStatus } from '../../../api/content/inbox';
import { computeDeadline, formatAge } from './inbox-status';

interface InboxAgeBadgeProps {
  createdAt: string;
  status: ContactMessageStatus;
}

/** Neutral once replied/archived — an answered message isn't "quá hạn" any
 *  more even if the reply itself came late; danger only while still open. */
export function InboxAgeBadge({ createdAt, status }: InboxAgeBadgeProps) {
  const closed = status === ContactMessageStatus.Replied || status === ContactMessageStatus.Archived;
  const { isOverdue } = computeDeadline(createdAt);
  const overdue = !closed && isOverdue;

  return (
    <Badge variant={overdue ? 'danger' : 'neutral'} title={overdue ? 'Đã quá 03 ngày làm việc chưa xác nhận tiếp nhận' : undefined}>
      {formatAge(createdAt)}
    </Badge>
  );
}
