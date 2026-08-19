/** Full-page loading spinner shown while the product detail data is fetching. */
export function ProductDetailLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--accent-primary)] mx-auto" />
        <p className="mt-4 text-gray-600 text-sm">Đang tải...</p>
      </div>
    </div>
  );
}

interface ProductDetailNotFoundStateProps {
  onBackToList: () => void;
}

/** Full-page "product not found" state with a back-to-list action. */
export function ProductDetailNotFoundState({ onBackToList }: ProductDetailNotFoundStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy sản phẩm</h2>
        <button
          onClick={onBackToList}
          className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer"
        >
          Quay lại danh sách
        </button>
      </div>
    </div>
  );
}
