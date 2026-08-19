import { Monitor } from 'lucide-react';

interface CategoryHeaderBannerProps {
  categoryTitle: string;
  totalProducts: number;
}

/** Icon + title + result count banner at the top of the category page. */
export default function CategoryHeaderBanner({ categoryTitle, totalProducts }: CategoryHeaderBannerProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-small p-5 mb-6 flex items-center gap-4">
      <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center text-accent flex-shrink-0">
        <Monitor size={28} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{categoryTitle}</h1>
        <p className="text-gray-500 text-sm">Tìm thấy {totalProducts} sản phẩm</p>
      </div>
    </div>
  );
}
