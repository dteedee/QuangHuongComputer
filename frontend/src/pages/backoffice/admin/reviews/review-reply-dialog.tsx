/**
 * Soạn "Phản hồi từ Quang Hưởng" cho một đánh giá: POST khi chưa có phản hồi, PUT khi sửa,
 * DELETE (có xác nhận) để gỡ. Nút lưu đủ 4 trạng thái (design-guidelines §9.4).
 */
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { AdminReviewRow } from '../../../../api/catalog/types';
import { catalogAdminApi } from '../../../../api/catalog/admin';
import { normalizeApiError } from '../../../../lib/api-error';
import {
  Button, ConfirmDialog, Dialog, SaveButton, Textarea, notify, type SaveStatus,
} from '../../../../components/ui';

const MAX_REPLY = 2000;

interface ReviewReplyDialogProps {
  row: AdminReviewRow | null;
  onClose: () => void;
  onChanged: () => void;
}

export function ReviewReplyDialog({ row, onClose, onChanged }: ReviewReplyDialogProps) {
  const review = row?.review;
  const existing = review?.reply?.text ?? '';
  const [text, setText] = useState(existing);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** Hàng đang mở là ảnh chụp cũ: sau lần POST đầu, lần lưu tiếp theo phải là PUT. */
  const [createdHere, setCreatedHere] = useState(false);

  useEffect(() => { setText(existing); setStatus('idle'); setError(undefined); setCreatedHere(false); }, [review?.id, existing]);

  if (!review) return null;
  const hasReply = Boolean(review.reply?.text) || createdHere;
  const trimmed = text.trim();

  const save = async () => {
    if (!trimmed) { setError('Nội dung phản hồi là bắt buộc'); return; }
    setStatus('saving');
    setError(undefined);
    try {
      if (hasReply) await catalogAdminApi.reviews.editReply(review.id, trimmed);
      else { await catalogAdminApi.reviews.reply(review.id, trimmed); setCreatedHere(true); }
      setStatus('saved');
      onChanged();
    } catch (err) {
      setStatus('error');
      setError(normalizeApiError(err).message);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await catalogAdminApi.reviews.deleteReply(review.id);
      notify.success('Đã gỡ phản hồi');
      setConfirmDelete(false);
      onChanged();
      onClose();
    } catch (err) {
      notify.error('Không gỡ được phản hồi', { description: normalizeApiError(err).message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => { if (!open && status !== 'saving') onClose(); }}
        title={hasReply ? 'Sửa phản hồi' : 'Phản hồi đánh giá'}
        description={row?.productName ?? undefined}
        size="lg"
        footer={(
          <>
            {hasReply && (
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} className="mr-auto text-danger">
                Gỡ phản hồi
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} disabled={status === 'saving'}>Đóng</Button>
            <SaveButton
              status={status}
              label={hasReply ? 'Lưu thay đổi' : 'Gửi phản hồi'}
              errorMessage={status === 'error' ? error : undefined}
              onDone={() => setStatus('idle')}
              onClick={() => void save()}
            />
          </>
        )}
      >
        <blockquote className="mb-3 rounded-lg bg-sunken px-3 py-2 text-13 text-fg-muted">
          <span className="num font-medium text-fg">{review.rating}/5 sao</span>
          {review.title && <span className="font-medium text-fg"> · {review.title}</span>}
          <p className="mt-1 whitespace-pre-line">{review.comment}</p>
        </blockquote>
        <Textarea
          label="Phản hồi từ Quang Hưởng"
          rows={5}
          value={text}
          maxLength={MAX_REPLY}
          onChange={(e) => { setText(e.target.value); if (status === 'error') setStatus('idle'); }}
          error={status !== 'error' ? error : undefined}
          hint={<span className="num">{text.length}/{MAX_REPLY} · Hiển thị công khai dưới đánh giá</span>}
        />
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Gỡ phản hồi?"
        description="Phản hồi sẽ biến mất khỏi trang sản phẩm. Đánh giá của khách vẫn giữ nguyên."
        confirmLabel="Gỡ phản hồi"
        tone="danger"
        loading={deleting}
        onConfirm={() => void remove()}
      />
    </>
  );
}
