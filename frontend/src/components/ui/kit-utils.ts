/**
 * ============================================================================
 * UI KIT — the pure helpers behind the components.
 *
 * They live outside the .tsx files on purpose: a module that exports both a
 * component and a plain function breaks React Fast Refresh (the whole module
 * remounts on every edit), which is exactly what `react-refresh/only-export-components`
 * warns about. Import them from `@/components/ui` like anything else.
 * ==========================================================================*/
import DOMPurify from 'dompurify';
import { resolveMediaUrl } from '../../lib/media-url';

/* -------------------------------------------------------------------------- */
/* Money (D01: integers, VAT-inclusive)                                        */
/* -------------------------------------------------------------------------- */

/** Group digits the Vietnamese way (dot separator), integer đồng only. */
export function formatDong(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(amount));
}

/* -------------------------------------------------------------------------- */
/* Image sources                                                               */
/* -------------------------------------------------------------------------- */

/** `data:` is allowed for images only — never `data:text/html`. */
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i;
const DANGEROUS_SCHEME = /^\s*(javascript|vbscript|file):/i;

/**
 * The single gate between a stored image path and an `<img src>`:
 * refuses script-bearing schemes, passes absolute URLs through, and sends
 * root-relative `/media|/uploads` paths through `resolveMediaUrl` (D02).
 */
export function sanitizeImageSrc(src: string | null | undefined): string {
  if (!src) return '';
  const trimmed = src.trim();
  if (DANGEROUS_SCHEME.test(trimmed)) return '';
  if (/^data:/i.test(trimmed)) return SAFE_DATA_IMAGE.test(trimmed) ? trimmed : '';
  return resolveMediaUrl(trimmed);
}

/* -------------------------------------------------------------------------- */
/* Server HTML                                                                 */
/* -------------------------------------------------------------------------- */

/** Tags a CMS/product description legitimately needs. */
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'a', 'img', 'figure', 'figcaption',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height', 'loading',
  'colspan', 'rowspan', 'align',
  'class', 'id',
];

/* Anything that opens a new tab must not hand the opener over with it. */
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node instanceof HTMLElement && node.tagName === 'A' && node.getAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/** Strip everything a rich-text editor has no business emitting. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    /* Kills `javascript:` / `data:text/html` in href and src. */
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#|data:image\/)/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'formaction'],
  });
}

/* -------------------------------------------------------------------------- */
/* Names                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Initials from the END of a Vietnamese name — the given name is the last
 * syllable, so "Trần Quang Hưởng" → "QH". Taking the first letter would label
 * a third of the customer list "N" (Nguyễn).
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(-2)
    .map((p) => p[0])
    .join('')
    .toLocaleUpperCase('vi-VN');
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

/** Page numbers with ellipses: `1 … 4 5 [6] 7 8 … 20`. */
export function pageWindow(page: number, pageCount: number, span = 1): (number | '…')[] {
  if (pageCount <= 1) return [1];
  const out: (number | '…')[] = [];
  const from = Math.max(2, page - span);
  const to = Math.min(pageCount - 1, page + span);
  out.push(1);
  if (from > 2) out.push('…');
  for (let i = from; i <= to; i += 1) out.push(i);
  if (to < pageCount - 1) out.push('…');
  out.push(pageCount);
  return out;
}

/* -------------------------------------------------------------------------- */
/* Status maps                                                                 */
/* -------------------------------------------------------------------------- */

export type StatusTone =
  | 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

/**
 * Build a typed status map once per domain, then spread it into `StatusBadge`:
 *   const orderStatus = createStatusMap({ Pending: ['warning', 'Chờ xử lý'], … });
 *   <StatusBadge {...orderStatus(order.status)} />
 * There is deliberately no "guess the colour from the English word" helper —
 * that is how "Cancelled" ended up green.
 */
export function createStatusMap<K extends string>(
  entries: Record<K, [StatusTone, string]>,
  fallback: [StatusTone, string] = ['neutral', 'Không rõ'],
) {
  return (key: string): { tone: StatusTone; children: string } => {
    const hit = (entries as Record<string, [StatusTone, string] | undefined>)[key] ?? fallback;
    return { tone: hit[0], children: hit[1] };
  };
}
