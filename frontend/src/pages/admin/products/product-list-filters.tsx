import { Search, X } from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui';
import type { AdminProductFilters } from './use-admin-product-list';

interface Props {
  filters: AdminProductFilters;
  onChange: (next: Partial<AdminProductFilters>) => void;
  onReset: () => void;
  categories: Array<{ value: string; label: string }>;
  brands: Array<{ value: string; label: string }>;
}

const ACTIVE_OPTIONS = [
  { value: 'all', label: 'Mọi trạng thái kinh doanh' },
  { value: 'active', label: 'Đang kinh doanh' },
  { value: 'inactive', label: 'Ngừng kinh doanh' },
];
const PUBLISH_OPTIONS = [
  { value: 'all', label: 'Mọi trạng thái web' },
  { value: 'published', label: 'Đang hiện trên web' },
  { value: 'unpublished', label: 'Chưa đăng web' },
];
const STOCK_OPTIONS = [
  { value: 'all', label: 'Mọi mức tồn' },
  { value: 'in', label: 'Còn hàng' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'out', label: 'Hết hàng' },
];

const num = (v: string) => (v === '' ? undefined : Number(v));

/** Thanh lọc của danh sách sản phẩm. */
export function ProductListFilters({ filters, onChange, onReset, categories, brands }: Props) {
  const dirty =
    filters.search !== '' || filters.categoryId !== '' || filters.brandId !== '' ||
    filters.active !== 'all' || filters.publish !== 'all' || filters.stock !== 'all' ||
    filters.minPrice !== undefined || filters.maxPrice !== undefined;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Input
        label="Tìm kiếm"
        icon={Search}
        placeholder="Tên sản phẩm hoặc mã SKU"
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className="sm:col-span-2"
      />
      <Select
        label="Ngành hàng"
        value={filters.categoryId}
        onChange={(e) => onChange({ categoryId: e.target.value })}
        options={[{ value: '', label: 'Tất cả ngành hàng' }, ...categories]}
      />
      <Select
        label="Thương hiệu"
        value={filters.brandId}
        onChange={(e) => onChange({ brandId: e.target.value })}
        options={[{ value: '', label: 'Tất cả thương hiệu' }, ...brands]}
      />
      <Select
        label="Kinh doanh"
        value={filters.active}
        onChange={(e) => onChange({ active: e.target.value as AdminProductFilters['active'] })}
        options={ACTIVE_OPTIONS}
      />
      <Select
        label="Trên web"
        value={filters.publish}
        onChange={(e) => onChange({ publish: e.target.value as AdminProductFilters['publish'] })}
        options={PUBLISH_OPTIONS}
      />
      <Select
        label="Tồn kho"
        value={filters.stock}
        onChange={(e) => onChange({ stock: e.target.value as AdminProductFilters['stock'] })}
        options={STOCK_OPTIONS}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Giá từ"
          type="number"
          min={0}
          value={filters.minPrice ?? ''}
          onChange={(e) => onChange({ minPrice: num(e.target.value) })}
        />
        <Input
          label="Giá đến"
          type="number"
          min={0}
          value={filters.maxPrice ?? ''}
          onChange={(e) => onChange({ maxPrice: num(e.target.value) })}
        />
      </div>
      <div className="flex items-end">
        {dirty && (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <X size={15} /> Xoá bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
}
