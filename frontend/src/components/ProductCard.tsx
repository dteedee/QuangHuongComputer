import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../hooks/useProducts';
import { ShoppingCart, Star, Gift, Ticket } from 'lucide-react';
import { formatNumber } from '../utils/format';

interface ProductCardProps {
    product: Product;
}

/**
 * ProductCard — 7-tier anatomy theo hacom.vn pattern (giữ brand đỏ Quang Hưởng qua token `accent`):
 * 1. Ảnh (ratio vuông) + badge quà tặng
 * 2. Rating + "Mã: SKU"
 * 3. Tên SP 3 dòng ellipsis
 * 4. Giá cũ gạch + "(Tiết kiệm x%)"
 * 5. Giá bán đỏ bold, ₫ superscript
 * 6. "✓ Sẵn hàng" xanh + nút giỏ tròn đỏ
 * 7. Row promo icons
 */
export const ProductCard = ({ product }: ProductCardProps) => {
    const { addToCart } = useCart();
    const [imgError, setImgError] = useState(false);

    useEffect(() => { setImgError(false); }, [product.imageUrl]);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, 1);
    };

    const hasOldPrice = !!product.oldPrice && product.oldPrice > product.price;
    const savingsPercent = hasOldPrice
        ? Math.round((1 - product.price / (product.oldPrice as number)) * 100)
        : 0;
    const isOutOfStock = product.stockQuantity <= 0 || product.status === 'OutOfStock';
    const productUrl = product.slug ? `/san-pham/${product.slug}` : `/product/${product.id}`;
    const rating = Math.round(product.averageRating || 0);
    const hasGift = product.soldCount > 20;

    return (
        <Link
            to={productUrl}
            className="group relative flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-medium hover:-translate-y-0.5 h-full"
        >
            {/* Tier 1 — image + gift badge */}
            <div className="relative aspect-square bg-white p-3 overflow-hidden">
                {hasGift && (
                    <span className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        <Gift size={10} /> Quà tặng
                    </span>
                )}
                {product.imageUrl && !imgError ? (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg text-gray-300">
                        <span className="text-4xl font-black">{product.name?.charAt(0) || '?'}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col flex-1 px-3 pb-3 pt-1.5 border-t border-gray-100">
                {/* Tier 2 — rating + SKU */}
                <div className="flex items-center gap-1 mb-1 text-[11px]">
                    <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} size={10} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                        ))}
                    </div>
                    <span className="text-gray-400 ml-1 truncate">Mã: {product.sku}</span>
                </div>

                {/* Tier 3 — name, 3 lines */}
                <h3 className="text-[13px] font-medium text-gray-800 line-clamp-3 min-h-[3.1em] leading-snug mb-1.5 group-hover:text-accent transition-colors">
                    {product.name}
                </h3>

                {/* Tier 4 — old price + savings */}
                <div className="min-h-[16px] flex items-center gap-2 text-[12px]">
                    {hasOldPrice && (
                        <>
                            <span className="text-gray-400 line-through">{formatNumber(product.oldPrice as number)}₫</span>
                            <span className="text-accent font-semibold">(Tiết kiệm {savingsPercent}%)</span>
                        </>
                    )}
                </div>

                {/* Tier 5 — sale price, red bold, superscript đ */}
                <div className="mt-0.5 mb-2">
                    <span className="text-[18px] font-bold text-accent leading-none">
                        {formatNumber(product.price)}
                        <sup className="text-[11px] font-bold ml-0.5">₫</sup>
                    </span>
                </div>

                {/* Tier 6 — stock status + cart button */}
                <div className="mt-auto flex items-center justify-between">
                    <span className={`text-[12px] font-semibold ${isOutOfStock ? 'text-gray-400' : 'text-stock'}`}>
                        {isOutOfStock ? 'Hết hàng' : '✓ Sẵn hàng'}
                    </span>
                    <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                        aria-label="Thêm vào giỏ hàng"
                        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                            isOutOfStock
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-accent text-white hover:bg-accent-hover active:scale-95 shadow-sm'
                        }`}
                    >
                        <ShoppingCart size={16} />
                    </button>
                </div>

                {/* Tier 7 — promo icons */}
                {(hasOldPrice || hasGift) && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                        {hasOldPrice && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><Ticket size={11} /> Voucher</span>
                        )}
                        {hasGift && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><Gift size={11} /> Quà tặng</span>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
};
