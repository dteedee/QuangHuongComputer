import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';

interface WishlistButtonProps {
  productId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function WishlistButton({
  productId,
  className = '',
  size = 'md',
  showLabel = false,
}: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isLoading, setIsLoading] = useState(false);

  const inWishlist = isInWishlist(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    await toggleWishlist(productId);
    setIsLoading(false);
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  if (showLabel) {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          inWishlist
            ? 'bg-red-50 text-[#D70018] border border-red-200'
            : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-[#D70018] border border-transparent'
        } disabled:opacity-50 ${className}`}
      >
        <Heart
          className={`transition-colors ${isLoading ? 'animate-pulse' : ''}`}
          size={iconSizes[size]}
          fill={inWishlist ? 'currentColor' : 'none'}
        />
        <span className="text-sm">
          {inWishlist ? 'Đã yêu thích' : 'Yêu thích'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full transition-all ${
        inWishlist
          ? 'bg-red-50 text-[#D70018]'
          : 'bg-white text-gray-400 hover:text-[#D70018] hover:bg-red-50 shadow-md'
      } disabled:opacity-50 ${className}`}
      title={inWishlist ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
    >
      <Heart
        className={`transition-colors ${isLoading ? 'animate-pulse' : ''}`}
        size={iconSizes[size]}
        fill={inWishlist ? 'currentColor' : 'none'}
      />
    </button>
  );
}

export default WishlistButton;
