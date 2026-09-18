/**
 * Select chrome: the closed control and the floating panel.
 * Shared by `SearchableSelect` (static options) and `AsyncSearchableSelect`
 * (server-paged) — both used to carry their own copy with hardcoded
 * `slate-*`/`red-*` colours and `z-[100]`.
 *
 * design-direction.md §5 (control border `--control-line`, focus ring, radius 8)
 * and §7 (popover fade 220ms). The list itself lives in `select-list.tsx`.
 */
import { forwardRef, type ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { controlVariants } from './variants';

export interface SelectTriggerProps {
  /** Label of the selected option. Falsy → the placeholder shows instead. */
  label?: string;
  placeholder: string;
  open: boolean;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  onToggle: () => void;
  onClear?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  listboxId: string;
  id?: string;
}

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  function SelectTrigger(
    {
      label,
      placeholder,
      open,
      disabled = false,
      invalid = false,
      clearable = false,
      onToggle,
      onClear,
      onKeyDown,
      listboxId,
      id,
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        className={cn(
          controlVariants({ invalid, inputSize: 'md' }),
          'flex items-center justify-between gap-2 text-left',
          open && 'border-brand shadow-[0_0_0_3px_rgb(var(--brand)/.14)]',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span className={cn('truncate', label ? 'text-fg' : 'text-fg-subtle')}>
          {label || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Xoá lựa chọn"
              onClick={(e) => {
                e.stopPropagation();
                onClear?.();
              }}
              className="rounded-full p-0.5 text-fg-subtle hover:bg-fg/10 hover:text-fg"
            >
              <X size={14} aria-hidden />
            </span>
          )}
          <ChevronDown
            size={16}
            aria-hidden
            className={cn(
              'text-fg-subtle transition-transform duration-140 ease-out',
              open && 'rotate-180',
            )}
          />
        </span>
      </button>
    );
  },
);

/** Floating panel. `z-floating` = 40 on the documented scale (no more z-[100]). */
export const SelectPanel = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'absolute left-0 right-0 top-[calc(100%+6px)] z-floating overflow-hidden',
      'rounded-xl border border-line bg-surface shadow-md',
      'animate-in fade-in-0 zoom-in-95 duration-220 ease-out',
      className,
    )}
  >
    {children}
  </div>
);
