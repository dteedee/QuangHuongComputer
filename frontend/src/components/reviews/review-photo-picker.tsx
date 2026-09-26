/** Ô chọn ảnh cho đánh giá: xem trước, tiến độ tải, lỗi từng ảnh, nút gỡ. */
import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button, IconButton, Img } from '../ui';
import {
  ACCEPTED_REVIEW_PHOTO_TYPES, MAX_REVIEW_PHOTOS, type ReviewPhotoEntry,
} from './use-review-photo-upload';

interface ReviewPhotoPickerProps {
  entries: ReviewPhotoEntry[];
  canAddMore: boolean;
  disabled?: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}

export function ReviewPhotoPicker({ entries, canAddMore, disabled, onAdd, onRemove }: ReviewPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg">Ảnh thực tế (tuỳ chọn)</span>
        <span className="num text-xs text-fg-subtle">{entries.length}/{MAX_REVIEW_PHOTOS}</span>
      </div>

      {entries.length > 0 && (
        <ul className="grid grid-cols-5 gap-2" aria-label="Ảnh đã chọn">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <Img
                src={entry.photo?.thumbnailUrl ?? entry.previewUrl}
                alt={entry.name}
                ratio="1/1"
                fit="cover"
                wrapperClassName="rounded-md border border-line"
              />
              {entry.status === 'uploading' && (
                <span className="num absolute inset-x-1 bottom-1 rounded-sm bg-surface/90 text-center text-2xs text-fg">
                  {entry.progress}%
                </span>
              )}
              {entry.status === 'error' && (
                <span role="alert" className="absolute inset-x-1 bottom-1 rounded-sm bg-danger-subtle text-center text-2xs text-danger">
                  Lỗi
                </span>
              )}
              <IconButton
                aria-label={`Gỡ ảnh ${entry.name}`}
                size="sm"
                variant="outline"
                className="absolute -right-2 -top-2 h-6 w-6"
                disabled={entry.status === 'uploading'}
                onClick={() => onRemove(entry.id)}
              >
                <X size={12} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {entries.filter((e) => e.status === 'error').map((e) => (
        <p key={e.id} className="text-xs text-danger">{e.name}: {e.error}</p>
      ))}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_REVIEW_PHOTO_TYPES.join(',')}
        multiple
        hidden
        data-testid="review-photo-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length > 0) onAdd(files);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="dashed"
        icon={ImagePlus}
        disabled={disabled || !canAddMore}
        onClick={() => inputRef.current?.click()}
      >
        Thêm ảnh
      </Button>
      <p className="text-xs text-fg-subtle">JPG, PNG hoặc WebP, tối đa 5MB mỗi ảnh.</p>
    </div>
  );
}
