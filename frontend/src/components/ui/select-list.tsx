/**
 * Select list: the in-panel search box, the option rows and the empty line.
 * Companion to `select-trigger.tsx`.
 *
 * The search input carries `aria-controls` + `aria-activedescendant`, which is
 * what lets a screen reader announce the highlighted option while the user
 * keeps typing — the previous implementation announced nothing.
 */
import { forwardRef, type ReactNode } from 'react';
import { Search, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { controlVariants } from './variants';

export interface SelectOptionItem {
  value: string;
  label: string;
}

export interface SelectSearchProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder: string;
  listboxId: string;
  activeOptionId?: string;
}

export const SelectSearch = forwardRef<HTMLInputElement, SelectSearchProps>(
  function SelectSearch(
    { value, onChange, onKeyDown, placeholder, listboxId, activeOptionId },
    ref,
  ) {
    return (
      <div className="border-b border-line p-2">
        <div className="relative">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            className={cn(controlVariants({ inputSize: 'sm' }), 'pl-8')}
          />
        </div>
      </div>
    );
  },
);

export interface SelectOptionRowProps {
  id: string;
  option: SelectOptionItem;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
  onHighlight: () => void;
}

export const SelectOptionRow = ({
  id,
  option,
  selected,
  highlighted,
  onSelect,
  onHighlight,
}: SelectOptionRowProps) => (
  <button
    id={id}
    type="button"
    data-option
    role="option"
    aria-selected={selected}
    onClick={onSelect}
    onMouseEnter={onHighlight}
    className={cn(
      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-13',
      'transition-colors duration-140 ease-out',
      selected
        ? 'bg-brand-subtle font-medium text-brand-text'
        : highlighted
          ? 'bg-fg/5 text-fg'
          : 'text-fg-muted',
    )}
  >
    <span className="truncate">{option.label}</span>
    {selected && <Check size={15} aria-hidden className="shrink-0" />}
  </button>
);

export const SelectEmpty = ({ children = 'Không tìm thấy kết quả' }: { children?: ReactNode }) => (
  <p className="px-3 py-6 text-center text-13 text-fg-subtle">{children}</p>
);
