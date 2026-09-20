import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Package, Plus } from 'lucide-react';
import { Button, Card, CardBody, DataTable, PageHeader, Pagination } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import { queryKeys } from '../../../lib/query-keys';
import { paths } from '../../../routes';
import { buildProductColumns } from './product-list-columns';
import { ProductListFilters } from './product-list-filters';
import { ProductBulkActions, ProductRowActions } from './product-list-actions';
import { useAdminProductList } from './use-admin-product-list';
import { useProductListMutations } from './use-product-list-mutations';
import type { Product } from '../../../api/catalog/types';

/** Danh sách sản phẩm quản trị: lọc, sắp xếp, chọn nhiều, xuất Excel. */
export function AdminProductsPage() {
  const navigate = useNavigate();
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

  const { handlers, bulk, exportXlsx } = useProductListMutations({
    categories,
    filters: list.filters,
    selectedIds: selected,
  });

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sản phẩm"
        description="Toàn bộ hàng hoá đang kinh doanh, kể cả sản phẩm chưa đăng web."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Can permission={PERMISSIONS.CATALOG_EXPORT}>
              <Button variant="outline" icon={Download} onClick={exportXlsx}>Xuất Excel</Button>
            </Can>
            <Can permission={PERMISSIONS.CATALOG_CREATE}>
              {/* Hành động chính DUY NHẤT của màn hình (§9.1). */}
              <Button variant="primary" icon={Plus} onClick={() => navigate(paths.backoffice.productNew())}>
                Thêm sản phẩm
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
            bulkActions={(ids) => (
              <ProductBulkActions
                ids={ids}
                categories={categories}
                onActivate={() => bulk.activate(ids)}
                onChangeCategory={() => bulk.changeCategory(ids)}
                onHide={() => bulk.hide(ids)}
              />
            )}
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
