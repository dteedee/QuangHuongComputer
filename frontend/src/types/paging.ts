/**
 * Shared paging types (W1-9, step 7b) — one canonical shape for every list
 * endpoint's request params and response envelope, instead of every API
 * module hand-rolling its own `{page, pageSize, ...}` / `{total, items, ...}`
 * pair. `hooks/useCrudList.ts` is the reference consumer; new API/domain code
 * should import from here rather than redeclare.
 */

/** Request params for a paged, searchable, sortable list endpoint. */
export interface PagingParams {
  page?: number;
  pageSize?: number;
}

/** `PagingParams` plus the search/sort/filter params most admin list screens need. */
export interface QueryParams extends PagingParams {
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
  includeInactive?: boolean;
}

/** The response envelope for a paged list — matches the .NET backend's `PagedResult<T>`. */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** Default page size used across admin list screens when the caller does not pick one. */
export const DEFAULT_PAGE_SIZE = 20;
