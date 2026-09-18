/**
 * DataTable header pieces: the sortable column button and the "Cột" visibility
 * menu. Split out of `data-table.tsx` to keep both files small.
 */
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { Checkbox } from './checkbox';
import { Popover } from './popover';
import type { DataTableColumn, SortState } from './data-table-types';

export interface SortHeaderProps {
  columnId: string;
  label: React.ReactNode;
  sort: SortState | null | undefined;
  onSortChange: (sort: SortState | null) => void;
}

/**
 * Tri-state: asc → desc → unsorted. `aria-sort` on the `<th>` is set by the
 * caller; this button carries the label and the arrow.
 */
export const SortHeader = ({ columnId, label, sort, onSortChange }: SortHeaderProps) => {
  const active = sort?.id === columnId ? sort.dir : null;
  const Icon = active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={() =>
        onSortChange(
          active === 'asc' ? { id: columnId, dir: 'desc' } : active === 'desc' ? null : { id: columnId, dir: 'asc' },
        )
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-sm transition-colors duration-140 ease-out',
        active ? 'text-fg' : 'hover:text-fg-muted',
      )}
    >
      {label}
      <Icon size={12} aria-hidden className={cn(!active && 'opacity-50')} />
      <span className="sr-only">
        {active === 'asc' ? '(đang sắp tăng dần)' : active === 'desc' ? '(đang sắp giảm dần)' : '(bấm để sắp xếp)'}
      </span>
    </button>
  );
};

export interface ColumnMenuProps<T> {
  columns: DataTableColumn<T>[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
}

/** "Cột" menu — toggles every column that is not `locked`. */
export function ColumnMenu<T>({ columns, hidden, onToggle }: ColumnMenuProps<T>) {
  const toggleable = columns.filter((c) => !c.locked);
  if (toggleable.length === 0) return null;

  return (
    <Popover
      label="Chọn cột hiển thị"
      align="end"
      panelClassName="w-56"
      trigger={({ toggle, ...aria }) => (
        <Button variant="outline" size="sm" icon={Columns3} onClick={toggle} {...aria}>
          Cột
        </Button>
      )}
    >
      <p className="px-2 pb-1.5 pt-1 text-xs font-medium text-fg-subtle">Hiển thị cột</p>
      <ul className="space-y-0.5">
        {toggleable.map((c) => (
          <li key={c.id}>
            <div className="rounded-md px-2 py-1.5 hover:bg-fg/5">
              <Checkbox
                checked={!hidden.has(c.id)}
                onChange={() => onToggle(c.id)}
                label={c.menuLabel ?? (typeof c.header === 'string' ? c.header : c.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
