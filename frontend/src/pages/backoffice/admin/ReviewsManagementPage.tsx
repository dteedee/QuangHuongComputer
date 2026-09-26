import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import {
  Card, CardBody, DataTable, Input, PageHeader, Pagination, Select, StatCard, notify,
} from '../../../components/ui';
import { usePrompt } from '../../../context/ConfirmContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import { catalogAdminApi } from '../../../api/catalog/admin';
import type { AdminReviewRow } from '../../../api/catalog/types';
import { queryKeys } from '../../../lib/query-keys';
import { normalizeApiError } from '../../../lib/api-error';
import { reviewManagementColumns } from './reviews/review-management-columns';
import { ReviewReplyDialog } from './reviews/review-reply-dialog';

type StatusFilter = 'pending' | 'approved' | 'all';
type RepliedFilter = '' | 'true' | 'false';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'all', label: 'Tất cả' },
];
const REPLIED_OPTIONS = [
  { value: '', label: 'Mọi trạng thái phản hồi' },
  { value: 'false', label: 'Chưa phản hồi' },
  { value: 'true', label: 'Đã phản hồi' },
];
const PAGE_SIZE = 20;

/**
 * Kiểm duyệt + phản hồi đánh giá sản phẩm, trên danh sách toàn hệ thống
 * `GET /catalog/reviews/admin/list` (lọc trạng thái duyệt, đã/chưa phản hồi, tìm theo nội dung).
 * Từ chối = xoá hẳn (backend không có trạng thái "đã từ chối"); phản hồi hiển thị công khai
 * dưới đánh giá với nhãn "Phản hồi từ Quang Hưởng".
 */
export function ReviewsManagementPage() {
  const queryClient = useQueryClient();
  const { promptText } = usePrompt();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.CATALOG_MANAGE);

  const [status, setStatus] = useState<StatusFilter>('pending');
  const [replied, setReplied] = useState<RepliedFilter>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [replyRow, setReplyRow] = useState<AdminReviewRow | null>(null);

  const params = {
    status, page, pageSize: PAGE_SIZE,
    replied: replied === '' ? undefined : replied === 'true',
    search: search.trim() || undefined,
  };
  const listQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'reviews-admin', ...params }),
    queryFn: () => catalogAdminApi.reviews.list(params),
    placeholderData: keepPreviousData,
  });
  const pendingCountQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'reviews-admin-pending-count' }),
    queryFn: () => catalogAdminApi.reviews.list({ status: 'pending', page: 1, pageSize: 1 }),
  });
  const sentimentQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'reviews-sentiment' }),
    queryFn: catalogAdminApi.reviews.sentiment,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });

  const run = async (label: string, work: () => Promise<unknown>) => {
    try { await work(); await refresh(); notify.success(label); }
    catch (error) { notify.error('Thao tác thất bại', { description: normalizeApiError(error).message }); }
  };

  const columns = useMemo(() => reviewManagementColumns({
    canManage,
    onApprove: (r) => void run('Đã duyệt đánh giá', () => catalogAdminApi.reviews.approve(r.review.id)),
    onReply: setReplyRow,
    onReject: async (r) => {
      const reason = await promptText({
        title: 'Từ chối đánh giá',
        message: `Nhập lý do để xác nhận. Máy chủ chưa lưu lý do, nên đánh giá "${r.review.title || r.review.comment.slice(0, 40)}" sẽ bị xoá hẳn và điểm trung bình được tính lại.`,
        required: true,
      });
      if (reason !== null) await run('Đã từ chối đánh giá', () => catalogAdminApi.reviews.reject(r.review.id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [canManage]);

  const sentiment = sentimentQuery.data;
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Đánh giá sản phẩm"
        description="Duyệt đánh giá của khách và phản hồi công khai với tư cách Quang Hưởng."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chờ duyệt" value={pendingCountQuery.data?.total ?? null} />
        <StatCard label="Tổng đánh giá" value={sentiment?.totalReviews ?? null} />
        <StatCard label="Tích cực" value={sentiment ? `${sentiment.positivePercent}%` : null} />
        <StatCard label="Tiêu cực" value={sentiment ? `${sentiment.negativePercent}%` : null} />
      </div>

      <Card padded>
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Trạng thái duyệt" options={STATUS_OPTIONS} value={status}
              onChange={(e) => resetPage(setStatus)(e.target.value as StatusFilter)} />
            <Select label="Phản hồi" options={REPLIED_OPTIONS} value={replied}
              onChange={(e) => resetPage(setReplied)(e.target.value as RepliedFilter)} />
            <Input label="Tìm theo nội dung" value={search} placeholder="Tiêu đề hoặc nội dung đánh giá"
              onChange={(e) => resetPage(setSearch)(e.target.value)} />
          </div>
          <DataTable
            caption="Danh sách đánh giá sản phẩm"
            columns={columns}
            rows={listQuery.data?.items}
            rowKey={(r) => r.review.id}
            loading={listQuery.isPending}
            error={listQuery.error}
            onRetry={() => void listQuery.refetch()}
            empty={{ icon: MessageSquare, title: 'Không có đánh giá nào khớp bộ lọc',
              action: { label: 'Xem tất cả', onClick: () => { setStatus('all'); setReplied(''); setSearch(''); setPage(1); } } }}
            pagination={(
              <Pagination page={page} pageSize={PAGE_SIZE} total={listQuery.data?.total ?? 0} onPageChange={setPage} />
            )}
          />
        </CardBody>
      </Card>

      {replyRow && (
        <ReviewReplyDialog row={replyRow} onClose={() => setReplyRow(null)} onChanged={() => void refresh()} />
      )}
    </div>
  );
}

export default ReviewsManagementPage;
