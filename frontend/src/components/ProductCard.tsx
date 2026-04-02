import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../hooks/useProducts';
import { ShoppingCart, Star, PackageCheck, MapPin, Cpu, Minus, Plus, Heart, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/format';

interface ProductCardProps {
    product: Product;
}

// Parse specifications string into structured data
const parseSpecifications = (specs?: string) => {
    if (!specs) return null;

    try {
        const parsed = JSON.parse(specs);
        if (Array.isArray(parsed)) {
            const res: Record<string, string> = {};
            parsed.forEach((item: any) => {
                if (item && item.label) res[item.label] = item.value;
            });
            return res;
        }
        return parsed;
    } catch {
        const result: Record<string, string> = {};
        const lines = specs.split('\n').filter(Boolean);
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length) {
                result[key.trim()] = valueParts.join(':').trim();
            }
        });
        return Object.keys(result).length > 0 ? result : null;
    }
};

// Helper to parse locations
const parseStockLocations = (locationsJson?: string) => {
    if (!locationsJson) return [];
    try {
        return JSON.parse(locationsJson);
    } catch {
        return [];
    }
};

// Popup component rendered via Portal
const ProductHoverPopup = ({
    product,
    cardRect,
    onMouseEnter,
    onMouseLeave,
    addToCart,
    isVisible
}: {
    product: Product;
    cardRect: DOMRect;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    addToCart: (product: Product) => void;
    isVisible: boolean;
}) => {
    const oldPrice = product.oldPrice || product.price * 1.15;
    const specs = parseSpecifications(product.specifications);
    const locations = parseStockLocations(product.stockLocations);

    // Calculate position
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const popupWidth = 380;
    const popupHeight = 450; // Estimated max height

    // Determine horizontal position
    let left = cardRect.right + 10;
    const showOnLeft = left + popupWidth > windowWidth;
    if (showOnLeft) {
        left = cardRect.left - popupWidth - 10;
    }
    // Ensure horizontal safety
    left = Math.max(10, Math.min(left, windowWidth - popupWidth - 10));

    // Determine vertical position
    let top = cardRect.top;
    // If popup goes below viewport, shift up
    if (top + popupHeight > windowHeight) {
        top = Math.max(10, windowHeight - popupHeight - 10);
    }

    const style: React.CSSProperties = {
        position: 'fixed',
        top: top,
        left: left,
        width: popupWidth,
        zIndex: 100000, // Very high z-index
        pointerEvents: 'auto', // Ensure interaction
    };

    return createPortal(
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: showOnLeft ? 20 : -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={style}
                    className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden ring-1 ring-black/5"
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    {/* Header */}
                    <div className="bg-accent text-white p-3">
                        <h4 className="font-bold text-sm leading-tight line-clamp-2">
                            {product.name}
                        </h4>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto text-sm">
                        {/* Price Info */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">- Giá bán:</span>
                                <span className="text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">- Giá QH:</span>
                                <span className="text-accent font-bold text-base">{formatCurrency(product.price)}</span>
                                <span className="text-xs text-gray-400">[Đã bao gồm VAT]</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">- Bảo hành:</span>
                                <span className="text-gray-800 font-medium">{product.warrantyInfo || '12 Tháng'}</span>
                            </div>
                        </div>

                        {/* Store Locations */}
                        <div className="space-y-2 border-t border-gray-100 pt-3">
                            <div className="flex items-center gap-2 text-gray-600">
                                <MapPin size={14} className="text-accent" />
                                <span className="font-medium">Kho hàng:</span>
                            </div>
                            <div className="pl-5 space-y-1">
                                {locations.length > 0 ? (
                                    locations.map((store: { city: string, address: string }, idx: number) => (
                                        <div key={idx} className="flex items-start gap-1 text-xs">
                                            <MapPin size={10} className="text-accent mt-0.5 flex-shrink-0" />
                                            <span className="text-accent">
                                                {store.address}
                                                {store.city && ` - ${store.city}`}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-gray-500 italic">
                                        Liên hệ để kiểm tra tình trạng kho
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Specifications */}
                        <div className="border-t border-gray-100 pt-3">
                            <div className="flex items-center gap-2 mb-2 bg-gray-100 -mx-4 px-4 py-2">
                                <Cpu size={14} className="text-gray-600" />
                                <span className="font-bold text-gray-800">Thông số sản phẩm</span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                                {specs ? (
                                    Object.entries(specs).slice(0, 6).map(([key, value]) => (
                                        <div key={key} className="flex gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                                            <span className="text-gray-500 min-w-[70px] max-w-[80px]">{key}:</span>
                                            <span className="text-gray-800 font-medium truncate">{String(value)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-400 italic text-xs">Đang cập nhật thông số kỹ thuật...</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-gray-100 p-3 flex gap-2 bg-gray-50">
                        <Link
                            to={`/product/${product.id}`}
                            className="flex-1 bg-accent text-white text-center py-2 rounded-lg text-sm font-bold hover:bg-[#b5001a] transition-colors"
                        >
                            Xem chi tiết
                        </Link>
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product); }}
                            className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <ShoppingCart size={16} />
                            Mua ngay
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export const ProductCard = ({ product }: ProductCardProps) => {
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [showPopup, setShowPopup] = useState(false);
    const [showQuickView, setShowQuickView] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [cardRect, setCardRect] = useState<DOMRect | null>(null);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const isHovering = useRef(false);
    const timeoutRef = useRef<number | null>(null);

    // Initialize Wishlist State
    useEffect(() => {
        const stored = localStorage.getItem('qh_wishlist');
        if (stored) {
            try {
                const list = JSON.parse(stored);
                setIsWishlisted(list.includes(product.id));
            } catch (e) {}
        }
    }, [product.id]);

    const toggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const stored = localStorage.getItem('qh_wishlist');
        let list: string[] = [];
        if (stored) {
            try { list = JSON.parse(stored); } catch (e) {}
        }
        
        if (isWishlisted) {
            list = list.filter(id => id !== product.id);
        } else {
            list.push(product.id);
        }
        
        localStorage.setItem('qh_wishlist', JSON.stringify(list));
        setIsWishlisted(!isWishlisted);
    };

    // Detect touch device — disable hover popup on mobile
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Calculate mock discount
    const oldPrice = product.oldPrice || product.price * 1.15;
    const discount = product.oldPrice
        ? Math.round((1 - product.price / product.oldPrice) * 100)
        : 15;

    const openPopup = useCallback(() => {
        if (cardRef.current) {
            setCardRect(cardRef.current.getBoundingClientRect());
            setShowPopup(true);
        }
    }, [product.name]);

    const closePopup = useCallback(() => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
            if (!isHovering.current) {
                setShowPopup(false);
            }
        }, 200);
    }, []);

    const handleCardMouseEnter = useCallback(() => {
        if (isTouchDevice) return; // Skip hover on touch devices
        isHovering.current = true;
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        // Show popup after short delay
        timeoutRef.current = window.setTimeout(openPopup, 150);
    }, [openPopup, isTouchDevice]);

    const handleCardMouseLeave = useCallback(() => {
        isHovering.current = false;
        closePopup();
    }, [closePopup]);

    const handlePopupMouseEnter = useCallback(() => {
        isHovering.current = true;
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
    }, []);

    const handlePopupMouseLeave = useCallback(() => {
        isHovering.current = false;
        closePopup();
    }, [closePopup]);

    useEffect(() => {
        setImgError(false);
    }, [product.imageUrl]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <>
            <div
                ref={cardRef}
                className="relative"
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={`group relative bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300
                        ${showPopup ? 'border-accent shadow-xl ring-1 ring-accent/20 z-30' : 'border-gray-100 dark:border-gray-800 hover:border-accent/40 shadow-sm hover:shadow-xl'}`}
                >
                    {/* Discount Badge */}
                    <div className="absolute top-3 left-3 z-20">
                        <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                            -{discount}%
                        </div>
                    </div>

                    {/* Hot/New Badge */}
                    {product.soldCount > 10 && (
                        <div className="absolute top-3 right-3 z-20">
                            <div className="bg-amber-400 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm uppercase tracking-wide">
                                Bán chạy
                            </div>
                        </div>
                    )}

                    {/* Wishlist Button */}
                    <button 
                        onClick={toggleWishlist}
                        className={`absolute z-20 ${product.soldCount > 10 ? 'top-10' : 'top-3'} right-3 p-2 rounded-full backdrop-blur-md bg-white/70 dark:bg-gray-800/70 shadow-sm border border-white/50 dark:border-gray-700 transition-all hover:scale-110 active:scale-95 ${isWishlisted ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title={isWishlisted ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                    >
                        <Heart size={18} className={isWishlisted ? 'fill-red-500' : ''} />
                    </button>

                    {/* Product Image Area */}
                    <Link to={`/product/${product.id}`} className="block relative pt-[100%] bg-white dark:bg-gray-900 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center p-1">
                            {product.imageUrl && !imgError ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center text-gray-300 border border-gray-100 dark:border-gray-800">
                                    <span className="text-5xl font-black">{product?.name?.charAt(0) || '?'}</span>
                                </div>
                            )}
                        </div>
                    </Link>

                    {/* Info Area */}
                    <div className="p-4 flex flex-col flex-1 border-t border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-900 group-hover:bg-red-50/10 dark:group-hover:bg-red-900/10 transition-colors">
                        <div className="mb-2 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                    key={i}
                                    size={12}
                                    className={`${i <= Math.round(product.averageRating || 5) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
                                />
                            ))}
                            <span className="text-xs text-gray-400 ml-1 font-medium">Mã: {product.sku || `QH-${product.id.substring(0, 4)}`}</span>
                        </div>

                        <Link to={`/product/${product.id}`} className="mb-3 block">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-accent transition-colors line-clamp-2 min-h-[40px] leading-relaxed group-hover:underline">
                                {product.name}
                            </h3>
                        </Link>

                        <div className="mt-auto space-y-3">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 line-through mb-0.5">{formatCurrency(oldPrice)}</span>
                                <span className="text-lg font-bold text-accent">{formatCurrency(product.price)}</span>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                                <span className={`flex items-center gap-1 text-xs font-semibold ${product.stockQuantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <PackageCheck size={14} />
                                    {product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                                </span>

                                <div className="flex items-center gap-1">
                                    {/* Quantity Selector */}
                                    <div
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 mr-1"
                                    >
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-accent hover:bg-white dark:hover:bg-gray-700 rounded-md transition-all disabled:opacity-50"
                                            disabled={quantity <= 1}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-6 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-accent hover:bg-white dark:hover:bg-gray-700 rounded-md transition-all disabled:opacity-50"
                                            disabled={quantity >= product.stockQuantity}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    {/* Add to Cart Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addToCart(product, quantity);
                                            setQuantity(1); // Reset interaction
                                        }}
                                        className="w-10 h-10 flex items-center justify-center bg-accent text-white rounded-xl hover:bg-[#b5001a] transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={product.stockQuantity === 0}
                                        title="Thêm vào giỏ hàng"
                                    >
                                        <ShoppingCart size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick view overlay on hover */}
                    <div className="absolute inset-x-0 top-[40%] flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 duration-300 pointer-events-none">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                closePopup();
                                setShowQuickView(true);
                            }}
                            className="pointer-events-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-xs font-bold uppercase text-accent px-6 py-2.5 rounded-full shadow-xl border border-white/50 dark:border-gray-700 hover:bg-accent hover:text-white transition-all transform hover:scale-105 active:scale-95"
                        >
                            Xem nhanh
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Quick View Modal Overlay (Portal) */}
            <AnimatePresence>
                {showQuickView && createPortal(
                    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowQuickView(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col md:flex-row z-10"
                        >
                            <button 
                                onClick={() => setShowQuickView(false)}
                                className="absolute top-4 right-4 z-20 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors backdrop-blur-sm"
                            >
                                <CloseIcon size={20} />
                            </button>
                            
                            {/* Image Half */}
                            <div className="md:w-1/2 bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-8 relative">
                                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                    Giảm {discount}%
                                </div>
                                {product.imageUrl && !imgError ? (
                                    <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="w-full max-h-[400px] object-contain mix-blend-multiply"
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    <span className="text-8xl font-black text-gray-200">{product?.name?.charAt(0) || '?'}</span>
                                )}
                            </div>

                            {/* Details Half */}
                            <div className="md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">SKU: {product.sku || product.id.substring(0,8)}</span>
                                <h2 className="text-2xl font-black text-gray-900 leading-tight mb-4">{product.name}</h2>
                                
                                <div className="flex flex-wrap items-baseline gap-3 mb-6">
                                    <span className="text-3xl font-black text-accent">{formatCurrency(product.price)}</span>
                                    <span className="text-lg text-gray-400 line-through font-medium">{formatCurrency(oldPrice)}</span>
                                </div>

                                <div className="space-y-4 mb-8 flex-1">
                                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100">
                                        <PackageCheck size={20} />
                                        <span className="font-bold text-sm">Trạng thái: {product.stockQuantity > 0 ? `Còn ${product.stockQuantity} sản phẩm` : 'Hết hàng'}</span>
                                    </div>

                                    {/* Brief Specs */}
                                    <h4 className="font-bold text-gray-900 border-b pb-2">Đặc điểm nổi bật</h4>
                                    <ul className="text-sm text-gray-600 space-y-2">
                                        <li>• Bảo hành chính hãng: {product.warrantyInfo || '12 tháng'}</li>
                                        {parseSpecifications(product.specifications) && Object.entries(parseSpecifications(product.specifications)!).slice(0, 4).map(([key, value]) => (
                                            <li key={key}>• {key}: <span className="font-medium text-gray-900">{String(value)}</span></li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Cart CTA */}
                                <div className="pt-6 border-t border-gray-100">
                                    <div className="flex gap-4">
                                        <Link 
                                            to={`/product/${product.id}`}
                                            className="flex-1 py-4 border-2 border-gray-200 text-gray-700 text-center rounded-xl font-bold hover:bg-gray-50 transition-colors"
                                        >
                                            Xem chi tiết đầy đủ
                                        </Link>
                                        <button 
                                            onClick={() => {
                                                addToCart(product, 1);
                                                setShowQuickView(false);
                                            }}
                                            disabled={product.stockQuantity <= 0}
                                            className="flex-1 py-4 bg-accent text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                                        >
                                            <ShoppingCart size={20} />
                                            THÊM GIỎ HÀNG
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </AnimatePresence>

            {/* Hover Popup - Rendered via Portal by itself, controlled via isVisible prop */}
            {cardRect && (
                <ProductHoverPopup
                    product={product}
                    cardRect={cardRect}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                    addToCart={addToCart}
                    isVisible={showPopup}
                />
            )}
        </>
    );
};
