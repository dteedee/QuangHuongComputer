import { useState, useCallback } from 'react';
import { Play } from 'lucide-react';
import type { ProductMedia } from '../../api/catalog';

/**
 * Trích YouTube ID an toàn.
 * Chỉ chấp nhận `youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/embed/…`.
 * Trả về `null` nếu không khớp — chặn iframe tuỳ ý.
 */
export function extractYoutubeId(url: string): string | null {
    if (!url) return null;
    const patterns = [
        /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})(?:[&?].*)?$/,
        /^(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&].*)?$/,
        /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[?&].*)?$/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

interface ProductVideoPlayerProps {
    media: ProductMedia;
    className?: string;
}

/**
 * HTML5 video + YouTube nhúng lazy.
 * - `Video`: dùng <video controls preload="none"> có poster.
 * - `YoutubeEmbed`: hiện thumbnail + nút play; chỉ tải iframe khi bấm.
 */
export default function ProductVideoPlayer({ media, className = '' }: ProductVideoPlayerProps) {
    const [activated, setActivated] = useState(false);

    const handleActivate = useCallback(() => setActivated(true), []);

    if (media.type === 'Video') {
        return (
            <video
                controls
                preload="none"
                poster={media.thumbnailUrl}
                src={media.url}
                className={`w-full h-full object-contain bg-black ${className}`}
            >
                Trình duyệt của bạn không hỗ trợ video HTML5.
            </video>
        );
    }

    if (media.type === 'YoutubeEmbed') {
        const youtubeId = extractYoutubeId(media.url);
        if (!youtubeId) {
            return (
                <div className={`w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm ${className}`}>
                    URL video không hợp lệ
                </div>
            );
        }

        if (!activated) {
            const posterUrl = media.thumbnailUrl || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
            return (
                <button
                    type="button"
                    onClick={handleActivate}
                    className={`group relative w-full h-full overflow-hidden ${className}`}
                    aria-label="Phát video YouTube"
                >
                    <img
                        src={posterUrl}
                        alt={media.altText || 'Video sản phẩm'}
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-7 h-7 text-red-600 fill-red-600 translate-x-0.5" />
                        </div>
                    </div>
                </button>
            );
        }

        return (
            <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title={media.altText || 'Video sản phẩm'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className={`w-full h-full ${className}`}
            />
        );
    }

    return null;
}
