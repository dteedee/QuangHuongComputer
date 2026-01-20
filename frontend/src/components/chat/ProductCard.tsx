import { memo } from 'react';
import { ExternalLink, Package } from 'lucide-react';

export interface ProductLink {
  id: string;
  name: string;
  price?: number;
  image?: string;
  url: string;
  type: 'product' | 'article';
}

interface ProductCardProps {
  product: ProductLink;
  onClick?: () => void;
}

export const ProductCard = memo(({ product, onClick }: ProductCardProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(product.url, '_blank');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-all hover:scale-[1.02] group text-left"
    >
      <div className="flex gap-3">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-16 h-16 object-cover rounded bg-gray-800"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-800 rounded flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
              {product.name}
            </h4>
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
          </div>

          {product.price && (
            <p className="text-xs font-bold text-blue-400 mt-1">
              {formatPrice(product.price)}
            </p>
          )}

          <p className="text-xs text-gray-500 mt-1">
            {product.type === 'product' ? 'Sản phẩm' : 'Bài viết'}
          </p>
        </div>
      </div>
    </button>
  );
});

ProductCard.displayName = 'ProductCard';
