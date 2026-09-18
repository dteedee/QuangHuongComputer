/**
 * Input — text control. design-direction.md §5: height 40, radius 8, border
 * `--control-line` (WCAG 1.4.11), focus = brand border + 3px brand ring.
 *
 * Prop contract (fixed with W1-9's `FormField`): the component is a thin,
 * ref-forwarding wrapper over `<input>`. `value / onChange / onBlur / name /
 * ref / disabled / aria-*` pass straight through, so RHF's `register()` spread
 * works unchanged. `label`/`error`/`hint` are conveniences for pages that are
 * not inside a FormField; when a FormField owns the labelling it passes
 * `aria-describedby`/`aria-invalid` itself and omits them here.
 *
 * Path kept (13 wave-0 importers); implementation is new.
 */
import { forwardRef, useId, type ComponentType, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { controlVariants, labelClass, hintClass, errorClass } from './variants';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string; size?: number | string }>;
  iconPosition?: 'left' | 'right';
  /** Unit / currency box glued to the right edge (`.affix`, §5). */
  suffix?: ReactNode;
  inputSize?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    label,
    error,
    hint,
    icon: Icon,
    iconPosition = 'left',
    suffix,
    inputSize = 'md',
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? `in-${reactId}`;
  const msgId = `${inputId}-msg`;
  const invalid = !!error;
  /* Merge, never replace: when a FormField (W1-9) owns the labelling it passes
   * its own `aria-describedby`, and spreading `...props` last used to drop the
   * error message id on exactly that path. */
  const describedBy =
    [ariaDescribedBy, error || hint ? msgId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && iconPosition === 'left' && (
          <Icon
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 text-fg-subtle"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            controlVariants({ invalid, inputSize }),
            Icon && iconPosition === 'left' && 'pl-9',
            ((Icon && iconPosition === 'right') || suffix) && 'pr-9',
            className,
          )}
          {...props}
          aria-invalid={invalid || ariaInvalid || undefined}
          aria-describedby={describedBy}
        />
        {Icon && iconPosition === 'right' && !suffix && (
          <Icon
            size={16}
            aria-hidden
            className="pointer-events-none absolute right-3 text-fg-subtle"
          />
        )}
        {suffix && (
          <span className="pointer-events-none absolute right-3 text-xs text-fg-subtle">
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <p id={msgId} role="alert" className={errorClass}>
          <AlertCircle size={13} aria-hidden className="shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
