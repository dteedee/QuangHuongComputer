import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../hooks/useProducts';
import { ShoppingCart, Star, PackageCheck, MapPin, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCardProps {
    product: Product;
}

// Parse specifications string into structured data
const parseSpecifications = (specs?: string) => {
    if (!specs) return null;

    try {
        const parsed = JSON.parse(specs);
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
                    <div className="bg-[#D70018] text-white p-3">
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
                                <span className="text-gray-400 line-through">{oldPrice.toLocaleString()}đ</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">- Giá QH:</span>
                                <span className="text-[#D70018] font-bold text-base">{product.price.toLocaleString()}đ</span>
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
                                <MapPin size={14} className="text-[#D70018]" />
                                <span className="font-medium">Kho hàng:</span>
                            </div>
                            <div className="pl-5 space-y-1">
                                {locations.length > 0 ? (
                                    locations.map((store: { city: string, address: string }, idx: number) => (
                                        <div key={idx} className="flex items-start gap-1 text-xs">
                                            <MapPin size={10} className="text-[#D70018] mt-0.5 flex-shrink-0" />
                                            <span className="text-[#D70018]">
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
                            className="flex-1 bg-[#D70018] text-white text-center py-2 rounded-lg text-sm font-bold hover:bg-[#b5001a] transition-colors"
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
    const [showPopup, setShowPopup] = useState(false);
    const [cardRect, setCardRect] = useState<DOMRect | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const isHovering = useRef(false);
    const timeoutRef = useRef<number | null>(null);

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
        isHovering.current = true;
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        // Show popup after short delay
        timeoutRef.current = window.setTimeout(openPopup, 150);
    }, [openPopup]);

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
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.3 }}
                    className={`group relative bg-white border rounded-lg overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300
                        ${showPopup ? 'border-[#D70018] shadow-xl z-30' : 'border-gray-200 hover:border-[#D70018]'}`}
                >
                    {/* Discount Badge */}
                    <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-2 left-2 z-20"
                    >
                        <div className="bg-[#D70018] text-white text-[11px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg shadow-md">
                            -{discount}%
                        </div>
                    </motion.div>

                    {/* Hot/New Badge */}
                    {(product.soldCount > 10 || Math.random() > 0.6) && (
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-2 right-2 z-20"
                        >
                            <div className="bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm uppercase">
                                Bán chạy
                            </div>
                        </motion.div>
                    )}

                    {/* Product Image Area */}
                    <Link to={`/product/${product.id}`} className="block relative pt-[100%] bg-white group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center text-gray-300 border border-gray-100">
                                    <span className="text-5xl font-black">{product.name.charAt(0)}</span>
                                </div>
                            )}
                        </div>
                    </Link>

                    {/* Info Area */}
                    <div className="p-4 flex flex-col flex-1 border-t border-gray-50">
                        <div className="mb-2 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                    key={i}
                                    size={10}
                                    className={`${i <= Math.round(product.averageRating || 5) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
                                />
                            ))}
                            <span className="text-[10px] text-gray-400 ml-1">( Mã: {product.sku || `QH-${product.id.substring(0, 4)}`} )</span>
                        </div>

                        <Link to={`/product/${product.id}`} className="mb-3 block">
                            <h3 className="text-sm font-bold text-gray-800 group-hover:text-[#D70018] transition-colors line-clamp-2 min-h-[40px] leading-tight uppercase italic tracking-tighter">
                                {product.name}
                            </h3>
                        </Link>

                        <div className="mt-auto space-y-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 line-through leading-none">{oldPrice.toLocaleString()}đ</span>
                                <span className="text-lg font-black text-[#D70018] leading-tight">{product.price.toLocaleString()}đ</span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <span className={`flex items-center gap-1 text-[11px] font-bold ${product.stockQuantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <PackageCheck size={14} />
                                    {product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                                </span>

                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product); }}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-[#D70018] hover:text-white transition-all active:scale-95"
                                    title="Thêm vào giỏ hàng"
                                >
                                    <ShoppingCart size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick view overlay on hover */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 duration-300">
                        <Link
                            to={`/product/${product.id}`}
                            className="bg-white/95 backdrop-blur text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-2xl border border-gray-100 hover:bg-[#D70018] hover:text-white transition-all transform hover:scale-110 active:scale-95"
                        >
                            Xem nhanh
                        </Link>
                    </div>
                </motion.div>
            </div>

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
