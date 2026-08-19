import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductMedia } from '../../api/catalog';
import ProductVideoPlayer from './product-video-player';
import ProductMediaLightbox from './product-media-lightbox';

interface ProductMediaGalleryProps {
    medias: ProductMedia[];
    productName: string;
    /** Ưu tiên hiển thị media của biến thể này (khi user chọn variant có ảnh riêng). */
    activeVariantId?: string;
    /** Fallback khi không có medias — dùng ImageUrl cũ. */
    fallbackImageUrl?: string;
    /** Discount badge góc trái, tuỳ chọn. */
    discountBadge?: number | null;
}

/**
 * Gallery đa media (ảnh + video + YouTube) — thumbnail dọc trên desktop, ngang trên mobile.
 * Hỗ trợ vuốt trên mobile, phím ← → trên desktop, zoom khi rê chuột (ảnh), lightbox khi bấm.
 */
export default function ProductMediaGallery({
    medias, productName, activeVariantId, fallbackImageUrl, discountBadge,
}: ProductMediaGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null);
    const mainRef = useRef<HTMLDivElement | null>(null);
    const touchStartX = useRef<number | null>(null);

    // Ưu tiên media theo biến thể; nếu không có, dùng toàn bộ.
    const displayMedias = useMemo<ProductMedia[]>(() => {
        if (medias.length === 0 && fallbackImageUrl) {
            return [{
                id: 'legacy-image',
                productId: '',
                type: 'Image' as const,
                url: fallbackImageUrl,
                sortOrder: 0,
                isPrimary: true,
            }];
        }
        if (activeVariantId) {
            const filtered = medias.filter((m) => !m.variantId || m.variantId === activeVariantId);
            if (filtered.length > 0) return filtered;
        }
        return medias;
    }, [medias, activeVariantId, fallbackImageUrl]);

    // Reset khi biến thể đổi → về media chính (isPrimary hoặc index 0).
    useEffect(() => {
        const primaryIdx = displayMedias.findIndex((m) => m.isPrimary);
        setSelectedIndex(primaryIdx >= 0 ? primaryIdx : 0);
    }, [displayMedias.length, activeVariantId]);

    const handlePrev = useCallback(() => {
        setSelectedIndex((i) => (i - 1 + displayMedias.length) % displayMedias.length);
    }, [displayMedias.length]);

    const handleNext = useCallback(() => {
        setSelectedIndex((i) => (i + 1) % displayMedias.length);
    }, [displayMedias.length]);

    // Keyboard navigation
    useEffect(() => {
        if (lightboxOpen) return;
        const handler = (e: KeyboardEvent) => {
            const active = document.activeElement;
            if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
            if (e.key === 'ArrowLeft') handlePrev();
            else if (e.key === 'ArrowRight') handleNext();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handlePrev, handleNext, lightboxOpen]);

    // Touch swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 50) {
            if (delta > 0) handlePrev();
            else handleNext();
        }
        touchStartX.current = null;
    };

    // Zoom-on-hover (chỉ ảnh)
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!mainRef.current) return;
        const rect = mainRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomOrigin({ x, y });
    };
    const handleMouseLeave = () => setZoomOrigin(null);

    if (displayMedias.length === 0) {
        return (
            <div className="w-full aspect-[4/3] bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-300">
                <span className="text-6xl font-black">{productName?.charAt(0) || '?'}</span>
            </div>
        );
    }

    const current = displayMedias[selectedIndex];
    const isImage = current.type === 'Image';

    return (
        <div className="w-full">
            <div className="flex flex-col lg:flex-row-reverse gap-3">
                {/* Main viewer */}
                <div className="flex-1 min-w-0">
                    <div
                        ref={mainRef}
                        className="relative aspect-[4/3] bg-white rounded-lg overflow-hidden border border-gray-200 select-none"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onMouseMove={isImage ? handleMouseMove : undefined}
                        onMouseLeave={handleMouseLeave}
                    >
                        {isImage ? (
                            <>
                                <img
                                    src={current.url}
                                    alt={current.altText || productName}
                                    className="w-full h-full object-contain transition-transform duration-150"
                                    style={zoomOrigin ? {
                                        transform: 'scale(1.75)',
                                        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                                    } : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setLightboxOpen(true)}
                                    className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-700 flex items-center justify-center shadow-sm transition-colors"
                                    aria-label="Phóng to"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <ProductVideoPlayer media={current} />
                        )}

                        {discountBadge && (
                            <span className="absolute top-3 left-3 bg-[var(--accent-primary)] text-white px-2.5 py-1 rounded-lg font-bold text-xs">
                                -{discountBadge}%
                            </span>
                        )}

                        {displayMedias.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-700 items-center justify-center shadow-sm transition-colors"
                                    aria-label="Ảnh trước"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-700 items-center justify-center shadow-sm transition-colors"
                                    aria-label="Ảnh sau"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>

                    <p className="lg:hidden mt-2 text-center text-xs text-gray-400">
                        {selectedIndex + 1} / {displayMedias.length}
                    </p>
                </div>

                {/* Thumbnails: dọc trên desktop, ngang trên mobile */}
                {displayMedias.length > 1 && (
                    <div className="flex lg:flex-col gap-2 lg:w-20 overflow-x-auto lg:overflow-y-auto lg:max-h-[520px] pb-1 lg:pb-0 lg:pr-1">
                        {displayMedias.map((m, index) => {
                            const isSelected = index === selectedIndex;
                            const thumbUrl = m.thumbnailUrl || m.url;
                            const isVideoThumb = m.type === 'Video' || m.type === 'YoutubeEmbed';
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setSelectedIndex(index)}
                                    className={`relative w-16 h-16 lg:w-full lg:h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                        isSelected
                                            ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30'
                                            : 'border-gray-200 hover:border-gray-400'
                                    }`}
                                    aria-label={`Xem media ${index + 1}`}
                                >
                                    {m.type === 'Image' || m.thumbnailUrl ? (
                                        <img
                                            src={thumbUrl}
                                            alt={m.altText || `${productName} ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100" />
                                    )}
                                    {isVideoThumb && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                                            <Play className="w-4 h-4 text-white fill-white" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {lightboxOpen && (
                <ProductMediaLightbox
                    medias={displayMedias}
                    currentIndex={selectedIndex}
                    onClose={() => setLightboxOpen(false)}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            )}
        </div>
    );
}
