/**
 * `<FormField>` — label + `htmlFor`/`id` + `aria-invalid`/`aria-describedby`
 * + error/hint message, generated automatically. No page wires these by
 * hand; every `*Field` in `form-inputs.tsx` is built on this one wrapper.
 *
 * Deliberately presentational (no RHF import here): each concrete field
 * component reads its own error via `useController`/`fieldState` — that is
 * the one place RHF's nested-path resolution (`items.0.qty`, ...) already
 * lives, so this component does not need to reimplement it. `FormField` only
 * needs an `error` string and renders around a render-prop child that
 * receives the computed a11y props to spread onto the actual control.
 */
import { useId, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { labelClass, hintClass, errorClass } from '../ui/variants';

export interface FormFieldA11yProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

export interface FormFieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  /** Explicit id override — otherwise a stable one is generated via `useId`. */
  id?: string;
  children: (a11y: FormFieldA11yProps) => ReactNode;
}

export function FormField({ label, hint, error, required, className, id, children }: FormFieldProps) {
  const reactId = useId();
  const fieldId = id ?? `ff-${reactId}`;
  const msgId = `${fieldId}-msg`;
  const hasMessage = Boolean(error || hint);

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={fieldId} className={labelClass}>
          {label}
          {required && (
            <span className="text-danger" aria-hidden>
              {' '}
              *
            </span>
          )}
        </label>
      )}

      {children({
        id: fieldId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': hasMessage ? msgId : undefined,
      })}

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
}

export default FormField;
