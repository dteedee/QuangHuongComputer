interface CatalogPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Pagination controls for the catalog product grid. */
export default function CatalogPagination({ page, pageSize, total, onPageChange }: CatalogPaginationProps) {
  if (total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);

  const goTo = (p: number) => {
    onPageChange(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mt-10 flex justify-center pb-8">
      <div className="flex gap-2">
        <button
          onClick={() => goTo(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 hover:border-accent hover:text-accent transition-all shadow-small"
        >
          Trước
        </button>

        <div className="hidden sm:flex gap-1">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            const showPage =
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= page - 1 && pageNum <= page + 1);

            if (!showPage) {
              if (pageNum === page - 2 || pageNum === page + 2) {
                return (
                  <span key={pageNum} className="px-3 py-2 text-gray-400">...</span>
                );
              }
              return null;
            }

            return (
              <button
                key={pageNum}
                onClick={() => goTo(pageNum)}
                className={`min-w-[40px] h-10 rounded-lg font-medium text-sm transition-all ${page === pageNum
                  ? 'bg-accent text-white shadow-medium scale-105'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-accent hover:text-accent shadow-small'
                  }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => goTo(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 hover:border-accent hover:text-accent transition-all shadow-small"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
