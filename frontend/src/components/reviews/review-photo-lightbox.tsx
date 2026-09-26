/** Xem ảnh đánh giá cỡ lớn: Dialog của kit (ESC, focus trap), nút / phím trái-phải để chuyển ảnh. */
import type { KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReviewPhoto } from '../../api/catalog/types';
import { Dialog, IconButton, Img } from '../ui';

interface ReviewPhotoLightboxProps {
  photos: ReviewPhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function ReviewPhotoLightbox({ photos, index, onIndexChange }: ReviewPhotoLightboxProps) {
  const open = index !== null && index >= 0 && index < photos.length;
  const current = open ? photos[index!] : null;
  const count = photos.length;
  const go = (delta: number) => { if (open) onIndexChange((index! + delta + count) % count); };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) onIndexChange(null); }}
      title={open ? `Ảnh ${index! + 1}/${count} của khách hàng` : 'Ảnh của khách hàng'}
      hideTitle
      size="xl"
    >
      {current && (
        <div className="space-y-3" onKeyDown={onKeyDown}>
          <Img src={current.url} alt={`Ảnh đánh giá ${index! + 1}`} ratio="4/3" fit="contain" priority />
          {count > 1 && (
            <div className="flex items-center justify-between">
              <IconButton aria-label="Ảnh trước" variant="outline" onClick={() => go(-1)}>
                <ChevronLeft size={18} aria-hidden />
              </IconButton>
              <span className="num text-sm text-fg-muted">{index! + 1} / {count}</span>
              <IconButton aria-label="Ảnh sau" variant="outline" onClick={() => go(1)}>
                <ChevronRight size={18} aria-hidden />
              </IconButton>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
