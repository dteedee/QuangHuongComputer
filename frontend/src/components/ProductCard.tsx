import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../hooks/useProducts';
import { ShoppingCart, Star, Heart } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface ProductCardProps {
    product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
    const { addToCart } = useCart();
    const [imgError, setImgError] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('qh_wishlist');
            if (stored) {
                const list = JSON.parse(stored);
                setIsWishlisted(list.includes(product.id));
            }
        } catch { /* ignore */ }
    }, [product.id]);

    useEffect(() => {
        setImgError(false);
    }, [product.imageUrl]);

    const toggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const stored = localStorage.getItem('qh_wishlist');
            let list: string[] = stored ? JSON.parse(stored) : [];
            list = isWishlisted
                ? list.filter(id => id !== product.id)
                : [...list, product.id];
            localStorage.setItem('qh_wishlist', JSON.stringify(list));
            setIsWishlisted(!isWishlisted);
        } catch { /* ignore */ }
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, 1);
    };

    const oldPrice = product.oldPrice || product.price * 1.15;
    const discount = product.oldPrice
        ? Math.round((1 - product.price / product.oldPrice) * 100)
        : 15;
    const isOutOfStock = product.stockQuantity <= 0;
    const productUrl = product.slug
        ? `/san-pham/${product.slug}`
        : `/product/${product.id}`;
    const rating = Math.round(product.averageRating || 0);

    // Badge logic
    let badge: { label: string; className: string } | null = null;
    if (isOutOfStock) {
        badge = { label: 'Het hang', className: 'bg-gray-500 text-white' };
    } else if (discount >= 10 && product.oldPrice) {
        badge = { label: `-${discount}%`, className: 'bg-red-500 text-white' };
    } else if (product.soldCount > 10) {
        badge = { label: 'Ban chay', className: 'bg-amber-500 text-white' };
    }

    return (
        <Link
            to={productUrl}
            className="group relative flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-accent/30 h-full"
        >
            {/* Badge - top left */}
            {badge && (
                <span className={`absolute top-2.5 left-2.5 z-10 text-[11px] font-bold px-2 py-0.5 rounded-md ${badge.className}`}>
                    {badge.label}
                </span>
            )}

            {/* Wishlist - top right */}
            <button
                onClick={toggleWishlist}
                className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm transition-all duration-200 hover:scale-110 active:scale-95 ${
                    isWishlisted ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'
                }`}
                title={isWishlisted ? 'Bo yeu thich' : 'Them vao yeu thich'}
            >
                <Heart size={16} className={isWishlisted ? 'fill-red-500' : ''} />
            </button>

            {/* Image */}
            <div className="relative aspect-[4/3] bg-white p-3 overflow-hidden">
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
                        <span className="text-4xl font-black">
                            {product.name?.charAt(0) || '?'}
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-3 pt-2 border-t border-gray-50">
                {/* Rating */}
                {rating > 0 && (
                    <div className="flex items-center gap-1 mb-1.5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Star
                                key={i}
                                size={11}
                                className={i <= rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-gray-200 text-gray-200'}
                            />
                        ))}
                        {product.reviewCount > 0 && (
                            <span className="text-[10px] text-gray-400 ml-0.5">
                                ({product.reviewCount})
                            </span>
                        )}
                    </div>
                )}

                {/* Product name */}
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem] leading-snug mb-2 group-hover:text-accent transition-colors">
                    {product.name}
                </h3>

                {/* Price */}
                <div className="mt-auto space-y-0.5">
                    {product.priceFrom != null && product.priceFrom < product.price ? (
                        <div className="flex items-baseline gap-1">
                            <span className="text-[11px] text-gray-500">Từ</span>
                            <span className="text-lg font-bold text-accent leading-tight">
                                {formatCurrency(product.priceFrom)}
                            </span>
                        </div>
                    ) : (
                        <div className="text-lg font-bold text-accent leading-tight">
                            {formatCurrency(product.price)}
                        </div>
                    )}
                    {product.oldPrice && product.oldPrice > product.price && (
                        <div className="text-xs text-gray-400 line-through">
                            {formatCurrency(oldPrice)}
                        </div>
                    )}
                </div>

                {/* Add to cart */}
                <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        isOutOfStock
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] shadow-sm'
                    }`}
                >
                    <ShoppingCart size={15} />
                    {isOutOfStock ? 'Het hang' : 'Them vao gio'}
                </button>
            </div>
        </Link>
    );
};
