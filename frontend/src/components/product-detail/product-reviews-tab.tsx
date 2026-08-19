import { useState, useMemo } from 'react';
import { Star, Filter } from 'lucide-react';
import type { ProductReview } from '../../api/catalog';
import { RatingBreakdown, ReviewItem } from '../reviews';

type ReviewSortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

interface ProductReviewsTabProps {
  reviews: ProductReview[];
  loadingReviews: boolean;
  averageRating: number;
  ratingCounts: Record<number, number>;
  hasPurchased: boolean | null;
  checkingPurchase: boolean;
  isAuthenticated: boolean;
  onWriteReview: () => void;
  onMarkHelpful: (reviewId: string) => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'highest', label: 'Cao nhất' },
  { value: 'lowest', label: 'Thấp nhất' },
  { value: 'helpful', label: 'Hữu ích' },
] as const;

export default function ProductReviewsTab({
  reviews,
  loadingReviews,
  averageRating,
  ratingCounts,
  hasPurchased,
  checkingPurchase,
  isAuthenticated,
  onWriteReview,
  onMarkHelpful,
}: ProductReviewsTabProps) {
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('newest');

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];
    switch (reviewSort) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'highest':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sorted.sort((a, b) => a.rating - b.rating);
      case 'helpful':
        return sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
      default:
        return sorted;
    }
  }, [reviews, reviewSort]);

  const renderWriteReviewButton = () => {
    if (checkingPurchase) {
      return <div className="text-gray-500 text-sm">Đang kiểm tra...</div>;
    }
    if (hasPurchased) {
      return (
        <button
          onClick={onWriteReview}
          className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer"
        >
          Viết đánh giá
        </button>
      );
    }
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-2">
          <button
            disabled
            className="px-5 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-semibold cursor-not-allowed"
          >
            Viết đánh giá
          </button>
          <span className="text-xs text-gray-500 hidden sm:flex items-center gap-1">
            Mua để đánh giá
          </span>
        </div>
      );
    }
    return (
      <button
        onClick={onWriteReview}
        className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer"
      >
        Đăng nhập để đánh giá
      </button>
    );
  };

  return (
    <div className="space-y-8 bg-white p-6 rounded-xl border border-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-900">
          Đánh giá từ khách hàng ({reviews.length})
        </h3>
        {renderWriteReviewButton()}
      </div>

      {/* Rating Breakdown */}
      {reviews.length > 0 && (
        <RatingBreakdown
          averageRating={averageRating}
          totalReviews={reviews.length}
          ratingCounts={ratingCounts}
        />
      )}

      {/* Sort Options */}
      {reviews.length > 1 && (
        <div className="flex items-center gap-3 pt-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Sắp xếp:</span>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setReviewSort(option.value as ReviewSortOption)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reviewSort === option.value
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loadingReviews ? (
        <div className="py-10 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Đang tải đánh giá...</p>
        </div>
      ) : sortedReviews.length > 0 ? (
        <div className="space-y-4">
          {sortedReviews.map((review) => (
            <ReviewItem key={review.id} review={review} onMarkHelpful={onMarkHelpful} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white text-gray-300 mb-4">
            <Star size={32} />
          </div>
          <h4 className="text-gray-900 font-bold mb-2">Chưa có đánh giá nào</h4>
          {hasPurchased ? (
            <>
              <p className="text-gray-500 text-sm mb-4">
                Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm này!
              </p>
              <button
                onClick={onWriteReview}
                className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer"
              >
                Viết đánh giá đầu tiên
              </button>
            </>
          ) : isAuthenticated ? (
            <p className="text-gray-500 text-sm">
              Mua sản phẩm này để trở thành người đầu tiên đánh giá!
            </p>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4">
                Đăng nhập và mua sản phẩm để đánh giá!
              </p>
              <button
                onClick={onWriteReview}
                className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
