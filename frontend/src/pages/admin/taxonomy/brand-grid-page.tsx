import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus, Power, Search, Tag, Trash2 } from 'lucide-react';
import {
  Badge, Button, Card, CardBody, DataTable, IconButton, Img, Input, PageHeader, RowActions,
  StatusBadge, notify, type DataTableColumn,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { useConfirm } from '../../../context/ConfirmContext';
import { PERMISSIONS } from '../../../constants/permissions';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import { queryKeys } from '../../../lib/query-keys';
import { BrandFormDialog } from './brand-form-dialog';
import type { Brand, BrandWriteDto } from '../../../api/catalog/types';

/** Danh sách thương hiệu: logo, website, thứ tự hiển thị, ẩn/hiện. */
export function BrandGridPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);

  const query = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'brands' }),
    queryFn: catalogPublicListingApi.getBrands,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });

  const save = useMutation({
    mutationFn: async (dto: BrandWriteDto) => {
      if (editing) await catalogAdminApi.updateBrand(editing.id, dto);
      else await catalogAdminApi.createBrand(dto);
    },
    onSuccess: () => { refresh(); notify.success(editing ? 'Đã lưu thương hiệu' : 'Đã thêm thương hiệu'); },
  });

  const mutate = async (label: string, work: () => Promise<unknown>) => {
    try { await work(); refresh(); notify.success(label); }
    catch (error) { notify.error('Thao tác thất bại', { description: (error as Error).message }); }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };

  const term = search.trim().toLowerCase();
  const rows = useMemo(
    () => (query.data ?? [])
      .filter((b) => !term || b.name.toLowerCase().includes(term))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name, 'vi')),
    [query.data, term],
  );

  const columns: DataTableColumn<Brand>[] = [
    {
      id: 'logo', header: 'Logo', width: '4rem', menuLabel: 'Logo',
      cell: (b) => (
        <div className="w-9">
          {b.logoUrl
            ? <Img src={b.logoUrl} alt="" ratio="1/1" fit="contain" blend wrapperClassName="rounded-md" />
            : <div className="flex aspect-square items-center justify-center rounded-md bg-sunken text-fg-subtle"><Tag size={15} /></div>}
        </div>
      ),
    },
    {
      id: 'name', header: 'Thương hiệu', locked: true,
      cell: (b) => (
        <>
          <p className="text-13 font-medium text-fg">{b.name}</p>
          <p className="truncate text-2xs text-fg-subtle">/{b.slug || '—'}</p>
        </>
      ),
    },
    {
      id: 'description', header: 'Mô tả', defaultHidden: true, nowrap: false,
      cell: (b) => <span className="line-clamp-2 text-xs text-fg-muted">{b.description || '—'}</span>,
    },
    {
      id: 'website', header: 'Website',
      cell: (b) => (b.website
        ? (
          <a
            href={b.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-text hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={13} aria-hidden /> Mở website
          </a>
        )
        : <span className="text-xs text-fg-subtle">Chưa có</span>),
    },
    {
      id: 'productCount', header: 'Sản phẩm', align: 'right',
      cell: (b) => <Badge variant="neutral">{b.productCount ?? 0}</Badge>,
    },
    {
      id: 'isActive', header: 'Trạng thái', align: 'center',
      cell: (b) => <StatusBadge tone={b.isActive ? 'success' : 'neutral'}>{b.isActive ? 'Hiện' : 'Ẩn'}</StatusBadge>,
    },
    {
      id: 'actions', header: '', align: 'right', locked: true, width: '1%',
      cell: (brand) => (
        <RowActions onClick={(e) => e.stopPropagation()}>
          <Can permission={PERMISSIONS.CATALOG_EDIT}>
            <IconButton aria-label={`Sửa ${brand.name}`} size="sm" variant="ghost" onClick={() => { setEditing(brand); setDialogOpen(true); }}>
              <Pencil size={15} />
            </IconButton>
            <IconButton
              aria-label={brand.isActive ? `Ẩn ${brand.name}` : `Hiện ${brand.name}`}
              size="sm"
              variant="ghost"
              onClick={() => void mutate(brand.isActive ? 'Đã ẩn thương hiệu' : 'Đã hiện thương hiệu', () =>
                brand.isActive ? catalogAdminApi.deleteBrand(brand.id) : catalogAdminApi.activateBrand(brand.id))}
            >
              <Power size={15} />
            </IconButton>
          </Can>
          <Can permission={PERMISSIONS.CATALOG_DELETE}>
            <IconButton
              aria-label={`Xoá ${brand.name}`}
              size="sm"
              variant="ghost"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Ẩn thương hiệu?',
                  message: `"${brand.name}" sẽ được ẩn. Nếu còn sản phẩm đang hoạt động thuộc hãng này, máy chủ sẽ từ chối.`,
                  confirmText: 'Ẩn thương hiệu',
                });
                if (ok) await mutate('Đã ẩn thương hiệu', () => catalogAdminApi.deleteBrand(brand.id));
              }}
            >
              <Trash2 size={15} />
            </IconButton>
          </Can>
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thương hiệu"
        description="Hãng sản xuất hiển thị trên cửa hàng và trong bộ lọc sản phẩm."
        actions={
          <Can permission={PERMISSIONS.CATALOG_CREATE}>
            <Button variant="primary" icon={Plus} onClick={openCreate}>Thêm thương hiệu</Button>
          </Can>
        }
      />

      <Card padded>
        <CardBody className="space-y-4">
          <Input
            label="Tìm thương hiệu"
            icon={Search}
            inputSize="sm"
            placeholder="Tên thương hiệu"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <DataTable
            caption="Danh sách thương hiệu"
            columns={columns}
            rows={query.isPending ? undefined : rows}
            rowKey={(b) => b.id}
            loading={query.isPending}
            error={query.error}
            onRetry={() => query.refetch()}
            enableColumnVisibility
            empty={{
              icon: Tag,
              title: term ? 'Không có thương hiệu nào khớp' : 'Chưa có thương hiệu nào',
              description: term ? 'Thử từ khoá khác.' : 'Thêm hãng sản xuất để lọc sản phẩm theo thương hiệu.',
              action: { label: 'Thêm thương hiệu', onClick: openCreate },
            }}
          />
        </CardBody>
      </Card>

      <BrandFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={async (dto) => { await save.mutateAsync(dto); }}
      />
    </div>
  );
}

export default BrandGridPage;
