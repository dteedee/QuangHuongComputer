/**
 * Textarea — same control contract as Input, multi-line.
 * design-direction.md §5. Path kept for wave-0 importers.
 */
import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { controlVariants, labelClass, hintClass, errorClass } from './variants';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    className,
    label,
    error,
    hint,
    id,
    rows = 4,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const areaId = id ?? `ta-${reactId}`;
  const msgId = `${areaId}-msg`;
  const invalid = !!error;
  /* Merge, never replace — see Input.tsx. */
  const describedBy =
    [ariaDescribedBy, error || hint ? msgId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={areaId} className={labelClass}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        className={cn(controlVariants({ invalid, inputSize: 'auto' }), 'resize-y', className)}
        {...props}
        aria-invalid={invalid || ariaInvalid || undefined}
        aria-describedby={describedBy}
      />
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

export default Textarea;
