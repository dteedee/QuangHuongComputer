import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Link as LinkIcon, Plus, Search, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, CardBody, DataTable, Input, PageHeader, Pagination, Select, notify, type SortState,
} from '../../../components/ui';
import { useConfirm } from '../../../context/ConfirmContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useDebounce } from '../../../hooks/useDebounce';
import { PERMISSIONS } from '../../../constants/permissions';
import { paths } from '../../../routes';
import { queryKeys } from '../../../lib/query-keys';
import { normalizeApiError } from '../../../lib/api-error';
import {
  urlRedirectsApi, type UrlRedirect, type UrlRedirectStatusCode, type UrlRedirectWriteDto,
} from '../../../api/content/url-redirects';
import { buildUrlRedirectColumns } from './url-redirect-columns';
import { UrlRedirectFormDialog } from './url-redirect-form-dialog';
import { UrlRedirectTestBox } from './url-redirect-test-box';
import { downloadBlob } from './url-redirect-schema';

const PAGE_SIZE = 20;
const STATUS_FILTER = [
  { value: 'all', label: 'Mọi mã' }, { value: '301', label: '301' }, { value: '302', label: '302' }, { value: '410', label: '410' },
];
const ACTIVE_FILTER = [
  { value: 'all', label: 'Bật & tắt' }, { value: 'true', label: 'Đang bật' }, { value: 'false', label: 'Đang tắt' },
];

/**
 * Quản lý chuyển hướng URL (301/302/410): giữ thứ hạng Google khi chuyển từ web cũ hoặc đổi
 * slug. SEO shell trả mã HTTP thật trước khi render trang (docs/seo-shell.md).
 */
export function UrlRedirectsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.CONTENT_MANAGE_REDIRECTS);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [active, setActive] = useState('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>({ id: 'createdAt', dir: 'desc' });
  const [editing, setEditing] = useState<UrlRedirect | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const term = useDebounce(search.trim(), 300);

  const filters = {
    resource: 'redirects', page, pageSize: PAGE_SIZE, search: term || undefined,
    statusCode: status === 'all' ? undefined : (Number(status) as UrlRedirectStatusCode),
    isActive: active === 'all' ? undefined : active === 'true',
    sortBy: sort?.id, sortDir: sort?.dir,
  };
  const query = useQuery({
    queryKey: queryKeys.content.list(filters),
    queryFn: () => urlRedirectsApi.list(filters),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.content.lists() });

  const save = useMutation({
    mutationFn: (dto: UrlRedirectWriteDto) => (editing ? urlRedirectsApi.update(editing.id, dto) : urlRedirectsApi.create(dto)),
    onSuccess: () => { refresh(); notify.success(editing ? 'Đã lưu chuyển hướng' : 'Đã thêm chuyển hướng'); },
  });

  const run = async (label: string, work: () => Promise<unknown>) => {
    try { await work(); refresh(); notify.success(label); }
    catch (error) { notify.error('Thao tác thất bại', { description: normalizeApiError(error).message }); }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const exportCsv = () => run('Đã xuất tệp CSV', async () =>
    downloadBlob(await urlRedirectsApi.exportCsv(), `chuyen-huong-url-${new Date().toISOString().slice(0, 10)}.csv`));

  const columns = buildUrlRedirectColumns({
    canManage,
    onEdit: (r) => { setEditing(r); setDialogOpen(true); },
    onToggle: (r, on) => void run(on ? 'Đã bật chuyển hướng' : 'Đã tắt chuyển hướng', () => urlRedirectsApi.setActive(r.id, on)),
    onDelete: async (r) => {
      const ok = await confirm({
        title: 'Xoá chuyển hướng?',
        message: `${r.fromPath} sẽ không còn chuyển hướng. Nếu Google vẫn giữ link cũ, khách sẽ gặp trang 404.`,
        confirmText: 'Xoá',
      });
      if (ok) await run('Đã xoá chuyển hướng', () => urlRedirectsApi.remove(r.id));
    },
  });

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chuyển hướng URL"
        description="301/302/410 cho link cũ — giữ thứ hạng Google khi chuyển web hoặc đổi slug."
        actions={
          <>
            <Button variant="outline" size="sm" icon={Download} onClick={() => void exportCsv()}>Xuất CSV</Button>
            {canManage && (
              <>
                <Button variant="outline" size="sm" icon={Upload} onClick={() => navigate(paths.backoffice.urlRedirectsImport())}>Nhập CSV</Button>
                <Button size="sm" icon={Plus} onClick={openCreate}>Thêm chuyển hướng</Button>
              </>
            )}
          </>
        }
      />

      <Card padded><CardBody><UrlRedirectTestBox /></CardBody></Card>

      <Card padded>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Tìm đường dẫn" icon={Search} inputSize="sm" placeholder="/duong-dan hoặc đích"
              value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} wrapperClassName="min-w-[14rem] flex-1"
            />
            <Select label="Mã" options={STATUS_FILTER} value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className="w-36" />
            <Select label="Trạng thái" options={ACTIVE_FILTER} value={active} onChange={(e) => resetPage(setActive)(e.target.value)} className="w-40" />
          </div>
          <DataTable
            caption="Danh sách chuyển hướng URL"
            columns={columns}
            rows={query.data?.items}
            rowKey={(r) => r.id}
            loading={query.isPending}
            error={query.error}
            onRetry={() => query.refetch()}
            sort={sort}
            onSortChange={(s) => { setSort(s); setPage(1); }}
            enableColumnVisibility
            empty={{
              icon: LinkIcon,
              title: term || status !== 'all' || active !== 'all' ? 'Không có chuyển hướng nào khớp' : 'Chưa có chuyển hướng nào',
              description: 'Thêm từng dòng hoặc nhập CSV danh sách link của web cũ.',
              ...(canManage ? { action: { label: 'Thêm chuyển hướng', onClick: openCreate } } : {}),
            }}
            pagination={
              <Pagination page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPageChange={setPage} />
            }
          />
        </CardBody>
      </Card>

      <UrlRedirectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={async (dto) => { await save.mutateAsync(dto); }}
      />
    </div>
  );
}

export default UrlRedirectsPage;
