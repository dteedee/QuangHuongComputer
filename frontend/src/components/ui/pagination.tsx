/**
 * Pagination — server-side page control. Shows the real range ("1–20 / 137"),
 * because "trang 3" alone tells the user nothing about how much is left.
 *
 * `<nav>` + `aria-current="page"` so a screen reader can find it and say which
 * page is active. Page size lives here too: it is the fastest fix for "tôi
 * phải bấm 12 lần".
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './icon-button';
import { pageWindow } from './kit-utils';

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Total rows on the server, not on this page. */
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  disabled?: boolean;
}

const viNum = new Intl.NumberFormat('vi-VN');

export const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  className,
  disabled = false,
}: PaginationProps) => {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Phân trang"
      className={cn('flex flex-wrap items-center justify-between gap-3 px-1 py-2', className)}
    >
      <p className="text-xs leading-4 text-fg-subtle">
        <span className="num">{viNum.format(first)}</span>–
        <span className="num">{viNum.format(last)}</span> trên{' '}
        <span className="num font-medium text-fg-muted">{viNum.format(total)}</span>
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-fg-subtle">
            Hiển thị
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-control-line bg-surface px-2 text-13 text-fg"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1">
          <IconButton
            aria-label="Trang trước"
            size="sm"
            variant="outline"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={16} aria-hidden />
          </IconButton>

          {pageWindow(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-fg-subtle" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={disabled}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Trang ${p}`}
                onClick={() => onPageChange(p)}
                className={cn(
                  'num h-8 min-w-8 rounded-md px-2 text-13 font-medium transition-colors duration-140 ease-out',
                  p === page
                    ? 'bg-fg text-bg'
                    : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
                )}
              >
                {p}
              </button>
            ),
          )}

          <IconButton
            aria-label="Trang sau"
            size="sm"
            variant="outline"
            disabled={disabled || page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight size={16} aria-hidden />
          </IconButton>
        </div>
      </div>
    </nav>
  );
};

export default Pagination;
