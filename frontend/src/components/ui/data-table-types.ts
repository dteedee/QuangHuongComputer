/**
 * DataTable contract. Kept in its own module so `data-table.tsx` stays small
 * and so wave-3 pages can import just the types when they build column lists
 * in a separate file.
 */
import type { ReactNode } from 'react';
import type { EmptyStateProps } from './empty-state';

export interface DataTableColumn<T> {
  /** Stable id — also the sort key sent to the API, and the column-menu key. */
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Server-side sorting: the table only reports intent, it never sorts rows. */
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Code / status / money columns (§5). Defaults to true for `right` columns. */
  nowrap?: boolean;
  /** Any CSS width, e.g. `'12rem'` or `'1%'` for a shrink-to-fit action column. */
  width?: string;
  /** Hidden until the user turns it on in the "Cột" menu. */
  defaultHidden?: boolean;
  /** Cannot be hidden (identifier columns, the action column). */
  locked?: boolean;
  /** Short label for the column menu when `header` is a node. */
  menuLabel?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  id: string;
  dir: SortDirection;
}

export interface DataTableProps<T> {
  /** Accessible name for the table — required, becomes its `<caption>`. */
  caption: string;
  columns: DataTableColumn<T>[];
  /** `undefined` while the first request is in flight. */
  rows: T[] | undefined;
  /** Stable identity for React keys AND for selection. */
  rowKey: (row: T) => string;

  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;

  /** Server-side sort state. Omit both to disable sorting entirely. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;

  /** Controlled selection. Omit to disable the checkbox column. */
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  /** Rendered under the table when provided. */
  pagination?: ReactNode;
  /** Floating bulk-action bar, shown while `selectedIds` is non-empty. */
  bulkActions?: (selectedIds: string[]) => ReactNode;

  empty?: EmptyStateProps;
  /** Number of shimmer rows while loading. Match the usual page size. */
  skeletonRows?: number;
  /** Adds a "Cột" menu that toggles non-locked columns. */
  enableColumnVisibility?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
  /** Extra controls rendered in the toolbar, left of the column menu. */
  toolbar?: ReactNode;
}
