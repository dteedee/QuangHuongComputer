import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { queryKeys } from '../../../lib/query-keys';
import type { Product } from '../../../api/catalog/types';

export type StockState = 'all' | 'in' | 'low' | 'out';
export type PublishState = 'all' | 'published' | 'unpublished';
export type ActiveState = 'all' | 'active' | 'inactive';
export type ProductSortId = 'name' | 'price' | 'stockQuantity' | 'createdAt';

export interface AdminProductFilters {
  search: string;
  categoryId: string;
  brandId: string;
  active: ActiveState;
  publish: PublishState;
  stock: StockState;
  minPrice?: number;
  maxPrice?: number;
}

export const emptyFilters: AdminProductFilters = {
  search: '', categoryId: '', brandId: '', active: 'all', publish: 'all', stock: 'all',
};

/** Trần an toàn: 20 trang x 100 dòng. Vượt ngưỡng thì bắt người dùng lọc hẹp lại. */
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

const stockOf = (p: Product): StockState =>
  p.stockQuantity <= 0 ? 'out' : p.stockQuantity <= (p.lowStockThreshold ?? 0) ? 'low' : 'in';

/**
 * Nguồn dữ liệu cho danh sách sản phẩm quản trị.
 *
 * `GET /api/catalog/products` CHỈ nhận `search|q`, `categoryId`, `brandId`,
 * `includeInactive` và phân trang (`CatalogProductQueryEndpoints.cs:24-38`) —
 * không có lọc theo giá/tồn/đăng web, cũng không có `sortBy`. Vì vậy: ba bộ
 * lọc server-side đó đi thẳng lên máy chủ, còn phần còn lại được áp lên TOÀN
 * BỘ tập kết quả — tải hết bằng cách lật trang 100 dòng — chứ không phải chỉ
 * trên trang đang xem (như thế sẽ ra số liệu sai). Đã gửi yêu cầu tích hợp
 * xin thêm tham số lọc/sắp xếp phía máy chủ.
 */
export function useAdminProductList() {
  const [filters, setFilters] = useState<AdminProductFilters>(emptyFilters);
  const [sort, setSort] = useState<{ id: ProductSortId; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const serverParams = {
    search: filters.search.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    brandId: filters.brandId || undefined,
  };

  const query = useQuery({
    queryKey: queryKeys.catalog.list({ scope: 'admin', ...serverParams }),
    queryFn: async () => {
      const rows: Product[] = [];
      let truncated = false;
      for (let p = 1; p <= MAX_PAGES; p += 1) {
        const res = await catalogAdminApi.listProducts({ ...serverParams, page: p, pageSize: PAGE_SIZE });
        rows.push(...res.products);
        if (!res.hasNextPage) break;
        if (p === MAX_PAGES) truncated = true;
      }
      return { rows, truncated };
    },
  });

  const filtered = useMemo(() => {
    const rows = (query.data?.rows ?? []).filter((p) => {
      if (filters.active === 'active' && !p.isActive) return false;
      if (filters.active === 'inactive' && p.isActive) return false;
      if (filters.publish === 'published' && !p.publishedAt) return false;
      if (filters.publish === 'unpublished' && p.publishedAt) return false;
      if (filters.stock !== 'all' && stockOf(p) !== filters.stock) return false;
      if (filters.minPrice !== undefined && p.price < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && p.price > filters.maxPrice) return false;
      return true;
    });
    if (!sort) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.id === 'name') return a.name.localeCompare(b.name, 'vi') * dir;
      if (sort.id === 'createdAt') return (a.createdAt < b.createdAt ? -1 : 1) * dir;
      return ((a[sort.id] ?? 0) - (b[sort.id] ?? 0)) * dir;
    });
  }, [query.data, filters, sort]);

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const update = (next: Partial<AdminProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  return {
    query,
    filters,
    setFilters: update,
    resetFilters: () => { setFilters(emptyFilters); setPage(1); },
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize: (n: number) => { setPageSize(n); setPage(1); },
    rows: pageRows,
    total: filtered.length,
    loadedTotal: query.data?.rows.length ?? 0,
    truncated: query.data?.truncated ?? false,
    stockOf,
  };
}
