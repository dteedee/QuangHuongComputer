/**
 * Kitchen sink — data + state primitives. TEMPORARY (removed at the W3 gate).
 */
import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import {
  Button,
  DataTable,
  Pagination,
  Money,
  StatusBadge,
  RowActions,
  IconButton,
  Skeleton,
  SkeletonText,
  EmptyState,
  ErrorState,
  QueryBoundary,
  type DataTableColumn,
  type SortState,
} from '../../components/ui';

interface DemoOrder {
  id: string;
  code: string;
  customer: string;
  total: number;
  status: 'done' | 'pending' | 'cancelled';
}

const ROWS: DemoOrder[] = [
  { id: '1', code: 'QH-260918-001', customer: 'Nguyễn Văn Bình', total: 27599000, status: 'done' },
  { id: '2', code: 'QH-260918-002', customer: 'Trần Thị Mỹ Duyên', total: 1290000, status: 'pending' },
  { id: '3', code: 'QH-260918-003', customer: 'Lê Hoàng Phúc', total: 580000, status: 'cancelled' },
];

const STATUS = {
  done: { tone: 'success', label: 'Hoàn tất' },
  pending: { tone: 'warning', label: 'Chờ xử lý' },
  cancelled: { tone: 'danger', label: 'Đã huỷ' },
} as const;

const columns: DataTableColumn<DemoOrder>[] = [
  { id: 'code', header: 'Mã đơn', cell: (r) => <span className="num font-medium">{r.code}</span>, sortable: true, locked: true },
  { id: 'customer', header: 'Khách hàng', cell: (r) => r.customer, nowrap: false },
  { id: 'total', header: 'Tổng tiền', align: 'right', sortable: true, cell: (r) => <Money value={r.total} /> },
  {
    id: 'status',
    header: 'Trạng thái',
    cell: (r) => <StatusBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusBadge>,
  },
  { id: 'note', header: 'Ghi chú', defaultHidden: true, cell: () => '—' },
  {
    id: 'actions',
    header: '',
    width: '1%',
    locked: true,
    align: 'right',
    cell: () => (
      <RowActions>
        <IconButton aria-label="Xoá đơn" size="sm" variant="danger"><Trash2 size={15} /></IconButton>
      </RowActions>
    ),
  },
];

export const KitchenSinkData = () => {
  const [sort, setSort] = useState<SortState | null>({ id: 'code', dir: 'asc' });
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {(['data', 'loading', 'empty', 'error'] as const).map((m) => (
          <Button key={m} size="sm" variant={mode === m ? 'primary' : 'outline'} onClick={() => setMode(m)}>
            {m}
          </Button>
        ))}
      </div>

      <DataTable<DemoOrder>
        caption="Đơn hàng mẫu"
        columns={columns}
        rows={mode === 'data' ? ROWS : mode === 'empty' ? [] : undefined}
        rowKey={(r) => r.id}
        loading={mode === 'loading'}
        error={mode === 'error' ? new Error('500 Internal Server Error') : undefined}
        onRetry={() => setMode('data')}
        sort={sort}
        onSortChange={setSort}
        selectedIds={selected}
        onSelectionChange={setSelected}
        enableColumnVisibility
        empty={{ title: 'Chưa có đơn hàng nào', description: 'Đơn mới sẽ hiện ở đây.', action: { label: 'Tạo đơn', onClick: () => {}, icon: Plus } }}
        bulkActions={(ids) => (
          <Button size="sm" variant="danger" icon={Trash2}>
            Xoá {ids.length} đơn
          </Button>
        )}
        pagination={
          <Pagination page={page} pageSize={20} total={137} onPageChange={setPage} onPageSizeChange={() => {}} />
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[.02em] text-fg-subtle">Skeleton</p>
          <Skeleton className="h-24 w-full" />
          <SkeletonText lines={3} />
        </div>
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description="Thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác."
          secondaryAction={{ label: 'Xoá bộ lọc', onClick: () => {} }}
        />
        <ErrorState error={new Error('Network Error')} onRetry={() => {}} />
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-[.02em] text-fg-subtle">
          QueryBoundary — skeleton / lỗi / rỗng / dữ liệu từ một TanStack query
        </p>
        <QueryBoundary
          query={{
            data: mode === 'data' ? ROWS : mode === 'empty' ? [] : undefined,
            isPending: mode === 'loading',
            isError: mode === 'error',
            error: new Error('Không kết nối được'),
            refetch: () => setMode('data'),
          }}
          isEmpty={(rows) => rows.length === 0}
          empty={{ title: 'Không có dữ liệu' }}
          skeleton={<SkeletonText lines={4} />}
        >
          {(rows) => <p className="text-sm text-fg-muted">Đã tải {rows.length} dòng.</p>}
        </QueryBoundary>
      </div>
    </section>
  );
};

export default KitchenSinkData;
