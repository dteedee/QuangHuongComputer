import { useComparison } from '../../context/ComparisonContext';
import type { Product } from '../../api/catalog';
import { Scale, Check } from 'lucide-react';

interface CompareButtonProps {
  product: Product;
  variant?: 'icon' | 'button' | 'text';
  className?: string;
}

export function CompareButton({ product, variant = 'icon', className = '' }: CompareButtonProps) {
  const { addToComparison, removeFromComparison, isInComparison } = useComparison();
  const inComparison = isInComparison(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inComparison) {
      removeFromComparison(product.id);
    } else {
      addToComparison(product);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-full transition ${inComparison
            ? 'bg-red-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
          } ${className}`}
        title={inComparison ? 'Xóa khỏi so sánh' : 'Thêm vào so sánh'}
      >
        {inComparison ? <Check className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${inComparison
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-600'
          } ${className}`}
      >
        {inComparison ? <Check className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
        {inComparison ? 'Đã thêm' : 'So sánh'}
      </button>
    );
  }

  // Text variant
  return (
    <button
      onClick={handleClick}
      className={`text-sm flex items-center gap-1 transition ${inComparison
          ? 'text-red-600 font-medium'
          : 'text-gray-500 hover:text-red-600'
        } ${className}`}
    >
      {inComparison ? <Check className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
      {inComparison ? 'Đang so sánh' : 'So sánh'}
    </button>
  );
}

export default CompareButton;
