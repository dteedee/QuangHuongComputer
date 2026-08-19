import { X } from 'lucide-react';
import CategoryFilterPanelBody from './category-filter-panel-body';
import type { Brand } from '../../api/catalog';

interface CategoryMobileFilterDrawerProps {
  brands: Brand[];
  selectedBrandId: string | null;
  priceRange: { min?: number; max?: number } | null;
  inStockOnly: boolean;
  matchedCategoryId?: string;
  specValues: Record<string, string>;
  totalProducts: number;
  onBrandSelect: (id: string) => void;
  onPriceSelect: (min?: number, max?: number) => void;
  onInStockChange: (checked: boolean) => void;
  onSpecChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onClose: () => void;
}

/** Mobile slide-in filter drawer for the category page (mirrors catalog-mobile-filter-drawer). */
export default function CategoryMobileFilterDrawer({
  brands,
  selectedBrandId,
  priceRange,
  inStockOnly,
  matchedCategoryId,
  specValues,
  totalProducts,
  onBrandSelect,
  onPriceSelect,
  onInStockChange,
  onSpecChange,
  onClearFilters,
  onClose,
}: CategoryMobileFilterDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden font-sans">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-[80%] max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-lg text-gray-900">Bộ lọc tìm kiếm</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Đóng bộ lọc">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 flex-1">
          <CategoryFilterPanelBody
            brands={brands}
            selectedBrandId={selectedBrandId}
            priceRange={priceRange}
            inStockOnly={inStockOnly}
            matchedCategoryId={matchedCategoryId}
            specValues={specValues}
            onBrandSelect={onBrandSelect}
            onPriceSelect={onPriceSelect}
            onInStockChange={onInStockChange}
            onSpecChange={onSpecChange}
          />
        </div>
        <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white flex gap-2">
          <button
            onClick={onClearFilters}
            className="px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Xóa
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-accent text-white font-bold rounded-lg shadow-lg hover:bg-accent-hover transition-colors"
          >
            Xem {totalProducts} kết quả
          </button>
        </div>
      </div>
    </div>
  );
}
