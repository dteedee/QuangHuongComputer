/**
 * `DateField` / `FileField` — the two RHF fields that do not map onto a
 * pre-existing W1-12 text control.
 */
import { Upload, X } from 'lucide-react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input, type InputProps } from '../ui/Input';
import { cn } from '../../lib/utils';
import { errorClass, hintClass } from '../ui/variants';
import { FormField, type FormFieldProps } from './form-field';

type SharedFieldChrome = Pick<FormFieldProps, 'label' | 'required' | 'className'>;

export interface DateFieldProps<T extends FieldValues> extends SharedFieldChrome {
  name: FieldPath<T>;
  control: Control<T>;
  min?: string;
  max?: string;
  hint?: InputProps['hint'];
  disabled?: boolean;
}

/**
 * Native `<input type="date">` — form value is the browser's ISO `yyyy-mm-dd`
 * string (or `''`/`undefined` when empty). No date-picker dependency: every
 * evergreen browser this app targets already renders a locale-correct picker.
 */
export function DateField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  className,
  min,
  max,
  hint,
  disabled,
}: DateFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  return (
    <FormField label={label} required={required} className={className}>
      {(a11y) => (
        <Input
          {...field}
          id={a11y.id}
          type="date"
          min={min}
          max={max}
          hint={hint}
          disabled={disabled}
          error={fieldState.error?.message}
          value={(field.value as string | undefined) ?? ''}
        />
      )}
    </FormField>
  );
}

export interface FileFieldProps<T extends FieldValues> extends SharedFieldChrome {
  name: FieldPath<T>;
  control: Control<T>;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  disabled?: boolean;
}

/** Read the picked file name(s) off whatever shape `field.value` holds. */
function fileNamesOf(value: unknown): string[] {
  if (!value) return [];
  if (value instanceof FileList) return Array.from(value, (f) => f.name);
  if (Array.isArray(value)) return value.filter((f): f is File => f instanceof File).map((f) => f.name);
  if (value instanceof File) return [value.name];
  return [];
}

/**
 * File picker. `<input type="file">` cannot be a controlled component (the
 * browser refuses to let JS set its `value`), so this only ever sets
 * `field.value` from the change event and reads the picked names back for
 * display — it never round-trips a `value` prop onto the input itself.
 */
export function FileField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  className,
  accept,
  multiple = false,
  hint,
  disabled,
}: FileFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  const names = fileNamesOf(field.value);
  const error = fieldState.error?.message;

  return (
    <FormField label={label} required={required} className={className}>
      {(a11y) => {
        const msgId = `${a11y.id}-msg`;
        return (
          <div>
            <label
              htmlFor={a11y.id}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
                error ? 'border-danger bg-danger-subtle' : 'border-line-strong bg-surface hover:border-control-line',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <Upload size={18} aria-hidden className="text-fg-subtle" />
              <span className="text-13 font-medium text-fg">
                {names.length > 0 ? `Đã chọn ${names.length} tệp` : 'Chọn tệp hoặc kéo thả vào đây'}
              </span>
              <input
                id={a11y.id}
                type="file"
                className="sr-only"
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={error || hint ? msgId : undefined}
                onBlur={field.onBlur}
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) {
                    field.onChange(multiple ? undefined : null);
                    return;
                  }
                  field.onChange(multiple ? files : files[0]);
                }}
              />
            </label>

            {names.length > 0 && (
              <ul className="mt-2 space-y-1">
                {names.map((n) => (
                  <li key={n} className="flex items-center gap-1.5 text-13 text-fg-muted">
                    <span className="min-w-0 flex-1 truncate">{n}</span>
                    <button
                      type="button"
                      onClick={() => field.onChange(multiple ? undefined : null)}
                      className="shrink-0 text-fg-subtle hover:text-danger"
                      aria-label={`Bỏ chọn ${n}`}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error ? (
              <p id={msgId} role="alert" className={errorClass}>
                {error}
              </p>
            ) : hint ? (
              <p id={msgId} className={hintClass}>
                {hint}
              </p>
            ) : null}
          </div>
        );
      }}
    </FormField>
  );
}
