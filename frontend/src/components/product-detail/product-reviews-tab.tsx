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
  { value: 'newest', label: 'Moi nhat' },
  { value: 'oldest', label: 'Cu nhat' },
  { value: 'highest', label: 'Cao nhat' },
  { value: 'lowest', label: 'Thap nhat' },
  { value: 'helpful', label: 'Huu ich' },
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
      return <div className="text-gray-500 text-sm">Dang kiem tra...</div>;
    }
    if (hasPurchased) {
      return (
        <button
          onClick={onWriteReview}
          className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer"
        >
          Viet danh gia
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
            Viet danh gia
          </button>
          <span className="text-xs text-gray-500 hidden sm:flex items-center gap-1">
            Mua de danh gia
          </span>
        </div>
      );
    }
    return (
      <button
        onClick={onWriteReview}
        className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer"
      >
        Dang nhap de danh gia
      </button>
    );
  };

  return (
    <div className="space-y-8 bg-white p-6 rounded-xl border border-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-900">
          Danh gia tu khach hang ({reviews.length})
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
          <span className="text-sm font-medium text-gray-500">Sap xep:</span>
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
          <p className="mt-4 text-gray-500 font-medium">Dang tai danh gia...</p>
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
          <h4 className="text-gray-900 font-bold mb-2">Chua co danh gia nao</h4>
          {hasPurchased ? (
            <>
              <p className="text-gray-500 text-sm mb-4">
                Hay la nguoi dau tien chia se cam nhan ve san pham nay!
              </p>
              <button
                onClick={onWriteReview}
                className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer"
              >
                Viet danh gia dau tien
              </button>
            </>
          ) : isAuthenticated ? (
            <p className="text-gray-500 text-sm">
              Mua san pham nay de tro thanh nguoi dau tien danh gia!
            </p>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4">
                Dang nhap va mua san pham de danh gia!
              </p>
              <button
                onClick={onWriteReview}
                className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer"
              >
                Dang nhap ngay
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
