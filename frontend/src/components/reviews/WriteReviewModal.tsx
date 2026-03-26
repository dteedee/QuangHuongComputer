import { useState } from 'react';
import { Star, X, Send, AlertCircle } from 'lucide-react';
import { catalogApi } from '../../api/catalog';
import toast from 'react-hot-toast';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onReviewSubmitted: () => void;
}

export default function WriteReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  onReviewSubmitted,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});

  const ratingLabels = [
    '',
    'Rất tệ',
    'Tệ',
    'Bình thường',
    'Tốt',
    'Tuyệt vời'
  ];

  const validate = () => {
    const newErrors: { rating?: string; comment?: string } = {};

    if (rating === 0) {
      newErrors.rating = 'Vui lòng chọn số sao đánh giá';
    }

    if (comment.trim().length < 10) {
      newErrors.comment = 'Nội dung đánh giá phải có ít nhất 10 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await catalogApi.createProductReview(productId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });

      toast.success('Đánh giá của bạn đã được gửi và đang chờ duyệt!', {
        icon: '✅',
        duration: 4000,
      });

      // Reset form
      setRating(0);
      setTitle('');
      setComment('');
      setErrors({});

      onReviewSubmitted();
      onClose();
    } catch (error: any) {
      const status = error.response?.status;
      let message = error.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.';

      if (status === 403) {
        message = 'Bạn cần mua sản phẩm này trước khi đánh giá';
        toast.error(message, { icon: '🛒', duration: 4000 });
        onClose(); // Close modal since user can't review
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0);
      setTitle('');
      setComment('');
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent to-[#ff4d4d] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              Viết đánh giá
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <p className="text-white/80 text-sm mt-1 line-clamp-1 font-medium">
            {productName}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Rating Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
              Đánh giá của bạn <span className="text-accent">*</span>
            </label>
            <div className="flex flex-col items-center gap-3 py-4 bg-gray-50 rounded-xl">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className={`text-sm font-bold ${rating > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {ratingLabels[hoverRating || rating] || 'Chọn số sao'}
              </span>
            </div>
            {errors.rating && (
              <p className="flex items-center gap-1 text-sm text-red-500 font-medium">
                <AlertCircle className="w-4 h-4" />
                {errors.rating}
              </p>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
              Tiêu đề (tùy chọn)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Sản phẩm tuyệt vời!"
              maxLength={100}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-accent focus:ring-2 focus:ring-red-100 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Comment Textarea */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
              Nội dung đánh giá <span className="text-accent">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
              rows={4}
              maxLength={1000}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-red-100 outline-none transition-all font-medium resize-none text-gray-900 placeholder:text-gray-400 ${
                errors.comment ? 'border-red-300 focus:border-accent' : 'border-gray-200 focus:border-accent'
              }`}
            />
            <div className="flex justify-between items-center">
              {errors.comment ? (
                <p className="flex items-center gap-1 text-sm text-red-500 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {errors.comment}
                </p>
              ) : (
                <span className="text-xs text-gray-400">Tối thiểu 10 ký tự</span>
              )}
              <span className="text-xs text-gray-400">{comment.length}/1000</span>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-700 font-medium">
              💡 Đánh giá của bạn sẽ được kiểm duyệt trước khi hiển thị công khai.
              Nếu bạn đã mua sản phẩm này, đánh giá sẽ được gắn nhãn "Đã mua hàng".
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-accent text-white rounded-xl font-black uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Gửi đánh giá
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
