import { X } from 'lucide-react';
import { IconButton, Img } from '../../../../components/ui';

interface Props {
    urls: string[];
    alt: string;
    /** When set, each photo gets a remove button. */
    onRemove?: (url: string) => void;
    disabled?: boolean;
}

/** Thumbnails of repair photos (intake / before / after); click opens the full image in a new tab. */
export function RepairPhotoGrid({ urls, alt, onRemove, disabled }: Props) {
    if (urls.length === 0) return null;
    return (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {urls.map((url, i) => (
                <li key={url} className="relative overflow-hidden rounded-lg border border-line">
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Xem ảnh ${i + 1} cỡ lớn`}>
                        <Img src={url} alt={`${alt} ${i + 1}`} ratio="1/1" fit="cover" />
                    </a>
                    {onRemove && (
                        <IconButton aria-label={`Xoá ảnh ${i + 1}`} size="sm" variant="ghost" disabled={disabled}
                            className="absolute right-1 top-1 bg-surface/80" onClick={() => onRemove(url)}>
                            <X size={14} />
                        </IconButton>
                    )}
                </li>
            ))}
        </ul>
    );
}
