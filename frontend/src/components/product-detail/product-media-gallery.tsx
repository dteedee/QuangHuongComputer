import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductMediaView } from '../../api/catalog/public-product';
import { Img } from '../ui';
import ProductVideoPlayer from './product-video-player';
import ProductMediaLightbox from './product-media-lightbox';

interface ProductMediaGalleryProps {
    medias: ProductMediaView[];
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
    const displayMedias = useMemo<ProductMediaView[]>(() => {
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
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-line bg-stage text-fg-subtle">
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
                        className="relative aspect-[4/3] select-none overflow-hidden rounded-lg border border-line bg-stage"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onMouseMove={isImage ? handleMouseMove : undefined}
                        onMouseLeave={handleMouseLeave}
                    >
                        {!isImage ? (
                            <ProductVideoPlayer media={current} />
                        ) : (
                            <>
                                <Img
                                    src={current.url}
                                    alt={(current.alt ?? current.altText) || productName}
                                    ratio="4/3"
                                    fit="contain"
                                    blend
                                    priority
                                    wrapperClassName="absolute inset-0 h-full w-full bg-stage"
                                    className="transition-transform duration-220 ease-out"
                                    style={zoomOrigin ? {
                                        transform: 'scale(1.75)',
                                        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                                    } : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setLightboxOpen(true)}
                                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/85 text-fg-muted shadow-sm transition-colors hover:bg-surface"
                                    aria-label="Phóng to ảnh"
                                >
                                    <ZoomIn className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </>
                        )}

                        {discountBadge && (
                            <span className="absolute left-3 top-3 rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-white">
                                -{discountBadge}%
                            </span>
                        )}

                        {displayMedias.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/85 text-fg-muted shadow-sm transition-colors hover:bg-surface md:flex"
                                    aria-label="Ảnh trước"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/85 text-fg-muted shadow-sm transition-colors hover:bg-surface md:flex"
                                    aria-label="Ảnh sau"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>

                    <p className="num mt-2 text-center text-xs text-fg-subtle lg:hidden">
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
                                            ? 'border-brand ring-1 ring-brand/30'
                                            : 'border-line hover:border-line-strong'
                                    }`}
                                    aria-label={`Xem media ${index + 1}`}
                                >
                                    <Img
                                        src={thumbUrl}
                                        alt={(m.alt ?? m.altText) || `${productName} - ảnh ${index + 1}`}
                                        ratio="1/1"
                                        fit="contain"
                                        blend
                                        wrapperClassName="h-full w-full bg-stage"
                                    />
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
