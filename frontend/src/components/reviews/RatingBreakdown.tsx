import { Star } from 'lucide-react';

interface RatingBreakdownProps {
  averageRating: number;
  totalReviews: number;
  ratingCounts: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export default function RatingBreakdown({
  averageRating,
  totalReviews,
  ratingCounts,
}: RatingBreakdownProps) {
  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  const ratingLabels: Record<number, string> = {
    5: 'Tuyệt vời',
    4: 'Tốt',
    3: 'Bình thường',
    2: 'Tệ',
    1: 'Rất tệ',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Overall Rating */}
        <div className="flex flex-col items-center justify-center md:w-48 md:border-r border-gray-100 md:pr-8">
          <div className="text-5xl font-black text-gray-900 tracking-tight">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {totalReviews} đánh giá
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts[star as keyof typeof ratingCounts] || 0;
            const percentage = getPercentage(count);

            return (
              <div key={star} className="flex items-center gap-3 group">
                {/* Star Label */}
                <div className="flex items-center gap-1 w-20 shrink-0">
                  <span className="text-sm font-bold text-gray-700">{star}</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>

                {/* Progress Bar */}
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      star >= 4
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                        : star === 3
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                        : 'bg-gradient-to-r from-red-400 to-rose-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Count & Percentage */}
                <div className="w-24 shrink-0 text-right">
                  <span className="text-sm font-bold text-gray-700">{count}</span>
                  <span className="text-xs text-gray-400 ml-1">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating Labels Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-6 pt-6 border-t border-gray-100">
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="flex items-center gap-1 text-xs text-gray-500">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="font-medium">{star}</span>
            <span>= {ratingLabels[star]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
