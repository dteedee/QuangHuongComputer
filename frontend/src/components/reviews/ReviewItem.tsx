/**
 * Một đánh giá trên trang sản phẩm: sao + điểm bằng chữ, nội dung, ưu/nhược điểm, ảnh thu nhỏ
 * (bấm để xem lớn), "Phản hồi từ Quang Hưởng" và nút "Hữu ích".
 */
import { useState } from 'react';
import { Check, Star, ThumbsUp, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ProductReview } from '../../api/catalog/types';
import { Badge, Button } from '../ui';
import { cn } from '../../lib/utils';
import { RATING_LABELS } from './review-rating-labels';
import { ReviewPhotoStrip, ReviewProsCons, ReviewShopReply } from './review-extras';

interface ReviewItemProps {
  review: ProductReview;
  /** May reject (401 chưa đăng nhập, 409 đã bình chọn) — the count then rolls back. */
  onMarkHelpful?: (reviewId: string) => Promise<void> | void;
}

const formatDate = (value: string) => {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: vi });
  } catch {
    return new Date(value).toLocaleDateString('vi-VN');
  }
};

export default function ReviewItem({ review, onMarkHelpful }: ReviewItemProps) {
  const [helpfulClicked, setHelpfulClicked] = useState(false);
  const [voting, setVoting] = useState(false);
  const [localHelpfulCount, setLocalHelpfulCount] = useState(review.helpfulCount);

  // Optimistic, but reversible: the vote endpoint requires authentication and answers 409
  // on a second vote, so a failure takes the +1 back.
  const handleHelpfulClick = async () => {
    if (helpfulClicked || voting || !onMarkHelpful) return;
    setVoting(true);
    setHelpfulClicked(true);
    setLocalHelpfulCount((prev) => prev + 1);
    try {
      await onMarkHelpful(review.id);
    } catch {
      setHelpfulClicked(false);
      setLocalHelpfulCount((prev) => Math.max(0, prev - 1));
    } finally {
      setVoting(false);
    }
  };

  return (
    <article className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sunken" aria-hidden>
            <User className="h-5 w-5 text-fg-subtle" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-fg">Khách hàng</span>
              {review.isVerifiedPurchase && (
                <Badge variant="success"><Check size={12} aria-hidden /> Đã mua hàng</Badge>
              )}
            </div>
            <span className="text-xs text-fg-subtle">{formatDate(review.createdAt)}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm" aria-label={`${review.rating} trên 5 sao`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={15} aria-hidden
              className={cn(star <= review.rating ? 'fill-current text-rating' : 'text-fg-subtle')} />
          ))}
          <span className="num ml-1 font-medium text-fg">{review.rating}</span>
          <span className="hidden text-fg-muted sm:inline">- {RATING_LABELS[review.rating]}</span>
        </span>
      </header>

      {review.title && <h4 className="mt-3 font-semibold text-fg">{review.title}</h4>}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{review.comment}</p>

      <ReviewProsCons pros={review.pros} cons={review.cons} />
      <ReviewPhotoStrip photos={review.images} />
      <ReviewShopReply reply={review.reply} />

      <footer className="mt-4 border-t border-line pt-3">
        <Button
          variant="ghost"
          size="sm"
          icon={ThumbsUp}
          onClick={() => void handleHelpfulClick()}
          disabled={helpfulClicked || voting}
          aria-pressed={helpfulClicked}
        >
          {helpfulClicked ? 'Đã đánh giá hữu ích' : 'Hữu ích'}
          {localHelpfulCount > 0 && <span className="num text-xs text-fg-subtle">({localHelpfulCount})</span>}
        </Button>
      </footer>
    </article>
  );
}
