/**
 * The three non-happy states of the PDP. A spinner on a blank page is not one
 * of them: the loading state is a skeleton shaped like the real page, so the
 * layout does not jump when the data lands (CLS).
 */
import { PackageSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ROUTES } from '../../routes/route-paths';

import { Button, ErrorState, Skeleton } from '../ui';

/** Skeleton with the same grid as the loaded page (gallery 3fr / buy box 2fr). */
export function ProductDetailLoadingState() {
  return (
    <div className="min-h-screen bg-bg" aria-busy="true" aria-label="Đang tải sản phẩm">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:py-10">
        <Skeleton className="h-4 w-64" />
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
            <div className="border-b border-line p-4 sm:p-6 lg:col-span-3 lg:border-b-0 lg:border-r">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <div className="mt-3 flex gap-2">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-16 rounded-lg" />)}
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-6 lg:col-span-2">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

interface ProductDetailNotFoundStateProps {
  onBackToList: () => void;
}

/**
 * Real 404 copy. The `noindex` tag that must go with it is emitted by the page
 * itself (D11) — the shell serves the real HTTP 404 for crawlers.
 */
export function ProductDetailNotFoundState({ onBackToList }: ProductDetailNotFoundStateProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-bg px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sunken text-fg-subtle">
          <PackageSearch className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-fg">Không tìm thấy sản phẩm</h1>
        <p className="mb-6 text-sm text-fg-muted">
          Sản phẩm này có thể đã ngừng kinh doanh hoặc đường dẫn không còn đúng.
          Bạn thử tìm lại trong danh mục nhé.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onBackToList}>Xem tất cả sản phẩm</Button>
          <Link
            to={ROUTES.HOME}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-[1.125rem] text-base font-semibold text-fg hover:bg-sunken"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

interface ProductDetailErrorStateProps {
  onRetry: () => void;
  error?: unknown;
}

/** A real failure (network, 500) — never silently rendered as "not found". */
export function ProductDetailErrorState({ onRetry, error }: ProductDetailErrorStateProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <ErrorState
        title="Không tải được sản phẩm"
        error={error}
        onRetry={onRetry}
        retryLabel="Tải lại"
      />
    </div>
  );
}
