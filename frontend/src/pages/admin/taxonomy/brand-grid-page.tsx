import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus, Power, Search, Tag, Trash2 } from 'lucide-react';
import {
  Badge, Button, Card, CardBody, IconButton, Img, Input, PageHeader, QueryBoundary, Skeleton,
  StatusBadge, notify,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { useConfirm } from '../../../context/ConfirmContext';
import { PERMISSIONS } from '../../../constants/permissions';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import { queryKeys } from '../../../lib/query-keys';
import { BrandFormDialog } from './brand-form-dialog';
import type { Brand, BrandWriteDto } from '../../../api/catalog/types';

/** Lưới thương hiệu: logo, website, thứ tự hiển thị, ẩn/hiện. */
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

  const term = search.trim().toLowerCase();
  const rows = useMemo(
    () => (query.data ?? [])
      .filter((b) => !term || b.name.toLowerCase().includes(term))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name, 'vi')),
    [query.data, term],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thương hiệu"
        description="Hãng sản xuất hiển thị trên cửa hàng và trong bộ lọc sản phẩm."
        actions={
          <Can permission={PERMISSIONS.CATALOG_CREATE}>
            <Button variant="primary" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus size={16} /> Thêm thương hiệu
            </Button>
          </Can>
        }
      />

      <Card padded>
        <CardBody className="space-y-4">
          <Input
            label="Tìm thương hiệu"
            icon={Search}
            placeholder="Tên thương hiệu"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <QueryBoundary
            query={query}
            skeleton={
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
              </div>
            }
            isEmpty={() => rows.length === 0}
            errorTitle="Không tải được danh sách thương hiệu"
            empty={{
              icon: Tag,
              title: term ? 'Không có thương hiệu nào khớp' : 'Chưa có thương hiệu nào',
              description: term ? 'Thử từ khoá khác.' : 'Thêm hãng sản xuất để lọc sản phẩm theo thương hiệu.',
              action: { label: 'Thêm thương hiệu', onClick: () => { setEditing(null); setDialogOpen(true); } },
            }}
          >
            {() => (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((brand) => (
                  <li key={brand.id} className="group/row rounded-xl border border-line bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 shrink-0">
                        {brand.logoUrl ? (
                          <Img src={brand.logoUrl} alt="" ratio="1/1" fit="contain" blend wrapperClassName="rounded-lg" />
                        ) : (
                          <div className="flex aspect-square items-center justify-center rounded-lg bg-sunken text-fg-subtle">
                            <Tag size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">{brand.name}</p>
                        <p className="truncate text-xs text-fg-subtle">/{brand.slug || '—'}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusBadge tone={brand.isActive ? 'success' : 'neutral'}>
                            {brand.isActive ? 'Hiện' : 'Ẩn'}
                          </StatusBadge>
                          <Badge variant="neutral">{brand.productCount ?? 0} sản phẩm</Badge>
                        </div>
                      </div>
                    </div>
                    {brand.description && (
                      <p className="mt-3 line-clamp-2 text-xs text-fg-muted">{brand.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {brand.website ? (
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-text hover:underline"
                        >
                          <ExternalLink size={13} /> Website
                        </a>
                      ) : <span className="text-xs text-fg-subtle">Chưa có website</span>}
                      <div className="flex items-center gap-1">
                        <Can permission={PERMISSIONS.CATALOG_EDIT}>
                          <IconButton aria-label="Sửa thương hiệu" size="sm" variant="ghost" onClick={() => { setEditing(brand); setDialogOpen(true); }}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton
                            aria-label={brand.isActive ? 'Ẩn thương hiệu' : 'Hiện thương hiệu'}
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
                            aria-label="Xoá thương hiệu"
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
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
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
