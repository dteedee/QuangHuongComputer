import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import type { Product } from '../api/catalog';
import { formatNumber } from '../utils/format';
import { useCart } from '../context/CartContext';
import { resolveMediaUrl } from '../lib/media-url';

interface ProductListItemProps {
    product: Product;
}

/**
 * ProductListItem — hàng danh sách theo cùng anatomy với ProductCard (ProductCard.tsx),
 * chỉ đổi bố cục sang ngang (ảnh trái, thông tin giữa, giá + CTA phải).
 *
 * D01/W0-12: đã bỏ 2 badge khuyến mãi bịa — xem ProductCard.tsx cùng thư mục.
 */
export const ProductListItem = ({ product }: ProductListItemProps) => {
    const { addToCart } = useCart();
    const [imgError, setImgError] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => { setImgError(false); }, [product.imageUrl]);

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAdding) return;
        setIsAdding(true);
        try {
            await addToCart(product);
        } finally {
            setIsAdding(false);
        }
    };

    const hasOldPrice = !!product.oldPrice && product.oldPrice > product.price;
    const savingsPercent = hasOldPrice
        ? Math.round((1 - product.price / (product.oldPrice as number)) * 100)
        : 0;
    const isOutOfStock = product.stockQuantity <= 0;
    const productUrl = product.slug ? `/san-pham/${product.slug}` : `/product/${product.id}`;
    const rating = Math.round(product.averageRating || 0);
    const resolvedImageUrl = resolveMediaUrl(product.imageUrl);

    return (
        <Link
            to={productUrl}
            className="group bg-white rounded-lg border border-gray-200 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-200 p-4 flex flex-col sm:flex-row gap-5"
        >
            {/* Ảnh */}
            <div className="relative w-full sm:w-44 h-44 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-100 p-3 flex items-center justify-center">
                {resolvedImageUrl && !imgError ? (
                    <img
                        src={resolvedImageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <span className="text-gray-300 font-black text-4xl select-none">{product.name?.charAt(0) || '?'}</span>
                )}
            </div>

            {/* Thông tin */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Rating + SKU */}
                <div className="flex items-center gap-1 mb-1 text-[12px]">
                    {rating > 0 ? (
                        <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Star key={i} size={11} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                            ))}
                        </div>
                    ) : (
                        <span className="text-gray-400 italic">Chưa có đánh giá</span>
                    )}
                    <span className="text-gray-400 ml-1">Mã: {product.sku}</span>
                </div>

                {/* Tên */}
                <h3 className="text-[15px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1.5 group-hover:text-accent transition-colors">
                    {product.name}
                </h3>

                {product.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">{product.description}</p>
                )}

                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
                    <div>
                        {/* Giá cũ + tiết kiệm */}
                        <div className="min-h-[16px] flex items-center gap-2 text-[12px] mb-0.5">
                            {hasOldPrice && (
                                <>
                                    <span className="text-gray-400 line-through">{formatNumber(product.oldPrice as number)}₫</span>
                                    <span className="text-accent font-semibold">(Tiết kiệm {savingsPercent}%)</span>
                                </>
                            )}
                        </div>
                        {/* Giá bán */}
                        <span className="text-[20px] font-bold text-accent leading-none">
                            {formatNumber(product.price)}
                            <sup className="text-[12px] font-bold ml-0.5">₫</sup>
                        </span>
                        <div className={`mt-1.5 text-[12px] font-semibold ${isOutOfStock ? 'text-gray-400' : 'text-stock'}`}>
                            {isOutOfStock ? 'Hết hàng' : '✓ Sẵn hàng'}
                        </div>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock || isAdding}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            isOutOfStock
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                        } ${isAdding ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        <ShoppingCart size={16} />
                        Thêm vào giỏ
                    </button>
                </div>
            </div>
        </Link>
    );
};
