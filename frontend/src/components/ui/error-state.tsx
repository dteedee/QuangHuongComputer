/**
 * ErrorState — a failed request, told to a human.
 * design-direction.md §5: `--danger-subtle` block, say what the USER can do,
 * never print a technical error code as the headline. The raw message stays
 * available behind a <details> so support can still read it.
 */
import type { ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { normalizeApiError } from '../../lib/api-error';

export interface ErrorStateProps {
  /** Human sentence. Defaults to the generic Vietnamese copy. */
  title?: string;
  description?: ReactNode;
  /** The thrown value. Its normalised Vietnamese message replaces the default
   *  description; the trace id (never the raw body) goes in the details block. */
  error?: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /** `inline` drops the padding for use inside a card body or a table cell. */
  inline?: boolean;
}

const DEFAULT_DESCRIPTION =
  'Kết nối tới máy chủ đang gặp sự cố. Vui lòng thử lại sau giây lát.';

export const ErrorState = ({
  title = 'Không tải được dữ liệu',
  description,
  error,
  onRetry,
  retryLabel = 'Thử lại',
  className,
  inline = false,
}: ErrorStateProps) => {
  const normalized = error ? normalizeApiError(error) : null;
  const body = description ?? normalized?.message ?? DEFAULT_DESCRIPTION;
  const detail = normalized?.traceId ? `Mã tham chiếu: ${normalized.traceId}` : '';

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-danger/30',
        'bg-danger-subtle text-center',
        inline ? 'px-4 py-6' : 'px-6 py-14',
        className,
      )}
    >
      <AlertTriangle size={40} className="text-danger" aria-hidden />
      <p className="mt-4 font-display text-base font-semibold leading-6 text-fg">{title}</p>
      {body && <p className="mt-1.5 max-w-prose text-sm leading-5 text-fg-muted">{body}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" icon={RotateCw} onClick={onRetry} className="mt-5">
          {retryLabel}
        </Button>
      )}
      {detail && (
        <details className="mt-4 max-w-full text-left">
          <summary className="cursor-pointer text-xs text-fg-subtle">Chi tiết kỹ thuật</summary>
          <p className="mt-1 break-words text-xs leading-4 text-fg-subtle">{detail}</p>
        </details>
      )}
    </div>
  );
};

export default ErrorState;
