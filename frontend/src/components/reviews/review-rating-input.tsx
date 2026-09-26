/** Chọn số sao — nhóm radio (mỗi sao là một lựa chọn), luôn kèm nhãn chữ bên cạnh. */
import { useState } from 'react';
import { Star } from 'lucide-react';
import { IconButton } from '../ui';
import { cn } from '../../lib/utils';

import { RATING_LABELS } from './review-rating-labels';

interface ReviewRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  error?: string;
}

export function ReviewRatingInput({ value, onChange, error }: ReviewRatingInputProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium text-fg">
        Đánh giá của bạn <span className="text-brand-text">*</span>
      </legend>
      <div className="flex items-center gap-3" role="radiogroup" aria-label="Số sao">
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <IconButton
              key={star}
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} sao - ${RATING_LABELS[star]}`}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
            >
              <Star
                size={26}
                aria-hidden
                className={cn(star <= shown ? 'fill-current text-rating' : 'text-fg-subtle')}
              />
            </IconButton>
          ))}
        </div>
        <span className={cn('text-sm', shown ? 'font-medium text-fg' : 'text-fg-subtle')}>
          {RATING_LABELS[shown] || 'Chọn số sao'}
        </span>
      </div>
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </fieldset>
  );
}
