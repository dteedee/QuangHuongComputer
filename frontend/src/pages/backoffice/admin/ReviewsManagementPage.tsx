import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageSquare, Star, X } from 'lucide-react';
import {
  Badge, Button, Card, CardBody, Combobox, PageHeader, QueryBoundary, Select, SkeletonText,
  StatCard, StatusBadge, Tab, TabList, TabPanel, Tabs, notify,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { usePrompt } from '../../../context/ConfirmContext';
import { PERMISSIONS } from '../../../constants/permissions';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { queryKeys } from '../../../lib/query-keys';
import { formatDateTime } from '../../admin/products/admin-formatting';

const RATINGS = [
  { value: '', label: 'Mọi số sao' },
  ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} sao` })),
];

const Stars = ({ rating }: { rating: number }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} trên 5 sao`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={13} className={i < rating ? 'fill-warning text-warning' : 'text-fg-subtle'} aria-hidden />
    ))}
  </span>
);

/**
 * Kiểm duyệt đánh giá sản phẩm.
 *
 * Backend chỉ có 3 mặt (catalog.md §9): hàng chờ duyệt (toàn hệ thống), duyệt,
 * và từ chối = XOÁ HẲN. Không có trạng thái "đã từ chối" để liệt kê lại, cũng
 * chưa có endpoint liệt kê đánh giá đã duyệt theo toàn hệ thống — nên tab
 * "Đã duyệt" làm việc theo TỪNG sản phẩm qua
 * `GET /products/{id}/reviews?approvedOnly=false` (chỉ nhân viên được bỏ lọc).
 * Hai khoảng hở này đã ghi vào `integration-requests-w3.md`, không bịa UI thay thế.
 */
export function ReviewsManagementPage() {
  const queryClient = useQueryClient();
  const { promptText } = usePrompt();
  const [tab, setTab] = useState('pending');
  const [productFilter, setProductFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [approvedProductId, setApprovedProductId] = useState('');

  const pendingQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'reviews-pending' }),
    queryFn: catalogAdminApi.reviews.listPending,
  });
  const sentimentQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'reviews-sentiment' }),
    queryFn: catalogAdminApi.reviews.sentiment,
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'products-for-reviews' }),
    queryFn: () => catalogAdminApi.listProducts({ pageSize: 100 }),
  });
  const approvedQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'reviews-of-product', id: approvedProductId }),
    queryFn: () => catalogAdminApi.reviews.listForProduct(approvedProductId),
    enabled: tab === 'approved' && Boolean(approvedProductId),
  });

  const productOptions = useMemo(
    () => (productsQuery.data?.products ?? []).map((p) => ({ value: p.id, label: p.name })),
    [productsQuery.data],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });

  const run = async (label: string, work: () => Promise<unknown>) => {
    try { await work(); refresh(); notify.success(label); }
    catch (error) { notify.error('Thao tác thất bại', { description: (error as Error).message }); }
  };

  const reject = async (id: string, what: string) => {
    const reason = await promptText({
      title: 'Từ chối đánh giá',
      message: `Nhập lý do từ chối "${what}" để xác nhận. Máy chủ CHƯA lưu được lý do (không có trạng thái "đã từ chối"), nên đánh giá sẽ bị xoá hẳn và điểm trung bình được tính lại.`,
      required: true,
    });
    if (reason === null) return;
    await run('Đã từ chối đánh giá', () => catalogAdminApi.reviews.reject(id));
  };

  const pending = useMemo(() => {
    const rows = pendingQuery.data ?? [];
    return rows.filter(
      (r) => (!productFilter || r.productId === productFilter) && (!ratingFilter || r.rating === Number(ratingFilter)),
    );
  }, [pendingQuery.data, productFilter, ratingFilter]);

  const sentiment = sentimentQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Đánh giá sản phẩm"
        description="Duyệt đánh giá của khách trước khi hiển thị trên cửa hàng."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chờ duyệt" value={pendingQuery.data?.length ?? null} />
        <StatCard label="Tổng đánh giá" value={sentiment?.totalReviews ?? null} />
        <StatCard label="Tích cực" value={sentiment ? `${sentiment.positivePercent}%` : null} />
        <StatCard label="Tiêu cực" value={sentiment ? `${sentiment.negativePercent}%` : null} />
      </div>

      <Card padded>
        <CardBody className="space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabList aria-label="Trạng thái đánh giá">
              <Tab value="pending" count={pendingQuery.data?.length}>Chờ duyệt</Tab>
              <Tab value="approved">Đã duyệt</Tab>
            </TabList>

            <TabPanel value="pending">
              <div className="mb-4 grid max-w-2xl gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-13 font-medium text-fg" htmlFor="review-product-filter">
                    Sản phẩm
                  </label>
                  <Combobox
                    id="review-product-filter"
                    options={[{ value: '', label: 'Mọi sản phẩm' }, ...productOptions]}
                    value={productFilter}
                    onChange={setProductFilter}
                    placeholder="Lọc theo sản phẩm"
                  />
                </div>
                <Select
                  label="Số sao"
                  options={RATINGS}
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                />
              </div>
              <QueryBoundary
                query={pendingQuery}
                skeleton={<SkeletonText lines={6} />}
                isEmpty={() => pending.length === 0}
                errorTitle="Không tải được hàng chờ duyệt"
                empty={{
                  icon: MessageSquare,
                  title: productFilter || ratingFilter ? 'Không có đánh giá nào khớp bộ lọc' : 'Không còn đánh giá nào chờ duyệt',
                  description: 'Đánh giá mới của khách sẽ xuất hiện ở đây.',
                  secondaryAction: { label: 'Xoá bộ lọc', onClick: () => { setProductFilter(''); setRatingFilter(''); } },
                }}
              >
                {() => (
                  <ul className="space-y-3">
                    {pending.map((r) => (
                      <li key={r.id} className="rounded-xl border border-line p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-13 font-semibold text-fg">{r.productName}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Stars rating={r.rating} />
                              {r.isVerifiedPurchase && <Badge variant="success">Đã mua hàng</Badge>}
                              <span className="num text-xs text-fg-subtle">{formatDateTime(r.createdAt)}</span>
                            </div>
                          </div>
                          <Can permission={PERMISSIONS.CATALOG_MANAGE}>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="primary" onClick={() => void run('Đã duyệt đánh giá', () => catalogAdminApi.reviews.approve(r.id))}>
                                <Check size={15} /> Duyệt
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => void reject(r.id, r.title || r.comment.slice(0, 40))}>
                                <X size={15} /> Từ chối
                              </Button>
                            </div>
                          </Can>
                        </div>
                        {r.title && <p className="mt-2 text-13 font-medium text-fg">{r.title}</p>}
                        <p className="mt-1 whitespace-pre-line text-13 text-fg-muted">{r.comment}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </QueryBoundary>
            </TabPanel>

            <TabPanel value="approved">
              <div className="mb-4">
                <label className="mb-1.5 block text-13 font-medium text-fg" htmlFor="approved-product">
                  Sản phẩm
                </label>
                <Combobox
                  id="approved-product"
                  options={productOptions}
                  value={approvedProductId}
                  onChange={setApprovedProductId}
                  placeholder="Chọn sản phẩm để xem đánh giá"
                  className="max-w-md"
                />
                <p className="mt-1.5 text-xs text-fg-subtle">
                  Máy chủ chỉ liệt kê đánh giá theo từng sản phẩm — hãy chọn một sản phẩm.
                </p>
              </div>
              {!approvedProductId ? (
                <p className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-13 text-fg-muted">
                  Chọn một sản phẩm ở trên để xem toàn bộ đánh giá của sản phẩm đó.
                </p>
              ) : (
                <QueryBoundary
                  query={approvedQuery}
                  skeleton={<SkeletonText lines={5} />}
                  isEmpty={(rows) => rows.length === 0}
                  errorTitle="Không tải được đánh giá của sản phẩm"
                  empty={{ icon: MessageSquare, title: 'Sản phẩm này chưa có đánh giá nào' }}
                >
                  {(rows) => (
                    <ul className="space-y-3">
                      {rows.map((r) => (
                        <li key={r.id} className="rounded-xl border border-line p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Stars rating={r.rating} />
                              <StatusBadge tone={r.isApproved ? 'success' : 'warning'}>
                                {r.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                              </StatusBadge>
                              <span className="num text-xs text-fg-subtle">{formatDateTime(r.createdAt)}</span>
                            </div>
                            <Can permission={PERMISSIONS.CATALOG_MANAGE}>
                              <div className="flex items-center gap-2">
                                {!r.isApproved && (
                                  <Button size="sm" variant="primary" onClick={() => void run('Đã duyệt đánh giá', () => catalogAdminApi.reviews.approve(r.id))}>
                                    <Check size={15} /> Duyệt
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => void reject(r.id, r.title || r.comment.slice(0, 40))}>
                                  <X size={15} /> Gỡ đánh giá
                                </Button>
                              </div>
                            </Can>
                          </div>
                          {r.title && <p className="mt-2 text-13 font-medium text-fg">{r.title}</p>}
                          <p className="mt-1 whitespace-pre-line text-13 text-fg-muted">{r.comment}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </QueryBoundary>
              )}
            </TabPanel>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
}

export default ReviewsManagementPage;
