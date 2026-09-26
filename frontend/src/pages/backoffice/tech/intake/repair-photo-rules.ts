/** Client-side pre-check mirroring the server's media validator (UX only — the server re-validates). */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 10;

export function photoFilesProblem(files: File[]): string | null {
    if (files.length === 0) return 'Chưa chọn ảnh nào.';
    if (files.length > MAX_PHOTOS_PER_UPLOAD) return `Mỗi lần tải tối đa ${MAX_PHOTOS_PER_UPLOAD} ảnh.`;
    const bad = files.find((f) => !PHOTO_ACCEPT.split(',').includes(f.type) || f.size > MAX_PHOTO_BYTES);
    return bad ? `Ảnh "${bad.name}" không hợp lệ: chỉ nhận JPG/PNG/GIF/WebP tối đa 5MB.` : null;
}
