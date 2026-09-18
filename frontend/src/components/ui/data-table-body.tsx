/**
 * DataTable body: the shimmer rows and the data rows.
 * Split out of `data-table.tsx` so both stay under the 200-LOC rule.
 */
import { TBody, Tr, Td } from './table';
import { Checkbox } from './checkbox';
import { Skeleton } from './Skeleton';
import type { DataTableColumn } from './data-table-types';

export interface DataTableBodyProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading: boolean;
  /** Match the usual page size so the table does not resize when data lands. */
  skeletonRows: number;
  selectable: boolean;
  selected: Set<string>;
  onToggleRow: (id: string) => void;
  onRowClick?: (row: T) => void;
}

export function DataTableBody<T>({
  columns,
  rows,
  rowKey,
  loading,
  skeletonRows,
  selectable,
  selected,
  onToggleRow,
  onRowClick,
}: DataTableBodyProps<T>) {
  const colCount = columns.length + (selectable ? 1 : 0);

  if (loading) {
    return (
      <TBody>
        {Array.from({ length: skeletonRows }, (_, i) => (
          <tr key={`sk-${i}`} className="border-b border-line/70">
            {Array.from({ length: colCount }, (_, j) => (
              <Td key={j}>
                <Skeleton className="h-4 w-full" />
              </Td>
            ))}
          </tr>
        ))}
      </TBody>
    );
  }

  return (
    <TBody>
      {rows.map((row) => {
        const id = rowKey(row);
        return (
          <Tr
            key={id}
            selected={selected.has(id)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? 'cursor-pointer' : undefined}
          >
            {selectable && (
              /* stopPropagation: ticking the box must not also open the row. */
              <Td nowrap onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  aria-label="Chọn dòng"
                  checked={selected.has(id)}
                  onChange={() => onToggleRow(id)}
                />
              </Td>
            )}
            {columns.map((c) => (
              <Td key={c.id} align={c.align} nowrap={c.nowrap ?? c.align !== 'left'}>
                {c.cell(row)}
              </Td>
            ))}
          </Tr>
        );
      })}
    </TBody>
  );
}
