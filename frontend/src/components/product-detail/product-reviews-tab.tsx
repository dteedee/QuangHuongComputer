/**
 * Reviews block: distribution from the approved-only stats endpoint, a paged
 * list from `/products/{id}/reviews`, client-side sort of the current page, and
 * the four states (loading / error+retry / empty / list).
 *
 * The distribution is NOT computed from the loaded page any more — with paging
 * that produced a histogram of whatever happened to be on screen.
 */
import { useMemo, useState } from 'react';
import { Filter, Star } from 'lucide-react';

import type { ProductReview } from '../../api/catalog';
import { Button, EmptyState, ErrorState, Pagination, Skeleton } from '../ui';
import { RatingBreakdown, ReviewItem } from '../reviews';
import type { ReviewStats } from './use-product-detail-data';

type ReviewSortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

interface ProductReviewsTabProps {
  reviews: ProductReview[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loadingReviews: boolean;
  error?: unknown;
  onRetry: () => void;
  stats?: ReviewStats;
  hasPurchased: boolean | null;
  checkingPurchase: boolean;
  isAuthenticated: boolean;
  onWriteReview: () => void;
  onMarkHelpful: (reviewId: string) => Promise<void> | void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'highest', label: 'Điểm cao nhất' },
  { value: 'lowest', label: 'Điểm thấp nhất' },
  { value: 'helpful', label: 'Hữu ích nhất' },
] as const;

export default function ProductReviewsTab({
  reviews, total, page, pageSize, onPageChange,
  loadingReviews, error, onRetry, stats,
  hasPurchased, checkingPurchase, isAuthenticated, onWriteReview, onMarkHelpful,
}: ProductReviewsTabProps) {
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('newest');

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];
    switch (reviewSort) {
      case 'oldest':
        return sorted.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
      case 'highest':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sorted.sort((a, b) => a.rating - b.rating);
      case 'helpful':
        return sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
      case 'newest':
      default:
        return sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
  }, [reviews, reviewSort]);

  const totalReviews = stats?.totalReviews ?? total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const writeReviewButton = () => {
    if (checkingPurchase) return <span className="text-sm text-fg-subtle">Đang kiểm tra…</span>;
    if (hasPurchased) return <Button size="sm" onClick={onWriteReview}>Viết đánh giá</Button>;
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-2">
          <Button size="sm" disabled>Viết đánh giá</Button>
          <span className="hidden text-xs text-fg-subtle sm:inline">Mua sản phẩm để đánh giá</span>
        </div>
      );
    }
    return <Button size="sm" variant="outline" onClick={onWriteReview}>Đăng nhập để đánh giá</Button>;
  };

  return (
    <div className="space-y-6 rounded-xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h3 className="text-xl font-bold text-fg">
          Đánh giá từ khách hàng {totalReviews > 0 && <span className="num">({totalReviews})</span>}
        </h3>
        {writeReviewButton()}
      </div>

      {totalReviews > 0 && stats && (
        <RatingBreakdown
          averageRating={stats.averageRating}
          totalReviews={stats.totalReviews}
          ratingCounts={stats.ratingCounts}
        />
      )}

      {reviews.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Filter className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
          <span className="text-sm font-medium text-fg-muted">Sắp xếp:</span>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReviewSort(option.value)}
                aria-pressed={reviewSort === option.value}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  reviewSort === option.value
                    ? 'bg-brand text-white'
                    : 'bg-sunken text-fg-muted hover:bg-line'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingReviews ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <ErrorState title="Không tải được đánh giá" error={error} onRetry={onRetry} inline />
      ) : sortedReviews.length > 0 ? (
        <>
          <div className="space-y-4">
            {sortedReviews.map((review) => (
              <ReviewItem key={review.id} review={review} onMarkHelpful={onMarkHelpful} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
          )}
        </>
      ) : (
        <EmptyState
          icon={Star}
          title="Chưa có đánh giá nào"
          description={
            hasPurchased
              ? 'Bạn đã mua sản phẩm này — hãy là người đầu tiên chia sẻ cảm nhận.'
              : isAuthenticated
                ? 'Mua sản phẩm này để trở thành người đầu tiên đánh giá.'
                : 'Đăng nhập và mua sản phẩm để gửi đánh giá.'
          }
          action={
            hasPurchased
              ? { label: 'Viết đánh giá đầu tiên', onClick: onWriteReview }
              : !isAuthenticated
                ? { label: 'Đăng nhập', onClick: onWriteReview }
                : undefined
          }
        />
      )}
    </div>
  );
}
