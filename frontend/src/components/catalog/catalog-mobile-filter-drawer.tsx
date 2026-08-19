import { X } from 'lucide-react';
import { ProductFilter } from '../ProductFilter';
import type { Category, Brand } from '../../api/catalog';

interface CatalogMobileFilterDrawerProps {
  categories: Category[];
  brands: Brand[];
  selectedCategory: string;
  selectedBrand: string;
  priceRange: { min: number; max: number };
  inStockOnly: boolean;
  total: number;
  onCategoryChange: (id: string) => void;
  onBrandChange: (id: string) => void;
  onPriceChange: (range: { min: number; max: number }) => void;
  onInStockChange: (checked: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

/** Mobile slide-in filter drawer for the catalog page. */
export default function CatalogMobileFilterDrawer({
  categories,
  brands,
  selectedCategory,
  selectedBrand,
  priceRange,
  inStockOnly,
  total,
  onCategoryChange,
  onBrandChange,
  onPriceChange,
  onInStockChange,
  onReset,
  onClose,
}: CatalogMobileFilterDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden font-sans">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-[80%] max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-lg text-gray-900">Bộ lọc tìm kiếm</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 flex-1">
          <ProductFilter
            categories={categories}
            brands={brands}
            selectedCategory={selectedCategory}
            selectedBrand={selectedBrand}
            priceRange={priceRange}
            inStockOnly={inStockOnly}
            onCategoryChange={onCategoryChange}
            onBrandChange={onBrandChange}
            onPriceChange={onPriceChange}
            onInStockChange={onInStockChange}
            onReset={onReset}
          />
        </div>
        <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="w-full py-3 bg-accent text-white font-bold rounded-lg shadow-lg hover:bg-accent-hover transition-colors"
          >
            Xem {total} kết quả
          </button>
        </div>
      </div>
    </div>
  );
}
