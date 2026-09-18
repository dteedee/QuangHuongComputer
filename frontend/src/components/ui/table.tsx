/**
 * Table primitives — the styled `<table>` element set. `DataTable` is built on
 * these; hand-written tables (an invoice, a spec sheet) use them directly.
 * design-direction.md §5 "Data table row".
 *
 * Real `<table>` markup, not divs with `role="row"`: row/column relationships,
 * header association and "3 of 40 rows" announcements come from the element.
 */
import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  function Table({ className, ...props }, ref) {
    return (
      /* The wrapper, not the table, scrolls — a scrolling <table> breaks the
       * sticky header. `tabindex` makes the scroll region keyboard-reachable. */
      <div className="w-full overflow-x-auto" tabIndex={0} role="group">
        <table
          ref={ref}
          className={cn('w-full border-collapse text-13', className)}
          {...props}
        />
      </div>
    );
  },
);

export const THead = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function THead({ className, ...props }, ref) {
    return (
      <thead
        ref={ref}
        className={cn('sticky top-0 z-sticky bg-bg/60 backdrop-blur-sm', className)}
        {...props}
      />
    );
  },
);

export const TBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TBody({ className, ...props }, ref) {
    return <tbody ref={ref} className={className} {...props} />;
  },
);

export interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

export const Tr = forwardRef<HTMLTableRowElement, TrProps>(function Tr(
  { className, selected = false, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      data-selected={selected || undefined}
      aria-selected={selected || undefined}
      className={cn(
        'group/row border-b border-line/70 transition-colors duration-140 ease-out',
        'hover:bg-fg/[.025]',
        /* Selected row: tinted + a 3px brand bar inside the first cell (§5). */
        selected && 'bg-brand-subtle/55 [&>td:first-child]:shadow-[inset_3px_0_0_rgb(var(--brand))]',
        className,
      )}
      {...props}
    />
  );
});

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Money / code / status columns must not wrap (§5). */
  nowrap?: boolean;
  align?: 'left' | 'right' | 'center';
}

export const Th = forwardRef<HTMLTableCellElement, ThProps>(function Th(
  { className, nowrap = true, align = 'left', ...props },
  ref,
) {
  return (
    <th
      ref={ref}
      scope="col"
      className={cn(
        'px-3 py-2 text-xs font-medium leading-4 text-fg-subtle',
        nowrap && 'whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
      {...props}
    />
  );
});

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  nowrap?: boolean;
  align?: 'left' | 'right' | 'center';
}

export const Td = forwardRef<HTMLTableCellElement, TdProps>(function Td(
  { className, nowrap = false, align = 'left', ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      className={cn(
        'px-3 py-3 align-middle text-fg',
        nowrap && 'whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  );
});

/**
 * Row action cluster — dimmed until the row is hovered or something inside it
 * is focused, so a 40-row table is not 120 competing buttons. Keyboard users
 * get full opacity via `focus-within`.
 */
export const RowActions = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex items-center justify-end gap-1 opacity-[.55] transition-opacity duration-140 ease-out',
      'group-hover/row:opacity-100 focus-within:opacity-100',
      className,
    )}
    {...props}
  />
);
