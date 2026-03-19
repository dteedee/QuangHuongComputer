import { useState } from 'react';
import { Star, ThumbsUp, Check, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

interface ReviewItemProps {
  review: Review;
  onMarkHelpful?: (reviewId: string) => void;
}

export default function ReviewItem({ review, onMarkHelpful }: ReviewItemProps) {
  const [helpfulClicked, setHelpfulClicked] = useState(false);
  const [localHelpfulCount, setLocalHelpfulCount] = useState(review.helpfulCount);

  const handleHelpfulClick = () => {
    if (helpfulClicked) return;

    setHelpfulClicked(true);
    setLocalHelpfulCount((prev) => prev + 1);

    if (onMarkHelpful) {
      onMarkHelpful(review.id);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: vi,
      });
    } catch {
      return new Date(dateString).toLocaleDateString('vi-VN');
    }
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 5:
        return 'Tuyệt vời';
      case 4:
        return 'Tốt';
      case 3:
        return 'Bình thường';
      case 2:
        return 'Tệ';
      case 1:
        return 'Rất tệ';
      default:
        return '';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-emerald-600 bg-emerald-50';
    if (rating === 3) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>

          {/* User Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">Khách hàng</span>
              {review.isVerifiedPurchase && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                  <Check className="w-3 h-3" />
                  Đã mua hàng
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {formatDate(review.createdAt)}
            </span>
          </div>
        </div>

        {/* Rating Badge */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getRatingColor(review.rating)}`}>
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>{review.rating}</span>
          <span className="hidden sm:inline">- {getRatingLabel(review.rating)}</span>
        </div>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= review.rating
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-bold text-gray-900 mb-2">{review.title}</h4>
      )}

      {/* Comment */}
      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
        {review.comment}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        {/* Helpful Button */}
        <button
          onClick={handleHelpfulClick}
          disabled={helpfulClicked}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            helpfulClicked
              ? 'bg-blue-50 text-blue-600 cursor-default'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${helpfulClicked ? 'fill-blue-500' : ''}`} />
          <span>{helpfulClicked ? 'Đã đánh giá hữu ích' : 'Hữu ích'}</span>
          {localHelpfulCount > 0 && (
            <span className="text-xs text-gray-400">({localHelpfulCount})</span>
          )}
        </button>
      </div>
    </div>
  );
}
