/** Cột của bảng quản lý đánh giá (back office). */
import { Check, MessageSquareReply, Star, X } from 'lucide-react';
import type { AdminReviewRow } from '../../../../api/catalog/types';
import { Button, RowActions, StatusBadge, type DataTableColumn } from '../../../../components/ui';
import { formatDateTime } from '../../../admin/products/admin-formatting';

export interface ReviewRowActions {
  canManage: boolean;
  onApprove: (row: AdminReviewRow) => void;
  onReject: (row: AdminReviewRow) => void;
  onReply: (row: AdminReviewRow) => void;
}

const Stars = ({ rating }: { rating: number }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} trên 5 sao`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={13} aria-hidden className={i < rating ? 'fill-current text-rating' : 'text-fg-subtle'} />
    ))}
  </span>
);

export function reviewManagementColumns(actions: ReviewRowActions): DataTableColumn<AdminReviewRow>[] {
  return [
    {
      id: 'product', header: 'Sản phẩm', locked: true, width: '16rem',
      cell: (r) => <span className="line-clamp-2 font-medium text-fg">{r.productName ?? '—'}</span>,
    },
    { id: 'rating', header: 'Sao', nowrap: true, cell: (r) => <Stars rating={r.review.rating} /> },
    {
      id: 'content', header: 'Nội dung',
      cell: (r) => (
        <div className="min-w-0">
          {r.review.title && <p className="font-medium text-fg">{r.review.title}</p>}
          <p className="line-clamp-2 text-fg-muted">{r.review.comment}</p>
          {(r.review.images?.length ?? 0) > 0 && (
            <span className="num text-2xs text-fg-subtle">{r.review.images!.length} ảnh</span>
          )}
        </div>
      ),
    },
    {
      id: 'status', header: 'Trạng thái', nowrap: true,
      cell: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={r.review.isApproved ? 'success' : 'warning'}>
            {r.review.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
          </StatusBadge>
          {r.review.reply && <StatusBadge tone="info">Đã phản hồi</StatusBadge>}
        </div>
      ),
    },
    {
      id: 'createdAt', header: 'Ngày gửi', nowrap: true,
      cell: (r) => <span className="num">{formatDateTime(r.review.createdAt)}</span>,
    },
    {
      id: 'actions', header: '', locked: true, align: 'right', width: '1%',
      cell: (r) => actions.canManage && (
        <RowActions>
          {!r.review.isApproved && (
            <Button size="sm" variant="outline" icon={Check} onClick={() => actions.onApprove(r)}>Duyệt</Button>
          )}
          <Button size="sm" variant="outline" icon={MessageSquareReply} onClick={() => actions.onReply(r)}>
            {r.review.reply ? 'Sửa phản hồi' : 'Phản hồi'}
          </Button>
          <Button size="sm" variant="ghost" icon={X} onClick={() => actions.onReject(r)}>
            {r.review.isApproved ? 'Gỡ' : 'Từ chối'}
          </Button>
        </RowActions>
      ),
    },
  ];
}
