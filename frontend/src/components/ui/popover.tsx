/**
 * Popover — small anchored surface (column chooser, filter menu, user menu).
 *
 * Hand-rolled rather than Radix: `@radix-ui/react-popover` is NOT a dependency
 * of this project and `npm install` is out of scope for this track. What Radix
 * would give us is reproduced explicitly here — Escape to close, click-outside
 * to close, focus returned to the trigger, `aria-expanded`/`aria-controls` —
 * and the anchoring is plain absolute positioning, which is enough for a menu
 * that opens below its trigger.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type PopoverAlign = 'start' | 'end' | 'center';

export interface PopoverProps {
  /** Rendered inside a wrapper that carries the aria wiring. */
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    'aria-expanded': boolean;
    'aria-controls': string;
    'aria-haspopup': 'dialog';
  }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: PopoverAlign;
  /** Accessible name for the panel. */
  label: string;
  className?: string;
  panelClassName?: string;
}

const ALIGN: Record<PopoverAlign, string> = {
  start: 'left-0',
  end: 'right-0',
  center: 'left-1/2 -translate-x-1/2',
};

export const Popover = ({
  trigger,
  children,
  align = 'start',
  label,
  className,
  panelClassName,
}: PopoverProps) => {
  const id = useId();
  const panelId = `pop-${id}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    /* Focus must go back where it came from or the keyboard user is dumped at
     * the top of the document. */
    triggerRef.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className={cn('relative inline-block', className)}
      onFocusCapture={(e) => {
        /* Remember the element that opened us, whatever the caller rendered. */
        if (!open) triggerRef.current = e.target as HTMLElement;
      }}
    >
      {trigger({
        open,
        toggle: () => setOpen((v) => !v),
        'aria-expanded': open,
        'aria-controls': panelId,
        'aria-haspopup': 'dialog',
      })}

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute top-[calc(100%+6px)] z-floating min-w-[200px] rounded-xl border border-line',
            'bg-surface p-2 shadow-md',
            'animate-in fade-in-0 zoom-in-95 duration-220 ease-out',
            ALIGN[align],
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
};

export default Popover;
