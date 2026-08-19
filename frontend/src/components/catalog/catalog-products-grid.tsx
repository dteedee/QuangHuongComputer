import { Search } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { ProductListItem } from '../ProductListItem';
import type { Product } from '../../api/catalog';

interface CatalogProductsGridProps {
  loading: boolean;
  products: Product[];
  viewMode: 'grid' | 'list';
  onClearFilters: () => void;
}

/** Products grid/list area with loading skeleton and empty state. */
export default function CatalogProductsGrid({ loading, products, viewMode, onClearFilters }: CatalogProductsGridProps) {
  if (loading) {
    return (
      <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-4"}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-small border border-gray-200 p-4 animate-pulse h-80">
            <div className="bg-gray-100 h-40 rounded-lg mb-4 w-full"></div>
            <div className="bg-gray-100 h-4 rounded w-3/4 mb-2"></div>
            <div className="bg-gray-100 h-4 rounded w-1/2 mb-4"></div>
            <div className="bg-gray-100 h-8 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-small border border-gray-200 p-16 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search size={32} className="text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm nào</h3>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn để tìm thấy sản phẩm mong muốn.
        </p>
        <button
          onClick={onClearFilters}
          className="px-8 py-3 bg-accent text-white rounded-full hover:bg-accent-hover font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
        >
          Xóa tất cả bộ lọc
        </button>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <ProductListItem key={product.id} product={product} />
      ))}
    </div>
  );
}
