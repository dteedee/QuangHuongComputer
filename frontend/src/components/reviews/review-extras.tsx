/** Phần phụ của một đánh giá: ưu/nhược điểm, dải ảnh thu nhỏ, "Phản hồi từ Quang Hưởng". */
import { useState } from 'react';
import { MessageSquareReply, Minus, Plus } from 'lucide-react';
import type { ReviewPhoto, ReviewReply } from '../../api/catalog/types';
import { Img } from '../ui';
import { ReviewPhotoLightbox } from './review-photo-lightbox';

export function ReviewProsCons({ pros, cons }: { pros?: string | null; cons?: string | null }) {
  if (!pros && !cons) return null;
  return (
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      {pros && (
        <div className="rounded-lg bg-success-subtle px-3 py-2">
          <dt className="flex items-center gap-1 font-medium text-success"><Plus size={14} aria-hidden /> Ưu điểm</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-fg">{pros}</dd>
        </div>
      )}
      {cons && (
        <div className="rounded-lg bg-sunken px-3 py-2">
          <dt className="flex items-center gap-1 font-medium text-fg-muted"><Minus size={14} aria-hidden /> Nhược điểm</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-fg">{cons}</dd>
        </div>
      )}
    </dl>
  );
}

export function ReviewPhotoStrip({ photos }: { photos?: ReviewPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  if (!photos || photos.length === 0) return null;
  return (
    <>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Ảnh khách hàng gửi kèm">
        {photos.map((photo, i) => (
          <li key={photo.url}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="block h-16 w-16 overflow-hidden rounded-md border border-line transition-colors hover:border-line-strong"
              aria-label={`Xem ảnh ${i + 1} cỡ lớn`}
            >
              <Img src={photo.thumbnailUrl} alt="" ratio="1/1" fit="cover" />
            </button>
          </li>
        ))}
      </ul>
      <ReviewPhotoLightbox photos={photos} index={index} onIndexChange={setIndex} />
    </>
  );
}

export function ReviewShopReply({ reply }: { reply?: ReviewReply | null }) {
  if (!reply?.text) return null;
  const date = reply.repliedAt ? new Date(reply.repliedAt).toLocaleDateString('vi-VN') : null;
  return (
    <div className="mt-4 rounded-lg border-l-2 border-brand bg-sunken px-4 py-3">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
        <MessageSquareReply size={15} aria-hidden className="text-brand-text" />
        Phản hồi từ Quang Hưởng
        {date && <span className="num text-xs font-normal text-fg-subtle">{date}</span>}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-fg-muted">{reply.text}</p>
    </div>
  );
}
