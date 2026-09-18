/**
 * The buy box (right column of the PDP).
 *
 * Decisions that shape it:
 * - D01: every price is VAT-inclusive; the block says so once, here.
 * - D08: warranty / 1-đổi-1 / đổi-trả come from `ProductPolicyBlock`, which
 *        reads the two public effective-policy endpoints. No hardcoded months.
 * - D09: stock is qualitative only — "Còn hàng" / "Sắp hết hàng" / "Hết hàng".
 *        The exact quantity is never printed (it used to say "Chỉ còn 3 sản
 *        phẩm" and "{n} sản phẩm có sẵn").
 * - D04: the instalment line lives in `ProductPolicyBlock` and only appears
 *        when a partner is really configured.
 */
import { useMemo } from 'react';
import { Check, Headphones, Minus, Plus, ShoppingBag, ShoppingCart, Star, Truck } from 'lucide-react';

import type { Product, ProductVariant } from '../../api/catalog';
import { usePublicConfig } from '../../lib/use-public-config';
import { formatNumber } from '../../utils/format';
import { Badge, Button, IconButton } from '../ui';
import ProductFlashCountdown from './product-flash-countdown';
import ProductPolicyBlock from './product-policy-block';
import ProductStockByBranch from './product-stock-by-branch';
import ProductVariantSelector from './product-variant-selector';

interface ProductDetailInfoProps {
    product: Product;
    variants: ProductVariant[];
    selectedVariant?: ProductVariant;
    onVariantChange: (variant: ProductVariant) => void;
    quantity: number;
    onQuantityChange: (qty: number) => void;
    onAddToCart: () => void;
    onBuyNow: () => void;
    addingToCart: boolean;
    averageRating: number;
    reviewCount: number;
    /** Flash-sale price in force right now, when the promotion carries one. */
    flashPrice?: number | null;
    /** ISO end of that flash-sale window, for the countdown. */
    flashEndAt?: string | null;
}

/** D09 — three qualitative states, never a number. */
function stockState(available: number, lowStockThreshold?: number | null) {
    if (available <= 0) return { label: 'Hết hàng', cls: 'bg-danger-subtle text-danger border-danger/20' };
    if (available <= (lowStockThreshold ?? 5)) {
        return { label: 'Sắp hết hàng', cls: 'bg-warning-subtle text-warning border-warning/20' };
    }
    return { label: 'Còn hàng', cls: 'bg-success-subtle text-success border-success/20' };
}

export default function ProductDetailInfo({
    product, variants, selectedVariant, onVariantChange,
    quantity, onQuantityChange, onAddToCart, onBuyNow, addingToCart,
    averageRating, reviewCount, flashPrice, flashEndAt,
}: ProductDetailInfoProps) {
    const { data: config } = usePublicConfig();
    const hasVariants = variants.length > 0;
    const catalogPrice = selectedVariant?.price ?? product.price;
    const displayPrice = flashPrice && flashPrice > 0 ? flashPrice : catalogPrice;
    const displayOldPrice = flashPrice && flashPrice > 0
        ? catalogPrice
        : selectedVariant?.oldPrice ?? product.oldPrice;
    const availableStock = selectedVariant?.stockQuantity ?? product.stockQuantity;
    const stock = stockState(availableStock, product.lowStockThreshold);
    const outOfStock = availableStock <= 0;

    // "Từ X" khi có biến thể rẻ hơn biến thể đang chọn.
    const showPriceFrom = useMemo(() => {
        if (!hasVariants) return null;
        if (product.priceFrom != null && product.priceFrom < displayPrice) return product.priceFrom;
        const active = variants.filter((v) => v.status === 'Active').map((v) => v.price);
        if (active.length === 0) return null;
        const min = Math.min(...active);
        return Number.isFinite(min) && min < displayPrice ? min : null;
    }, [hasVariants, product.priceFrom, displayPrice, variants]);

    const discount = displayOldPrice && displayOldPrice > displayPrice
        ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)
        : null;

    const freeshipThreshold = Number(
        config?.find((c) => c.key === 'FREESHIP_THRESHOLD')?.value ?? NaN
    );
    const hotline = config?.find((c) => c.key === 'COMPANY_HOTLINE')?.value
        ?? config?.find((c) => c.key === 'COMPANY_PHONE')?.value;

    return (
        <div className="space-y-5">
            {/* Tên + SKU + rating */}
            <div>
                <h1 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-fg">{product.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="neutral">SKU: {selectedVariant?.sku || product.sku}</Badge>
                    {reviewCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-sunken px-1.5 py-0.5 text-xs">
                            <Star className="h-3.5 w-3.5 fill-current text-rating" aria-hidden="true" />
                            <span className="num font-bold text-fg">{averageRating.toFixed(1)}</span>
                            <span className="num text-fg-subtle">({reviewCount} đánh giá)</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Giá — D01: mọi giá đã bao gồm VAT */}
            <div className="rounded-xl border border-brand-line bg-brand-subtle/50 p-4">
                <div className="mb-1 flex min-h-[18px] items-center gap-2 text-[13px]">
                    {displayOldPrice && displayOldPrice > displayPrice && (
                        <>
                            <span className="num text-fg-subtle line-through">{formatNumber(displayOldPrice)}₫</span>
                            {discount != null && (
                                <span className="num font-semibold text-savings">(Tiết kiệm {discount}%)</span>
                            )}
                        </>
                    )}
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                    {showPriceFrom != null && !selectedVariant && (
                        <span className="text-sm text-fg-subtle">Từ</span>
                    )}
                    <span className="num price text-[28px] font-bold leading-none text-brand-text">
                        {formatNumber(showPriceFrom != null && !selectedVariant ? showPriceFrom : displayPrice)}
                        <sup className="ml-0.5 text-sm font-bold">₫</sup>
                    </span>
                    {flashPrice && flashPrice > 0 && <Badge variant="discount">Giá Flash Sale</Badge>}
                </div>
                <p className="mt-1.5 text-xs text-fg-subtle">Giá đã bao gồm VAT</p>
                {flashPrice && flashPrice > 0 && <ProductFlashCountdown endAt={flashEndAt} />}
            </div>

            {hasVariants && (
                <ProductVariantSelector
                    variants={variants}
                    selectedVariantId={selectedVariant?.id}
                    onVariantChange={onVariantChange}
                />
            )}

            {/* D09: trạng thái tồn định tính, không lộ số lượng */}
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${stock.cls}`}>
                {!outOfStock && <Check className="h-4 w-4" aria-hidden="true" />}
                <span>{stock.label}</span>
            </div>

            {/* Số lượng */}
            <div className="flex items-center gap-4">
                <div className="flex items-center rounded-lg border border-control-line bg-surface">
                    <IconButton
                        aria-label="Giảm số lượng"
                        variant="ghost"
                        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1 || outOfStock}
                    >
                        <Minus />
                    </IconButton>
                    <input
                        type="number"
                        aria-label="Số lượng"
                        value={quantity}
                        onChange={(e) => onQuantityChange(
                            Math.max(1, Math.min(Math.max(availableStock, 1), Number(e.target.value) || 1))
                        )}
                        className="num h-10 w-14 border-x border-line bg-surface text-center text-sm font-bold text-fg focus:outline-none"
                        min={1}
                        max={Math.max(availableStock, 1)}
                        disabled={outOfStock}
                    />
                    <IconButton
                        aria-label="Tăng số lượng"
                        variant="ghost"
                        onClick={() => onQuantityChange(Math.min(availableStock, quantity + 1))}
                        disabled={quantity >= availableStock || outOfStock}
                    >
                        <Plus />
                    </IconButton>
                </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                    className="flex-[3]"
                    onClick={onBuyNow}
                    disabled={outOfStock}
                    loading={addingToCart}
                >
                    <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" /> MUA NGAY
                </Button>
                <Button
                    className="flex-[2]"
                    variant="secondary"
                    onClick={onAddToCart}
                    disabled={outOfStock}
                    loading={addingToCart}
                >
                    <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
                    THÊM VÀO GIỎ
                </Button>
            </div>

            {/* D09: một cửa hàng ⇒ một dòng "Có sẵn tại" */}
            <ProductStockByBranch productId={product.id} inStock={!outOfStock} />

            {/* Trust badges — số liệu lấy từ cấu hình, không viết cứng */}
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                {Number.isFinite(freeshipThreshold) && freeshipThreshold > 0 && (
                    <div className="flex flex-col items-center rounded-xl border border-line bg-sunken p-3 text-center">
                        <Truck className="mb-1.5 h-5 w-5 text-fg-subtle" aria-hidden="true" />
                        <span className="text-xs font-semibold leading-tight text-fg">Miễn phí vận chuyển</span>
                        <span className="num mt-0.5 text-[11px] text-fg-subtle">
                            Đơn từ {formatNumber(freeshipThreshold)}₫
                        </span>
                    </div>
                )}
                {hotline && (
                    <div className="flex flex-col items-center rounded-xl border border-line bg-sunken p-3 text-center">
                        <Headphones className="mb-1.5 h-5 w-5 text-fg-subtle" aria-hidden="true" />
                        <span className="text-xs font-semibold leading-tight text-fg">Tư vấn kỹ thuật</span>
                        <a href={`tel:${hotline}`} className="num mt-0.5 text-[11px] text-brand-text hover:underline">
                            {hotline}
                        </a>
                    </div>
                )}
            </div>

            {/* D08 — bảo hành / đổi trả / trả góp, mọi con số từ API chính sách */}
            <ProductPolicyBlock productId={product.id} isReturnExcluded={product.isReturnExcluded} />
        </div>
    );
}
