/**
 * Radio + RadioGroup — native `<input type="radio">` inside a `<fieldset>`.
 *
 * The fieldset/legend pairing is what makes a screen reader announce "Hình
 * thức thanh toán, nhóm, 1 trên 3"; a bare `<div>` of radios announces three
 * unrelated controls.
 */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { errorClass } from './variants';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  /** Secondary line under the label. */
  description?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, label, description, id, disabled, ...props },
  ref,
) {
  const reactId = useId();
  const radioId = id ?? `rb-${reactId}`;
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <input
        ref={ref}
        type="radio"
        id={radioId}
        disabled={disabled}
        className={cn(
          'peer mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border bg-surface',
          'border-control-line transition-colors duration-140 ease-out',
          /* The dot is an inset ring, so no extra element is needed. */
          'checked:border-[5px] checked:border-brand',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...props}
      />
      <label
        htmlFor={radioId}
        className={cn(
          'text-sm leading-5 text-fg',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        {label}
        {description && (
          <span className="mt-0.5 block text-xs leading-4 text-fg-subtle">{description}</span>
        )}
      </label>
    </div>
  );
});

export interface RadioGroupProps {
  /** Group label — rendered as a `<legend>`. */
  legend: ReactNode;
  /** Visually hide the legend but keep it for assistive tech. */
  hideLegend?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export const RadioGroup = ({
  legend,
  hideLegend = false,
  error,
  children,
  className,
}: RadioGroupProps) => (
  <fieldset className={cn('min-w-0', className)} aria-invalid={error ? true : undefined}>
    <legend className={cn('mb-1.5 text-13 font-medium text-fg', hideLegend && 'sr-only')}>
      {legend}
    </legend>
    <div className="space-y-2">{children}</div>
    {error && (
      <p role="alert" className={errorClass}>
        {error}
      </p>
    )}
  </fieldset>
);

export default Radio;
