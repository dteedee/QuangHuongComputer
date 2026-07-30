import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductMedia } from '../../api/catalog';
import ProductVideoPlayer from './product-video-player';

interface ProductMediaLightboxProps {
    medias: ProductMedia[];
    currentIndex: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}

/** Lightbox modal cho ảnh + video sản phẩm — phím Esc/Left/Right, click nền để đóng. */
export default function ProductMediaLightbox({
    medias, currentIndex, onClose, onPrev, onNext,
}: ProductMediaLightboxProps) {
    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        else if (e.key === 'ArrowLeft') onPrev();
        else if (e.key === 'ArrowRight') onNext();
    }, [onClose, onPrev, onNext]);

    useEffect(() => {
        document.addEventListener('keydown', handleKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [handleKey]);

    const media = medias[currentIndex];
    if (!media) return null;

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                aria-label="Đóng"
            >
                <X className="w-6 h-6" />
            </button>

            {medias.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                        aria-label="Ảnh trước"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                        aria-label="Ảnh sau"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            <div
                className="max-w-[92vw] max-h-[88vh] w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {media.type === 'Image' ? (
                    <img
                        src={media.url}
                        alt={media.altText || ''}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <div className="w-full h-full max-w-5xl aspect-video">
                        <ProductVideoPlayer media={media} />
                    </div>
                )}
            </div>

            {medias.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-sm px-4 py-1.5 rounded-full">
                    {currentIndex + 1} / {medias.length}
                </div>
            )}
        </div>
    );
}
