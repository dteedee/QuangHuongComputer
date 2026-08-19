import { Filter, X } from 'lucide-react';
import CategoryFilterPanelBody from './category-filter-panel-body';
import type { Brand } from '../../api/catalog';

interface CategorySidebarFiltersProps {
  brands: Brand[];
  selectedBrandId: string | null;
  priceRange: { min?: number; max?: number } | null;
  inStockOnly: boolean;
  matchedCategoryId?: string;
  specValues: Record<string, string>;
  onBrandSelect: (id: string) => void;
  onPriceSelect: (min?: number, max?: number) => void;
  onInStockChange: (checked: boolean) => void;
  onSpecChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

/** Desktop sidebar with brand/price/stock/spec filters for the category page. */
export default function CategorySidebarFilters({
  brands,
  selectedBrandId,
  priceRange,
  inStockOnly,
  matchedCategoryId,
  specValues,
  onBrandSelect,
  onPriceSelect,
  onInStockChange,
  onSpecChange,
  onClearFilters,
}: CategorySidebarFiltersProps) {
  return (
    <div className="hidden lg:block">
      <div className="bg-white rounded-lg border border-gray-200 shadow-small p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Filter size={15} />
            BỘ LỌC
          </h3>
          {(selectedBrandId || priceRange) && (
            <button
              onClick={onClearFilters}
              className="text-xs text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <X size={12} /> Xóa
            </button>
          )}
        </div>

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
    </div>
  );
}
