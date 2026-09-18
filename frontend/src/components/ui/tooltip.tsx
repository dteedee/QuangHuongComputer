/**
 * Tooltip — a short hint for a control that already has an accessible name.
 *
 * It is NOT a way to give a control its name (that is `aria-label`), and it
 * never holds information the user must have: touch devices have no hover, so
 * anything only reachable by hovering is invisible to half the traffic.
 *
 * Shows on hover AND on keyboard focus, hides on Escape, and wires
 * `aria-describedby` so the hint is announced.
 */
import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/utils';

export type TooltipSide = 'top' | 'bottom';

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: TooltipSide;
  /** ms before showing on hover — 0 on focus, always. */
  delay?: number;
  className?: string;
}

export const Tooltip = ({
  content,
  children,
  side = 'top',
  delay = 200,
  className,
}: TooltipProps) => {
  const id = useId();
  const tipId = `tip-${id}`;
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = (immediate = false) => {
    window.clearTimeout(timer.current);
    if (immediate || delay === 0) setOpen(true);
    else timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  /* `aria-describedby` must sit on the CONTROL, not on a wrapper: a screen
   * reader announces the description of the element that has focus, and a
   * `display:contents` span is never that element. Clone the child instead,
   * preserving any description it already carries. */
  const ownDescribedBy = (children.props as { 'aria-describedby'?: string })['aria-describedby'];
  const describedBy =
    [ownDescribedBy, open ? tipId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocusCapture={() => show(true)}
      onBlurCapture={hide}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-floating -translate-x-1/2 whitespace-nowrap',
            'rounded-md bg-fg px-2 py-1 text-2xs font-medium text-bg shadow-sm',
            'animate-in fade-in-0 duration-140 ease-out',
            side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
