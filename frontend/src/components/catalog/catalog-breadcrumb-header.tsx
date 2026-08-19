import { Link } from 'react-router-dom';
import { Filter, ChevronRight, Home } from 'lucide-react';

interface CatalogBreadcrumbHeaderProps {
  searchQuery: string;
  currentCategoryName: string;
  currentBrandName?: string;
  total: number;
  activeFiltersCount: number;
  onOpenMobileFilter: () => void;
}

/** Breadcrumb, title and mobile filter toggle for the catalog page. */
export default function CatalogBreadcrumbHeader({
  searchQuery,
  currentCategoryName,
  currentBrandName,
  total,
  activeFiltersCount,
  onOpenMobileFilter,
}: CatalogBreadcrumbHeaderProps) {
  return (
    <div className="container mx-auto px-4 pt-4 pb-2">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link to="/" className="hover:text-accent flex items-center gap-1 transition-colors"><Home size={14} /> Trang chủ</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">Sản phẩm</span>
      </nav>
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        {searchQuery ? (
          <span>Kết quả tìm kiếm cho <span className="text-accent">"{searchQuery}"</span></span>
        ) : (
          <>
            {currentCategoryName}
            {currentBrandName && <span className="text-gray-400 font-normal">/ {currentBrandName}</span>}
          </>
        )}
      </h1>

      {/* Mobile Filter Toggle */}
      <div className="mt-3 md:hidden flex items-center justify-between">
        <button
          onClick={onOpenMobileFilter}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium shadow-small active:bg-gray-50"
        >
          <Filter size={16} />
          Bộ lọc {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </button>

        <span className="text-sm text-gray-500">
          {total} sản phẩm
        </span>
      </div>
    </div>
  );
}
