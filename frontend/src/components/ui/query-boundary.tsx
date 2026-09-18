/**
 * QueryBoundary — the loading / error / empty envelope around a TanStack query.
 *
 * Why it exists: the audit found KPI tiles and tables rendering `0`, `—` or an
 * empty grid when the request had actually FAILED. `data ?? []` hides a 500.
 * This component makes the three non-happy states impossible to skip: you pass
 * the query result, you get a skeleton, a retryable error, or your children —
 * never a silent zero.
 *
 * Usage:
 *   <QueryBoundary query={q} isEmpty={(d) => d.items.length === 0}
 *                  skeleton={<TableSkeleton rows={8} />}
 *                  empty={{ title: 'Chưa có đơn hàng' }}>
 *     {(data) => <OrdersTable rows={data.items} />}
 *   </QueryBoundary>
 */
import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { useSkeletonFloor } from './use-skeleton-floor';
import { ErrorState } from './error-state';
import { EmptyState, type EmptyStateProps } from './empty-state';

/** The slice of a TanStack `UseQueryResult` this component needs. */
export interface QueryLike<TData> {
  data: TData | undefined;
  isPending?: boolean;
  isLoading?: boolean;
  isError: boolean;
  error?: unknown;
  refetch?: () => unknown;
}

export interface QueryBoundaryProps<TData> {
  query: QueryLike<TData>;
  /** Render prop — only called with defined data that passed `isEmpty`. */
  children: (data: TData) => ReactNode;
  /** Frame-matching placeholder. Defaults to three generic bars. */
  skeleton?: ReactNode;
  /** Return true when the request succeeded but there is nothing to show. */
  isEmpty?: (data: TData) => boolean;
  empty?: Omit<EmptyStateProps, 'action'> & { action?: EmptyStateProps['action'] };
  errorTitle?: string;
  /** Renders the error inline (no big padding) — for cards and table bodies. */
  inline?: boolean;
}

const DefaultSkeleton = () => (
  <div className="space-y-2" aria-hidden>
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-5 w-1/2" />
  </div>
);

export function QueryBoundary<TData>({
  query,
  children,
  skeleton,
  isEmpty,
  empty,
  errorTitle,
  inline = false,
}: QueryBoundaryProps<TData>) {
  /* v5 calls it `isPending`; v4 and `useQueries` still expose `isLoading`. */
  const pending = query.isPending ?? query.isLoading ?? false;
  const showSkeleton = useSkeletonFloor(pending);

  if (showSkeleton) {
    return (
      <div role="status" aria-live="polite" aria-busy>
        <span className="sr-only">Đang tải dữ liệu…</span>
        {skeleton ?? <DefaultSkeleton />}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle}
        error={query.error}
        inline={inline}
        onRetry={query.refetch ? () => void query.refetch?.() : undefined}
      />
    );
  }

  if (query.data === undefined) {
    /* Not pending, not an error, still nothing: a disabled query. Show the
     * empty state rather than crashing the render prop on `undefined`. */
    return <EmptyState title={empty?.title ?? 'Chưa có dữ liệu'} {...empty} />;
  }

  if (isEmpty?.(query.data)) {
    return <EmptyState title={empty?.title ?? 'Chưa có dữ liệu'} {...empty} />;
  }

  return <>{children(query.data)}</>;
}

export default QueryBoundary;
