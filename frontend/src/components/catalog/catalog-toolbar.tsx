import { Grid, List } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';

interface CatalogToolbarProps {
  page: number;
  pageSize: number;
  total: number;
  sortBy: string;
  onSortChange: (val: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

/** Sort/view-mode toolbar shown above the product grid. */
export default function CatalogToolbar({
  page,
  pageSize,
  total,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: CatalogToolbarProps) {
  return (
    <div className="bg-white rounded-lg shadow-small border border-gray-200 p-3 mb-6 flex flex-wrap gap-4 items-center justify-between">
      <div className="hidden md:block text-gray-500 text-sm">
        Hiển thị <strong>{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)}</strong> trong <strong>{total}</strong> sản phẩm
      </div>

      <div className="flex items-center gap-3 ml-auto w-full md:w-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">Sắp xếp:</span>
          <SearchableSelect
            value={sortBy}
            onChange={onSortChange}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'price_asc', label: 'Giá tăng dần' },
              { value: 'price_desc', label: 'Giá giảm dần' },
              { value: 'name', label: 'Tên A-Z' },
            ]}
            className="w-44"
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            title="Lưới"
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            title="Danh sách"
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
