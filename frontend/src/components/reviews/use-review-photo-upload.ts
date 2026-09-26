/**
 * Ảnh đính kèm đánh giá: kiểm tra phía client (chỉ để báo lỗi sớm — server mới là chốt chặn:
 * magic bytes, mã hoá lại WebP, xoá EXIF), rồi tải TUẦN TỰ từng ảnh qua
 * `POST /catalog/reviews/photos`. Chỉ ảnh đã tải xong mới vào `photos` gửi kèm đánh giá.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { catalogPublicProductApi } from '../../api/catalog/public-product';
import type { ReviewPhoto } from '../../api/catalog/types';
import { normalizeApiError } from '../../lib/api-error';

export const MAX_REVIEW_PHOTOS = 5;
export const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_REVIEW_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type ReviewPhotoStatus = 'uploading' | 'done' | 'error';

export interface ReviewPhotoEntry {
  id: string;
  name: string;
  previewUrl: string | null;
  status: ReviewPhotoStatus;
  progress: number;
  photo?: ReviewPhoto;
  error?: string;
}

let seq = 0;
const nextId = () => `photo-${Date.now()}-${++seq}`;

const createPreview = (file: File) =>
  typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
const revokePreview = (url: string | null) => {
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
};

/** Lý do từ chối một file trước khi tải, hoặc `null` nếu hợp lệ. */
export function checkReviewPhotoFile(file: File): string | null {
  if (!ACCEPTED_REVIEW_PHOTO_TYPES.includes(file.type)) return `${file.name}: chỉ nhận ảnh JPG, PNG hoặc WebP`;
  if (file.size > MAX_REVIEW_PHOTO_BYTES) return `${file.name}: ảnh vượt quá 5MB`;
  return null;
}

export function useReviewPhotoUpload() {
  const [entries, setEntries] = useState<ReviewPhotoEntry[]>([]);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const patch = (id: string, change: Partial<ReviewPhotoEntry>) =>
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...change } : e)));

  /** Trả về danh sách lỗi (file bị từ chối) để nơi gọi hiển thị. */
  const addFiles = useCallback(async (files: File[]): Promise<string[]> => {
    const errors: string[] = [];
    const slots = MAX_REVIEW_PHOTOS - entriesRef.current.length;
    const accepted: { entry: ReviewPhotoEntry; file: File }[] = [];

    for (const file of files) {
      const problem = checkReviewPhotoFile(file);
      if (problem) { errors.push(problem); continue; }
      if (accepted.length >= slots) {
        errors.push(`Tối đa ${MAX_REVIEW_PHOTOS} ảnh cho một đánh giá`);
        break;
      }
      accepted.push({
        file,
        entry: { id: nextId(), name: file.name, previewUrl: createPreview(file), status: 'uploading', progress: 0 },
      });
    }

    if (accepted.length === 0) return errors;
    setEntries((list) => [...list, ...accepted.map((a) => a.entry)]);

    // Tuần tự: một ảnh lỗi không kéo cả loạt, và hạn mức dung lượng của server được tôn trọng.
    for (const { entry, file } of accepted) {
      try {
        const photo = await catalogPublicProductApi.uploadReviewPhoto(file, (p) => patch(entry.id, { progress: p }));
        patch(entry.id, { status: 'done', progress: 100, photo });
      } catch (err) {
        patch(entry.id, { status: 'error', error: normalizeApiError(err).message });
      }
    }
    return errors;
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((list) => {
      revokePreview(list.find((e) => e.id === id)?.previewUrl ?? null);
      return list.filter((e) => e.id !== id);
    });
  }, []);

  const reset = useCallback(() => {
    setEntries((list) => { list.forEach((e) => revokePreview(e.previewUrl)); return []; });
  }, []);

  useEffect(() => () => entriesRef.current.forEach((e) => revokePreview(e.previewUrl)), []);

  return {
    entries,
    photos: entries.filter((e) => e.status === 'done' && e.photo).map((e) => e.photo!),
    isUploading: entries.some((e) => e.status === 'uploading'),
    canAddMore: entries.length < MAX_REVIEW_PHOTOS,
    addFiles,
    remove,
    reset,
  };
}
