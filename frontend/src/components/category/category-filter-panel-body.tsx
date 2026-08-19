import ProductFilterSpecSection from '../product-filter-spec-section';
import type { Brand } from '../../api/catalog';

const PRICE_RANGES = [
  { label: 'Dưới 10 triệu', max: 10000000 },
  { label: '10 - 15 triệu', min: 10000000, max: 15000000 },
  { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
  { label: '20 - 30 triệu', min: 20000000, max: 30000000 },
  { label: 'Trên 30 triệu', min: 30000000 },
] as const;

interface CategoryFilterPanelBodyProps {
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
}

/**
 * Nội dung filter dùng chung cho sidebar desktop (category-sidebar-filters)
 * và drawer mobile (category-mobile-filter-drawer) — tránh trùng lặp (DRY).
 */
export default function CategoryFilterPanelBody({
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
}: CategoryFilterPanelBodyProps) {
  return (
    <div className="space-y-5">
      {/* Brands — filter pills (border, radius full, hover đỏ) */}
      <div>
        <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Thương hiệu</h4>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => onBrandSelect(brand.id)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                selectedBrandId === brand.id
                  ? 'bg-accent border-accent text-white'
                  : 'border-gray-200 text-gray-600 hover:border-accent hover:text-accent'
              }`}
            >
              {brand.name}
            </button>
          ))}
          {brands.length === 0 && (
            <p className="text-xs text-gray-400 italic">Đang tải thương hiệu...</p>
          )}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Price Ranges */}
      <div>
        <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Mức giá</h4>
        <div className="flex flex-col gap-2 text-sm text-gray-600">
          {PRICE_RANGES.map((range, idx) => {
            const isChecked = priceRange?.min === range.min && priceRange?.max === range.max;
            return (
              <label key={idx} className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors">
                <input
                  type="radio"
                  name="price_range_mobile"
                  checked={isChecked}
                  onChange={() => onPriceSelect(range.min, range.max)}
                  className="border-gray-300 text-accent focus:ring-accent"
                />
                <span>{range.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Status */}
      <div>
        <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Trạng thái</h4>
        <label className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors text-sm text-gray-600">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onInStockChange(e.target.checked)}
            className="rounded border-gray-300 text-accent focus:ring-accent"
          />
          <span>Chỉ hiển thị hàng có sẵn</span>
        </label>
      </div>

      {/* Spec filters (dynamic) */}
      {matchedCategoryId && (
        <>
          <hr className="border-gray-100" />
          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Thông số kỹ thuật</h4>
            <ProductFilterSpecSection
              categoryId={matchedCategoryId}
              values={specValues}
              onChange={onSpecChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
