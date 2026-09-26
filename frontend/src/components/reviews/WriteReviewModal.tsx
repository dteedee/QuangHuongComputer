/**
 * Viết đánh giá: số sao, tiêu đề, nội dung, ưu/nhược điểm (tuỳ chọn) và tối đa 5 ảnh thực tế.
 * Ảnh được tải lên TRƯỚC (kho media của cửa hàng), đánh giá chỉ gửi kèm URL server trả về.
 */
import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { catalogPublicProductApi } from '../../api/catalog/public-product';
import { normalizeApiError } from '../../lib/api-error';
import { Button, Dialog, Input, Textarea, notify } from '../ui';
import { ReviewRatingInput } from './review-rating-input';
import { ReviewPhotoPicker } from './review-photo-picker';
import { useReviewPhotoUpload } from './use-review-photo-upload';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onReviewSubmitted: () => void;
}

const MAX_COMMENT = 2000;
const MAX_PROS_CONS = 500;

export default function WriteReviewModal({
  isOpen, onClose, productId, productName, onReviewSubmitted,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const upload = useReviewPhotoUpload();

  const reset = () => {
    setRating(0); setTitle(''); setComment(''); setPros(''); setCons(''); setErrors({});
    upload.reset();
  };

  const close = () => {
    if (isSubmitting || upload.isUploading) return;
    reset();
    onClose();
  };

  const addPhotos = async (files: File[]) => {
    const problems = await upload.addFiles(files);
    problems.forEach((p) => notify.error(p));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (rating === 0) next.rating = 'Vui lòng chọn số sao đánh giá';
    if (comment.trim().length < 10) next.comment = 'Nội dung đánh giá phải có ít nhất 10 ký tự';
    setErrors(next);
    if (Object.keys(next).length > 0 || upload.isUploading) return;

    setIsSubmitting(true);
    try {
      await catalogPublicProductApi.createProductReview(productId, {
        rating,
        comment: comment.trim(),
        title: title.trim() || undefined,
        pros: pros.trim() || undefined,
        cons: cons.trim() || undefined,
        photos: upload.photos.length > 0 ? upload.photos : undefined,
      });
      notify.success('Đã gửi đánh giá', { description: 'Đánh giá sẽ hiển thị sau khi được kiểm duyệt.' });
      reset();
      onReviewSubmitted();
      onClose();
    } catch (err) {
      const error = normalizeApiError(err);
      if (error.status === 403) {
        notify.error('Bạn cần mua sản phẩm này trước khi đánh giá');
        onClose();
      } else {
        notify.error('Không gửi được đánh giá', { description: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) close(); }}
      title="Viết đánh giá"
      description={productName}
      size="lg"
      footer={(
        <>
          <Button variant="ghost" onClick={close} disabled={isSubmitting}>Huỷ</Button>
          <Button
            type="submit"
            form="write-review-form"
            icon={Send}
            loading={isSubmitting}
            disabled={upload.isUploading}
          >
            {upload.isUploading ? 'Đang tải ảnh…' : 'Gửi đánh giá'}
          </Button>
        </>
      )}
    >
      <form id="write-review-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        <ReviewRatingInput value={rating} onChange={setRating} error={errors.rating} />
        <Input label="Tiêu đề (tuỳ chọn)" value={title} maxLength={200}
          onChange={(e) => setTitle(e.target.value)} placeholder="VD: Máy chạy êm, pin tốt" />
        <Textarea
          label="Nội dung đánh giá *"
          rows={4}
          value={comment}
          maxLength={MAX_COMMENT}
          onChange={(e) => setComment(e.target.value)}
          error={errors.comment}
          hint={<span className="num">Tối thiểu 10 ký tự · {comment.length}/{MAX_COMMENT}</span>}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này…"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Textarea label="Ưu điểm (tuỳ chọn)" rows={2} value={pros} maxLength={MAX_PROS_CONS}
            onChange={(e) => setPros(e.target.value)} />
          <Textarea label="Nhược điểm (tuỳ chọn)" rows={2} value={cons} maxLength={MAX_PROS_CONS}
            onChange={(e) => setCons(e.target.value)} />
        </div>
        <ReviewPhotoPicker
          entries={upload.entries}
          canAddMore={upload.canAddMore}
          disabled={isSubmitting}
          onAdd={(files) => void addPhotos(files)}
          onRemove={upload.remove}
        />
        <p className="rounded-lg bg-info-subtle px-3 py-2 text-xs text-info">
          Đánh giá được kiểm duyệt trước khi hiển thị. Nếu bạn đã mua sản phẩm, đánh giá sẽ có nhãn "Đã mua hàng".
        </p>
      </form>
    </Dialog>
  );
}
