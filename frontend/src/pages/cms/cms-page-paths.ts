/**
 * Bản sao phía SPA của `backend/Services/Content/Seo/CmsPagePaths.cs` — URL chuẩn của một
 * CMSPage theo slug. Hai bên PHẢI khớp: shell trả 301 theo bản C#, SPA `<Navigate>` theo bản này.
 */
const FIXED = new Set(['gioi-thieu', 'lien-he', 'dieu-khoan', 'bao-mat']);

/** Khớp `titleMapping` của PolicyPage — các trang hiển thị trong khung "chính sách". */
const POLICY = new Set(['bao-hanh', 'doi-tra', 'van-chuyen', 'huong-dan-thanh-toan', 'kiem-hang', 'khieu-nai']);

/** Slug là URL chuẩn ở catch-all `/:slug` hay phải sang đường khác. */
export function cmsCanonicalPath(slug: string): string {
  if (FIXED.has(slug)) return `/${slug}`;
  if (POLICY.has(slug)) return `/chinh-sach/${slug}`;
  return `/${slug}`;
}
