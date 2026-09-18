import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Package, Plus } from 'lucide-react';
import { Button, Card, CardBody, DataTable, PageHeader, Pagination, notify } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { useConfirm, usePrompt } from '../../../context/ConfirmContext';
import { PERMISSIONS } from '../../../constants/permissions';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import { queryKeys } from '../../../lib/query-keys';
import { paths } from '../../../routes';
import { buildProductColumns } from './product-list-columns';
import { ProductListFilters } from './product-list-filters';
import { ProductBulkActions, ProductRowActions } from './product-list-actions';
import { useAdminProductList } from './use-admin-product-list';
import type { Product } from '../../../api/catalog/types';

/** Danh sách sản phẩm quản trị: lọc, sắp xếp, chọn nhiều, xuất Excel. */
export function AdminProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { promptSelect } = usePrompt();
  const [selected, setSelected] = useState<string[]>([]);
  const list = useAdminProductList();

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'categories' }),
    queryFn: catalogPublicListingApi.getCategories,
  });
  const brandsQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'brands' }),
    queryFn: catalogPublicListingApi.getBrands,
  });
  const categories = useMemo(
    () => (categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesQuery.data],
  );
  const brands = useMemo(
    () => (brandsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    [brandsQuery.data],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });

  const run = async (label: string, work: () => Promise<unknown>) => {
    try {
      await work();
      await refresh();
      notify.success(label);
    } catch (error) {
      notify.error('Thao tác thất bại', { description: (error as Error).message });
    }
  };

  const handlers = {
    onEdit: (p: Product) => navigate(paths.backoffice.productEdit(p.id)),
    onDuplicate: (p: Product) =>
      run('Đã nhân bản sản phẩm', async () => {
        const copy = await catalogAdminApi.createProduct({
          name: `${p.name} (bản sao)`,
          description: p.description ?? '',
          price: p.price,
          costPrice: p.costPrice ?? 0,
          categoryId: p.categoryId,
          brandId: p.brandId,
          stockQuantity: 0,
          warrantyInfo: p.warrantyInfo,
          warrantyMonths: p.warrantyMonths ?? undefined,
          isReturnExcluded: p.isReturnExcluded,
          unitName: p.unitName ?? undefined,
        });
        navigate(paths.backoffice.productEdit(copy.id));
      }),
    onTogglePublish: (p: Product) =>
      run(p.publishedAt ? 'Đã gỡ khỏi web' : 'Đã hiện trên web', () =>
        p.publishedAt ? catalogAdminApi.unpublishProduct(p.id) : catalogAdminApi.publishProduct(p.id)),
    onHide: async (p: Product) => {
      const ok = await confirm({
        title: 'Ẩn sản phẩm?',
        message: `"${p.name}" sẽ ngừng kinh doanh và biến mất khỏi mọi kênh bán. Có thể mở bán lại bất cứ lúc nào.`,
        confirmText: 'Ẩn sản phẩm',
      });
      if (ok) await run('Đã ẩn sản phẩm', () => catalogAdminApi.deleteProduct(p.id));
    },
  };

  const columns = useMemo(
    () => [
      ...buildProductColumns(list.stockOf),
      {
        id: 'actions',
        header: '',
        locked: true,
        width: '7rem',
        align: 'right' as const,
        cell: (p: Product) => <ProductRowActions product={p} handlers={handlers} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.stockOf],
  );

  const bulk = (ids: string[]) => (
    <ProductBulkActions
      ids={ids}
      categories={categories}
      onActivate={() => run(`Đã mở bán ${ids.length} sản phẩm`, () =>
        Promise.all(ids.map((i) => catalogAdminApi.activateProduct(i))))}
      onChangeCategory={async () => {
        const categoryId = await promptSelect({
          title: 'Chuyển ngành hàng',
          message: `Áp dụng cho ${ids.length} sản phẩm đã chọn.`,
          options: categories,
        });
        if (categoryId) {
          await run('Đã chuyển ngành hàng', () =>
            Promise.all(ids.map((i) => catalogAdminApi.updateProduct(i, { categoryId }))));
        }
      }}
      onHide={async () => {
        const ok = await confirm({
          title: `Ẩn ${ids.length} sản phẩm?`,
          message: 'Các sản phẩm này sẽ ngừng kinh doanh trên mọi kênh. Có thể mở bán lại sau.',
          confirmText: 'Ẩn sản phẩm',
        });
        if (ok) await run(`Đã ẩn ${ids.length} sản phẩm`, () =>
          Promise.all(ids.map((i) => catalogAdminApi.deleteProduct(i))));
      }}
    />
  );

  const exportXlsx = () =>
    run('Đã tải tệp Excel', async () => {
      const blob = await catalogAdminApi.exportProducts({
        categoryId: list.filters.categoryId || undefined,
        brandId: list.filters.brandId || undefined,
        ids: selected.length > 0 ? selected.join(',') : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `san-pham-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sản phẩm"
        description="Toàn bộ hàng hoá đang kinh doanh, kể cả sản phẩm chưa đăng web."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Can permission={PERMISSIONS.CATALOG_EXPORT}>
              <Button variant="outline" onClick={exportXlsx}>
                <Download size={16} /> Xuất Excel
              </Button>
            </Can>
            <Can permission={PERMISSIONS.CATALOG_CREATE}>
              <Button variant="primary" onClick={() => navigate(paths.backoffice.productNew())}>
                <Plus size={16} /> Thêm sản phẩm
              </Button>
            </Can>
          </div>
        }
      />

      <Card padded>
        <CardBody className="space-y-4">
          <ProductListFilters
            filters={list.filters}
            onChange={list.setFilters}
            onReset={list.resetFilters}
            categories={categories}
            brands={brands}
          />
          {list.truncated && (
            <p className="rounded-lg bg-warning-subtle px-3 py-2 text-xs text-warning-text">
              Danh sách đã đạt trần 2.000 sản phẩm tải về. Hãy lọc theo ngành hàng hoặc thương hiệu
              để xem đầy đủ.
            </p>
          )}
          <DataTable
            caption="Danh sách sản phẩm"
            columns={columns}
            rows={list.query.isPending ? undefined : list.rows}
            rowKey={(p) => p.id}
            loading={list.query.isPending}
            error={list.query.error}
            onRetry={() => list.query.refetch()}
            sort={list.sort}
            onSortChange={(s) => list.setSort(s as never)}
            selectedIds={selected}
            onSelectionChange={setSelected}
            enableColumnVisibility
            bulkActions={bulk}
            skeletonRows={list.pageSize}
            empty={{
              icon: Package,
              title: 'Không có sản phẩm nào khớp bộ lọc',
              description: 'Thử xoá bớt điều kiện lọc, hoặc thêm sản phẩm mới.',
              action: { label: 'Thêm sản phẩm', onClick: () => navigate(paths.backoffice.productNew()) },
              secondaryAction: { label: 'Xoá bộ lọc', onClick: list.resetFilters },
            }}
            pagination={
              <Pagination
                page={list.page}
                pageSize={list.pageSize}
                total={list.total}
                onPageChange={list.setPage}
                onPageSizeChange={list.setPageSize}
              />
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}

export default AdminProductsPage;
