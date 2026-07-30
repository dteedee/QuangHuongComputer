import { useMemo } from 'react';
import { Minus, Plus, ShoppingCart, ShoppingBag, Check, Star, Truck, Shield, Headphones } from 'lucide-react';
import type { Product, ProductVariant, StockByBranch } from '../../api/catalog';
import { formatCurrency } from '../../utils/format';
import ProductVariantSelector from './product-variant-selector';
import ProductStockByBranch from './product-stock-by-branch';

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
    stockByBranch?: StockByBranch[];
}

/** Cột phải trang chi tiết: giá, biến thể, tồn, nút mua. */
export default function ProductDetailInfo({
    product, variants, selectedVariant, onVariantChange,
    quantity, onQuantityChange, onAddToCart, onBuyNow, addingToCart,
    averageRating, reviewCount, stockByBranch,
}: ProductDetailInfoProps) {
    const hasVariants = variants.length > 0;
    const displayPrice = selectedVariant?.price ?? product.price;
    const displayOldPrice = selectedVariant?.oldPrice ?? product.oldPrice;
    const availableStock = selectedVariant?.stockQuantity ?? product.stockQuantity;

    // Giá "từ X" khi có biến thể và giá thấp nhất < giá hiện tại
    const showPriceFrom = useMemo(() => {
        if (!hasVariants) return null;
        if (product.priceFrom != null && product.priceFrom < displayPrice) return product.priceFrom;
        const min = Math.min(...variants.filter((v) => v.status === 'Active').map((v) => v.price));
        return Number.isFinite(min) && min < displayPrice ? min : null;
    }, [hasVariants, product.priceFrom, displayPrice, variants]);

    const discount = displayOldPrice && displayOldPrice > displayPrice
        ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)
        : null;

    return (
        <div className="space-y-5">
            {/* Tên + SKU + rating */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{product.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                        SKU: {selectedVariant?.sku || product.sku}
                    </span>
                    {averageRating > 0 && (
                        <span className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded text-xs">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="font-bold text-gray-700">{averageRating.toFixed(1)}</span>
                            <span className="text-gray-500">({reviewCount})</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Giá */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-baseline gap-3 flex-wrap">
                    {showPriceFrom != null && !selectedVariant ? (
                        <>
                            <span className="text-sm text-gray-500">Từ</span>
                            <span className="text-2xl font-bold text-[var(--accent-primary)]">{formatCurrency(showPriceFrom)}</span>
                        </>
                    ) : (
                        <span className="text-2xl font-bold text-[var(--accent-primary)]">{formatCurrency(displayPrice)}</span>
                    )}
                    {displayOldPrice && displayOldPrice > displayPrice && (
                        <>
                            <span className="text-gray-400 line-through text-sm">{formatCurrency(displayOldPrice)}</span>
                            {discount && (
                                <span className="bg-red-50 text-[var(--accent-primary)] border border-red-100 px-2 py-0.5 rounded text-xs font-semibold">
                                    -{discount}%
                                </span>
                            )}
                        </>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Giá đã bao gồm VAT</p>
            </div>

            {/* Chọn biến thể */}
            {hasVariants && (
                <ProductVariantSelector
                    variants={variants}
                    selectedVariantId={selectedVariant?.id}
                    onVariantChange={onVariantChange}
                />
            )}

            {/* Trạng thái tồn */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
                availableStock > 10
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : availableStock > 0
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
                {availableStock > 10 && <Check className="w-4 h-4" />}
                <span>
                    {availableStock > 10
                        ? 'Còn hàng'
                        : availableStock > 0
                            ? `Chỉ còn ${availableStock} sản phẩm`
                            : 'Hết hàng'}
                </span>
            </div>

            {/* Số lượng */}
            <div className="flex items-center gap-4">
                <div className="flex items-center rounded-xl border border-gray-200 bg-white">
                    <button
                        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40 cursor-pointer rounded-l-xl"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => onQuantityChange(Math.max(1, Math.min(availableStock, Number(e.target.value))))}
                        className="w-14 h-10 text-center border-x border-gray-200 focus:outline-none font-bold text-gray-900 text-sm"
                        min={1}
                        max={availableStock}
                    />
                    <button
                        onClick={() => onQuantityChange(Math.min(availableStock, quantity + 1))}
                        disabled={quantity >= availableStock}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40 cursor-pointer rounded-r-xl"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <span className="text-gray-500 text-xs">{availableStock} sản phẩm có sẵn</span>
            </div>

            {/* Nút hành động */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={onBuyNow}
                    disabled={availableStock === 0}
                    className="flex-[2] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                    <ShoppingBag className="w-5 h-5" /> MUA NGAY
                </button>
                <button
                    onClick={onAddToCart}
                    disabled={availableStock === 0 || addingToCart}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold cursor-pointer"
                >
                    <ShoppingCart className="w-5 h-5" />
                    {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}
                </button>
            </div>

            {/* Tồn theo chi nhánh */}
            <ProductStockByBranch
                productId={product.id}
                variantId={selectedVariant?.id}
                initialData={stockByBranch}
            />

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                {[
                    { icon: Truck, title: 'Miễn phí vận chuyển', sub: 'Đơn hàng > 5tr' },
                    { icon: Shield, title: 'Bảo hành chính hãng', sub: product.warrantyInfo || '12 tháng' },
                    { icon: Headphones, title: 'Hỗ trợ 24/7', sub: '0904.235.090' },
                ].map(({ icon: Icon, title, sub }) => (
                    <div key={title} className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <Icon className="w-5 h-5 text-gray-400 mb-1.5" />
                        <span className="text-xs font-semibold text-gray-900 leading-tight">{title}</span>
                        <span className="text-[11px] text-gray-500 mt-0.5">{sub}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
