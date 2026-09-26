/**
 * Form schema + display maps for the URL redirect manager. The client checks mirror the
 * server's `UrlRedirectPath` rules (UX only — the server re-validates everything, including
 * the chain/loop rules that need the whole table).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../../../lib/validation/messages';
import type { UrlRedirect, UrlRedirectStatusCode, UrlRedirectWriteDto } from '../../../api/content/url-redirects';

export const STATUS_OPTIONS = [
  { value: '301', label: '301 — Chuyển vĩnh viễn (giữ thứ hạng)' },
  { value: '302', label: '302 — Chuyển tạm thời' },
  { value: '410', label: '410 — Đã gỡ, không thay thế' },
];

export const STATUS_META: Record<UrlRedirectStatusCode, { tone: 'success' | 'warning' | 'neutral'; label: string }> = {
  301: { tone: 'success', label: '301' },
  302: { tone: 'warning', label: '302' },
  410: { tone: 'neutral', label: '410' },
};

export const SOURCE_LABELS: Record<string, string> = {
  manual: 'Tạo tay',
  import: 'Nhập CSV',
  'product-slug': 'Đổi slug sản phẩm',
  'category-slug': 'Đổi slug danh mục',
};

/** Prefixes the edge never sends to the SEO shell, or that would lock staff out (server: `UrlRedirectPath`). */
const RESERVED_PREFIXES = ['/api', '/_shell', '/hubs', '/media', '/uploads', '/health', '/assets', '/backoffice'];

/** Vietnamese reason why `from` can't be a redirect source, or null. */
export function sourcePathProblem(from: string): string | null {
  const value = from.trim();
  if (!value.startsWith('/') && !/^https?:\/\//i.test(value)) return 'Phải bắt đầu bằng "/" (ví dụ /san-pham-cu.html)';
  if (value.startsWith('//')) return 'Không nhận đường dẫn bắt đầu bằng "//"';
  const path = value.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0].toLowerCase().replace(/\/+$/, '');
  if (path === '') return 'Không được chuyển hướng trang chủ';
  const reserved = RESERVED_PREFIXES.find((p) => path === p || path.startsWith(`${p}/`));
  return reserved ? `Không được chuyển hướng đường dẫn hệ thống ${reserved}` : null;
}

/** Vietnamese reason why `to` can't be a target (relative path or http(s) URL only), or null. */
export function targetProblem(to: string): string | null {
  const value = to.trim();
  if (/\s/.test(value)) return 'Không được chứa khoảng trắng';
  if (value.startsWith('/') && !value.startsWith('//')) return null;
  return /^https?:\/\/[^/\s]+/i.test(value) ? null : 'Chỉ nhận đường dẫn bắt đầu bằng "/" hoặc URL http(s)://';
}

export const urlRedirectFormSchema = z
  .object({
    fromPath: z.string().min(1, msg.requireInput('Đường dẫn cũ')).max(500, msg.maxLength('Đường dẫn cũ', 500)),
    toPath: z.string().max(1000, msg.maxLength('Đường dẫn mới', 1000)).optional(),
    statusCode: z.enum(['301', '302', '410']),
    note: z.string().max(500, msg.maxLength('Ghi chú', 500)).optional(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const fromError = sourcePathProblem(v.fromPath);
    if (fromError) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fromPath'], message: fromError });
    if (v.statusCode === '410') return;
    const to = v.toPath?.trim() ?? '';
    const toError = to ? targetProblem(to) : msg.requireInput('Đường dẫn mới');
    if (toError) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['toPath'], message: toError });
  });

export type UrlRedirectFormValues = z.infer<typeof urlRedirectFormSchema>;

export const toFormValues = (r: UrlRedirect | null): UrlRedirectFormValues => ({
  fromPath: r?.fromPath ?? '',
  toPath: r?.toPath ?? '',
  statusCode: String(r?.statusCode ?? 301) as UrlRedirectFormValues['statusCode'],
  note: r?.note ?? '',
  isActive: r?.isActive ?? true,
});

export const toWriteDto = (v: UrlRedirectFormValues): UrlRedirectWriteDto => ({
  fromPath: v.fromPath.trim(),
  toPath: v.statusCode === '410' ? null : (v.toPath?.trim() || null),
  statusCode: Number(v.statusCode) as UrlRedirectStatusCode,
  note: v.note?.trim() || null,
  isActive: v.isActive,
});

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
