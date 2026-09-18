/**
 * Checkbox — a real `<input type="checkbox">` styled with `appearance-none`.
 *
 * Deliberately NOT a div-with-role: the native control brings keyboard support,
 * form participation, `indeterminate`, and the label click target for free.
 * Border uses `--control-line` (§5) so the unchecked box clears 3:1.
 */
import { forwardRef, useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  /** Partial selection — "some rows on this page are selected". */
  indeterminate?: boolean;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, indeterminate = false, error, id, disabled, ...props },
  ref,
) {
  const reactId = useId();
  const boxId = id ?? `cb-${reactId}`;
  const inner = useRef<HTMLInputElement | null>(null);

  /* `indeterminate` is a DOM property, not an attribute — React cannot set it. */
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <span className="relative flex h-5 items-center">
        <input
          type="checkbox"
          id={boxId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          ref={(node) => {
            inner.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(
            'peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border bg-surface',
            'border-control-line transition-colors duration-140 ease-out',
            'checked:border-brand checked:bg-brand indeterminate:border-brand indeterminate:bg-brand',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...props}
        />
        {/* The glyph sits on top of the input; pointer events stay on the input. */}
        <span className="pointer-events-none absolute left-0 top-0.5 hidden h-4 w-4 items-center justify-center text-white peer-checked:flex">
          <Check size={12} strokeWidth={3} aria-hidden />
        </span>
        <span className="pointer-events-none absolute left-0 top-0.5 hidden h-4 w-4 items-center justify-center text-white peer-indeterminate:flex peer-checked:hidden">
          <Minus size={12} strokeWidth={3} aria-hidden />
        </span>
      </span>
      {label && (
        <label
          htmlFor={boxId}
          className={cn(
            'text-sm leading-5 text-fg',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
});

export default Checkbox;
