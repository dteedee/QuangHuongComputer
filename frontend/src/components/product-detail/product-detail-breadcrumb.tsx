import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface ProductDetailBreadcrumbProps {
  productName: string;
}

/** Home / Products / <product name> breadcrumb for the product detail page. */
export default function ProductDetailBreadcrumb({ productName }: ProductDetailBreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <nav className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-accent transition-colors cursor-pointer">Trang chủ</button>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <button onClick={() => navigate('/products')} className="text-gray-500 hover:text-accent transition-colors cursor-pointer">Sản phẩm</button>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className="text-gray-900 font-semibold truncate max-w-xs">{productName}</span>
        </nav>
      </div>
    </div>
  );
}
