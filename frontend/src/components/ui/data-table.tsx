/**
 * DataTable — ONE table for every admin/backoffice list. Replaces the three
 * implementations the audit found (`components/crud/DataTable`,
 * `components/backoffice/DataTable`, and the per-page hand-rolled ones).
 *
 * What it owns: header + sort intent, selection, column visibility, and the
 * four states (skeleton / error / empty / data) so no page can accidentally
 * render an empty grid for a failed request. What it does NOT own: fetching,
 * sorting and paging — all server-side, reported through callbacks.
 *
 * design-direction.md §5 "Data table row" and §6 "Admin table page".
 */
import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { Table, THead, Th } from './table';
import { Checkbox } from './checkbox';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { SortHeader, ColumnMenu } from './data-table-header';
import { DataTableBody } from './data-table-body';
import type { DataTableProps } from './data-table-types';

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  sort,
  onSortChange,
  selectedIds,
  onSelectionChange,
  pagination,
  bulkActions,
  empty,
  skeletonRows = 8,
  enableColumnVisibility = false,
  onRowClick,
  className,
  toolbar,
  density = 'auto',
}: DataTableProps<T>) {
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );
  const visible = useMemo(() => columns.filter((c) => !hidden.has(c.id)), [columns, hidden]);

  const selectable = !!selectedIds && !!onSelectionChange;
  const selected = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);
  const pageIds = useMemo(() => (rows ?? []).map(rowKey), [rows, rowKey]);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));

  /* "Select all" is page-scoped: it must not silently add rows the user has
   * never seen, and un-ticking must not drop selections made on other pages. */
  const toggleAll = () =>
    onSelectionChange?.(
      allOnPage
        ? (selectedIds ?? []).filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...(selectedIds ?? []), ...pageIds])),
    );

  const toggleOne = (id: string) =>
    onSelectionChange?.(
      selected.has(id) ? (selectedIds ?? []).filter((x) => x !== id) : [...(selectedIds ?? []), id],
    );

  const toggleColumn = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    /* `data-density` là móc CSS duy nhất của mật độ gọn (xem `table.tsx`). Khi
     * `density="auto"` thuộc tính không tồn tại -> bảng giữ đúng diện mạo cũ. */
    <div data-density={density === 'compact' ? 'compact' : undefined} className={cn('relative', className)}>
      {(toolbar || enableColumnVisibility) && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
          {enableColumnVisibility && (
            <ColumnMenu columns={columns} hidden={hidden} onToggle={toggleColumn} />
          )}
        </div>
      )}

      <Table>
        <caption className="sr-only">{caption}</caption>
        <THead>
          <tr className="border-b border-line">
            {selectable && (
              <Th className="w-10" nowrap>
                <Checkbox
                  aria-label="Chọn tất cả dòng trên trang này"
                  checked={allOnPage}
                  indeterminate={!allOnPage && someOnPage}
                  onChange={toggleAll}
                />
              </Th>
            )}
            {visible.map((c) => (
              <Th
                key={c.id}
                align={c.align}
                nowrap={c.nowrap ?? c.align !== 'left'}
                style={c.width ? { width: c.width } : undefined}
                aria-sort={
                  c.sortable && sort?.id === c.id
                    ? sort.dir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : c.sortable
                      ? 'none'
                      : undefined
                }
              >
                {c.sortable && onSortChange ? (
                  <SortHeader columnId={c.id} label={c.header} sort={sort} onSortChange={onSortChange} />
                ) : (
                  c.header
                )}
              </Th>
            ))}
          </tr>
        </THead>

        <DataTableBody
          columns={visible}
          rows={loading ? [] : (rows ?? [])}
          rowKey={rowKey}
          loading={loading}
          skeletonRows={skeletonRows}
          selectable={selectable}
          selected={selected}
          onToggleRow={toggleOne}
          onRowClick={onRowClick}
        />
      </Table>

      {/* States live OUTSIDE the table body so they are not squeezed into a cell. */}
      {!loading && error != null && (
        <ErrorState inline error={error} onRetry={onRetry} className="mt-2" />
      )}
      {!loading && error == null && (rows?.length ?? 0) === 0 && (
        <EmptyState
          title={empty?.title ?? 'Chưa có dữ liệu'}
          {...empty}
          className={cn('mt-2', empty?.className)}
        />
      )}

      {pagination}

      {bulkActions && selected.size > 0 && (
        <div
          role="region"
          aria-label="Thao tác hàng loạt"
          className={cn(
            'fixed bottom-6 left-1/2 z-floating -translate-x-1/2',
            'flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 shadow-lg',
            'animate-in fade-in-0 slide-in-from-bottom-4 duration-420 ease-expo',
          )}
        >
          <span className="num text-13 font-medium text-fg">Đã chọn {selected.size}</span>
          {bulkActions(Array.from(selected))}
        </div>
      )}
    </div>
  );
}

export default DataTable;
