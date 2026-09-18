/**
 * ProductCard — THE product tile. One component for the homepage sections, the
 * listing grid, search results and every carousel.
 *
 * Anatomy (design-direction.md §6): image on `--stage` → badges → rating + SKU →
 * name (3 lines) → old price + saving → price → stock + add-to-cart.
 *
 * Badges are REAL only (phase §8): discount %, flash sale, out of stock. The
 * invented "Quà tặng"/"Voucher" pills the audit found are gone and do not come
 * back until a promotion payload actually carries a gift.
 *
 * Props are a stable contract consumed by W3-7/W3-8/W3-9: `{ product,
 * onAddToCart?, variant? }` (+ optional `flash`, additive).
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShoppingCart, Star, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Product } from '../hooks/useProducts';
import { Img, Price, formatDong } from './ui';
import { buildPath, ROUTES } from '../routes/route-paths';

/** Flash-sale terms for this product, from `GET /api/content/promotions/active`. */
export interface ProductCardFlash {
    flashPrice: number;
    remaining: number | null;
    quantityLimit: number | null;
    soldCount: number;
}

export interface ProductCardProps {
    product: Product & { thumbnailUrl?: string | null };
    /** Overrides the default cart add (the PDP/compare pages pass their own). */
    onAddToCart?: (product: Product) => void | Promise<void>;
    variant?: 'grid' | 'compact';
    flash?: ProductCardFlash;
}

export const ProductCard = ({ product, onAddToCart, variant = 'grid', flash }: ProductCardProps) => {
    const { addToCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);
    const [justAdded, setJustAdded] = useState(false);
    const addedTimer = useRef<number | undefined>(undefined);

    // A flash tile only overrides the price when the promotion really carries
    // one (`FlashPrice` is nullable server-side) — otherwise the card falls back
    // to the catalogue price instead of printing 0 ₫.
    const hasFlashPrice = !!flash && Number.isFinite(flash.flashPrice) && flash.flashPrice > 0;
    const price = hasFlashPrice ? flash!.flashPrice : product.price;
    const compareAt = hasFlashPrice ? product.price : product.oldPrice ?? null;
    const isOutOfStock = product.stockQuantity <= 0 || product.status === 'OutOfStock';
    const isSoldOut = flash ? flash.remaining !== null && flash.remaining <= 0 : false;
    const disabled = isOutOfStock || isSoldOut;
    const discount = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
    const rating = Math.round(product.averageRating || 0);
    // Slug is the canonical PDP URL; the legacy `/product/:id` route stays live
    // for rows whose slug has not been generated yet (storefront-product.routes.ts).
    const productUrl = product.slug
        ? buildPath(ROUTES.PRODUCT_DETAIL, product.slug)
        : `/product/${product.id}`;
    // D02: cards prefer the primary-media thumbnail; `Img` resolves `/media/...`.
    const image = product.thumbnailUrl || product.imageUrl;

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAdding || disabled) return;
        setIsAdding(true);
        try {
            if (onAddToCart) await onAddToCart(product);
            else await addToCart(product, 1);
            setJustAdded(true);
            addedTimer.current = window.setTimeout(() => setJustAdded(false), 1200);
        } finally {
            setIsAdding(false);
        }
    };

    const soldProgress =
        flash && flash.quantityLimit
            ? Math.min(100, Math.round((flash.soldCount / flash.quantityLimit) * 100))
            : null;

    return (
        <Link
            to={productUrl}
            aria-label={`${product.name} — ${formatDong(price)} đồng`}
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition duration-220 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md motion-reduce:transform-none"
        >
            <div className="relative">
                <Img
                    src={image}
                    alt={product.name}
                    ratio="1/1"
                    fit="contain"
                    blend
                    wrapperClassName="rounded-t-2xl"
                    className="p-3 transition-transform duration-360 ease-out group-hover:scale-[1.02] motion-reduce:transform-none"
                />
                <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                    {flash && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-brand px-1.5 py-0.5 text-2xs font-bold uppercase text-white">
                            <Zap size={10} className="fill-current" aria-hidden /> Flash sale
                        </span>
                    )}
                    {discount > 0 && (
                        <span className="rounded-sm bg-fg px-1.5 py-0.5 text-2xs font-bold text-bg">-{discount}%</span>
                    )}
                    {disabled && (
                        <span className="rounded-sm bg-fg-subtle px-1.5 py-0.5 text-2xs font-semibold text-white">
                            {isSoldOut ? 'Hết suất' : 'Hết hàng'}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col border-t border-line px-3 pb-3 pt-2">
                <div className="mb-1 flex h-4 items-center gap-1 overflow-hidden text-2xs">
                    {rating > 0 ? (
                        <span className="flex shrink-0 items-center" aria-label={`${rating} trên 5 sao`}>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                    key={i}
                                    size={10}
                                    aria-hidden
                                    className={i <= rating ? 'fill-rating text-rating' : 'fill-line text-line'}
                                />
                            ))}
                        </span>
                    ) : (
                        <span className="shrink-0 text-fg-subtle">Chưa có đánh giá</span>
                    )}
                    <span className="ml-1 truncate text-fg-subtle">Mã: {product.sku}</span>
                </div>

                <h3 className="mb-1.5 line-clamp-3 min-h-[3.1em] text-sm font-medium leading-snug text-fg transition-colors duration-140 group-hover:text-brand-text">
                    {product.name}
                </h3>

                <div className="mt-auto space-y-2">
                    <Price value={price} compareAt={compareAt} showDiscount={false} className="flex-wrap" />

                    {soldProgress !== null && (
                        <div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                                <div className="h-full rounded-full bg-brand" style={{ width: `${soldProgress}%` }} />
                            </div>
                            <p className="mt-1 text-2xs text-fg-muted">
                                Đã bán {flash!.soldCount}/{flash!.quantityLimit}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-2xs font-semibold ${disabled ? 'text-fg-subtle' : 'text-stock'}`}>
                            {disabled ? (isSoldOut ? 'Hết suất ưu đãi' : 'Hết hàng') : '✓ Sẵn hàng'}
                        </span>
                        {variant === 'grid' && (
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={disabled || isAdding}
                                aria-label={justAdded ? `Đã thêm ${product.name} vào giỏ hàng` : `Thêm ${product.name} vào giỏ hàng`}
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition duration-220 ease-back ${
                                    disabled
                                        ? 'cursor-not-allowed bg-sunken text-fg-subtle'
                                        : justAdded
                                          ? 'scale-110 bg-success text-white'
                                          : 'bg-brand text-white shadow-sm hover:bg-brand-hover active:scale-95'
                                } ${isAdding ? 'cursor-wait opacity-70' : ''}`}
                            >
                                {justAdded ? <Check size={16} aria-hidden /> : <ShoppingCart size={16} aria-hidden />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
