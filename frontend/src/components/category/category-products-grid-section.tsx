import { motion } from 'framer-motion';
import { Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { ProductCard } from '../ProductCard';
import type { Product } from '../../api/catalog';

interface CategoryProductsGridSectionProps {
  isLoading: boolean;
  products: Product[];
  sortBy: string;
  onSortChange: (val: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

/** Sort bar + products grid + pagination for the category page. */
export default function CategoryProductsGridSection({
  isLoading,
  products,
  sortBy,
  onSortChange,
  page,
  totalPages,
  onPageChange,
  onClearFilters,
}: CategoryProductsGridSectionProps) {
  return (
    <div className="lg:col-span-3">
      {/* Sort Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-small px-4 py-3 mb-4 flex justify-end items-center gap-3">
        <span className="text-sm text-gray-500">Sắp xếp theo:</span>
        <SearchableSelect
          value={sortBy}
          onChange={onSortChange}
          options={[
            { value: 'newest', label: 'Mới nhất' },
            { value: 'price_asc', label: 'Giá tăng dần' },
            { value: 'price_desc', label: 'Giá giảm dần' },
            { value: 'name', label: 'Tên A-Z' },
          ]}
          className="w-48"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white h-[300px] rounded-lg animate-pulse border border-gray-200" />
          ))}
        </div>
      ) : (
        <>
          {products.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-small p-12 text-center">
              <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-3">Không tìm thấy sản phẩm nào phù hợp.</p>
              <button
                onClick={onClearFilters}
                className="text-accent hover:underline text-sm cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 hover:border-accent hover:text-accent transition-all cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Trước
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onPageChange(i + 1)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm transition-all cursor-pointer ${
                      page === i + 1
                        ? 'bg-accent text-white shadow-medium'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-accent hover:text-accent'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 hover:border-accent hover:text-accent transition-all cursor-pointer flex items-center gap-1"
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
