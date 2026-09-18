/**
 * resolveMediaUrl — seam VĨNH VIỄN (không phải stop-gap) cho URL media do backend
 * trả về, theo quyết định D02 (`plans/260917-2100-full-system-overhaul/decisions/D02-anh-san-pham-nguon-va-luu-tru.md`).
 *
 * Backend lưu và trả đường dẫn GỐC-TƯƠNG-ĐỐI (`/media/...` hoặc `/uploads/...` —
 * legacy trước khi W1-6 dọn xong), KHÔNG tuyệt đối. FE và API có thể khác origin
 * (:5174 vs :5000 ở dev) nên một đường dẫn tương đối như `/media/seed/products/x.webp`
 * không tự tải được nếu request thẳng từ trình duyệt tại origin của FE — phải
 * ghép với origin đúng của API/CDN trước khi gán vào `src`.
 *
 * Quy tắc:
 * - URL đã tuyệt đối (`http://`, `https://`, `data:`, `blob:`) → giữ nguyên, không đụng.
 * - `/media/...` hoặc `/uploads/...` (root-relative) → ghép với
 *   `VITE_MEDIA_BASE_URL` nếu có, nếu không thì dùng origin của `VITE_API_URL`.
 * - Rỗng/undefined → trả về chuỗi rỗng (để caller tự quyết định fallback/placeholder).
 * - Path tương đối khác (không bắt đầu bằng `/`) → giữ nguyên (không phải seam này lo).
 */

const ABSOLUTE_URL_RE = /^(https?:|data:|blob:)/i;
const MEDIA_PATH_RE = /^\/(media|uploads)\//;

function originOf(url: string): string {
    try {
        return new URL(url).origin;
    } catch {
        return '';
    }
}

// VITE_API_URL luôn có giá trị mặc định trong client.ts (fallback 'http://localhost:5000'),
// nhưng ở đây đọc độc lập để module này không phụ thuộc ngược vào api/client.ts.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || originOf(API_URL);

export function resolveMediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (ABSOLUTE_URL_RE.test(url)) return url;
    if (MEDIA_PATH_RE.test(url)) return `${MEDIA_BASE_URL}${url}`;
    return url;
}
