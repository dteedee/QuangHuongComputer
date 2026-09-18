/**
 * Quotation list — status tabs, filters, paging, "expiring in 48h"
 * highlight (Implementation Steps #1). Contract §2 `GET /sales/quotations`.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, AlertTriangle } from 'lucide-react';
import { PageHeader, Button, DataTable, StatusBadge, Tabs, TabList, Tab, Input, Pagination, type DataTableColumn } from '../../../components/ui';
import { quotationsApi, type QuotationListItemDto, type QuotationStatus } from '../../../api/sales/quotations';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import { paths } from '../../../routes';
import { quotationStatusBadge } from './components/b2b/document-status-badge';

type TabKey = 'all' | QuotationStatus;
const TABS: [TabKey, string][] = [
  ['all', 'Tất cả'], ['Draft', 'Nháp'], ['Sent', 'Đã gửi'], ['Accepted', 'Đã chấp nhận'],
  ['Converted', 'Đã chuyển đơn'], ['Rejected', 'Từ chối'], ['Expired', 'Hết hạn'],
];

const isExpiringSoon = (q: QuotationListItemDto) => {
  if (!q.validUntil || (q.status !== 'Draft' && q.status !== 'Sent')) return false;
  const ms = new Date(q.validUntil).getTime() - Date.now();
  return ms > 0 && ms < 48 * 60 * 60 * 1000;
};

export default function QuotationListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PERMISSIONS.SALES_QUOTATIONS_CREATE);

  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const query = useQuery({
    queryKey: ['quotations', tab, search, page],
    queryFn: () => quotationsApi.list({ status: tab === 'all' ? undefined : tab, page, pageSize }),
  });

  // Contract §2 `GET /sales/quotations` has no free-text `search` param (only
  // status/customerId/validAfter/validBefore/createdBy) — filters the current
  // page client-side rather than pretending server-side search exists. Filed
  // as an integration request for a real `search` param.
  const rows = (query.data?.items ?? []).filter((q) =>
    !search.trim() || q.quotationNumber.toLowerCase().includes(search.toLowerCase()) || (q.customerName ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const columns: DataTableColumn<QuotationListItemDto>[] = [
    {
      id: 'quotationNumber', header: 'Số báo giá', locked: true,
      cell: (r) => (
        <span className="flex items-center gap-1.5 num">
          {isExpiringSoon(r) && <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-label="Sắp hết hạn trong 48 giờ" />}
          {r.quotationNumber}
        </span>
      ),
    },
    { id: 'customerName', header: 'Khách hàng', cell: (r) => r.customerName ?? '—' },
    { id: 'total', header: 'Tổng tiền', align: 'right', cell: (r) => <span className="num">{r.totalAmount.toLocaleString('vi-VN')}đ</span> },
    { id: 'validUntil', header: 'Hiệu lực đến', cell: (r) => r.validUntil ? new Date(r.validUntil).toLocaleDateString('vi-VN') : '—' },
    { id: 'status', header: 'Trạng thái', cell: (r) => <StatusBadge {...quotationStatusBadge(r.status)} /> },
    { id: 'createdBy', header: 'Người tạo', defaultHidden: true, cell: (r) => r.createdBy ?? '—' },
  ];

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <PageHeader
        title="Báo giá B2B" description="Báo giá cho khách doanh nghiệp/đơn vị ngân sách, có thể chuyển thành đơn hàng."
        actions={canCreate && (
          <Button onClick={() => navigate(paths.backoffice.quotationNew())}><Plus className="mr-1.5 h-4 w-4" /> Tạo báo giá</Button>
        )}
      >
        <Tabs value={tab} onValueChange={(v) => { setTab(v as TabKey); setPage(1); }}>
          <TabList>
            {TABS.map(([key, label]) => <Tab key={key} value={key}>{label}</Tab>)}
          </TabList>
        </Tabs>
      </PageHeader>

      <Input placeholder="Tìm theo số báo giá hoặc tên khách..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <DataTable
        caption="Danh sách báo giá"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={query.isPending}
        error={query.error ?? undefined}
        onRetry={query.refetch}
        onRowClick={(r) => navigate(paths.backoffice.quotationDetail(r.id))}
        empty={{
          title: search || tab !== 'all' ? 'Không có báo giá phù hợp' : 'Chưa có báo giá nào',
          action: canCreate ? { label: 'Tạo báo giá', onClick: () => navigate(paths.backoffice.quotationNew()) } : undefined,
        }}
        pagination={<Pagination page={page} pageSize={pageSize} total={query.data?.totalCount ?? 0} onPageChange={setPage} />}
      />
    </div>
  );
}
