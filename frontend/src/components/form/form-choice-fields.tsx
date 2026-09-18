/**
 * `SelectField` / `ComboboxField` / `SwitchField` — choice-shaped RHF fields
 * built on `FormField` + the W1-12 `Select` / `SearchableSelect` / `Switch`.
 *
 * `Select` renders its own error text from a string `error` prop (same
 * self-sufficient pattern as `Input` — see `form-text-fields.tsx`), so
 * `SelectField` passes the message straight to it instead of through
 * `FormField`'s paragraph. `SearchableSelect` only takes a boolean `error`
 * flag (no text rendering of its own, and no `aria-describedby` prop at all
 * — a pre-existing gap in that component, not introduced here), so
 * `ComboboxField` lets `FormField` own the visible error text.
 */
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Select, type SelectOption } from '../ui/Select';
import { SearchableSelect, type SearchableSelectOption } from '../ui/SearchableSelect';
import { Switch } from '../ui/switch';
import { FormField, type FormFieldProps } from './form-field';

type SharedFieldChrome = Pick<FormFieldProps, 'label' | 'required' | 'className'>;

export interface SelectFieldProps<T extends FieldValues> extends SharedFieldChrome {
  name: FieldPath<T>;
  control: Control<T>;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

/** Native-`<select>`-shaped field — `Select` from the UI kit, event-shaped onChange. */
export function SelectField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  className,
  options,
  placeholder,
  disabled,
}: SelectFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  return (
    <FormField label={label} required={required} className={className}>
      {(a11y) => (
        <Select
          id={a11y.id}
          name={field.name}
          options={options}
          value={(field.value as string | undefined) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          error={fieldState.error?.message}
          onChange={(e) => field.onChange(e.target.value)}
        />
      )}
    </FormField>
  );
}

export interface ComboboxFieldProps<T extends FieldValues> extends SharedFieldChrome {
  name: FieldPath<T>;
  control: Control<T>;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

/** Searchable single-select — `SearchableSelect`, `(value: string) => void` onChange. */
export function ComboboxField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  className,
  options,
  placeholder,
  searchPlaceholder,
  disabled,
}: ComboboxFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  return (
    <FormField label={label} required={required} className={className} error={fieldState.error?.message}>
      {(a11y) => (
        <SearchableSelect
          id={a11y.id}
          name={field.name}
          options={options}
          value={(field.value as string | undefined) ?? ''}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          disabled={disabled}
          error={Boolean(fieldState.error)}
          onChange={(value) => field.onChange(value)}
        />
      )}
    </FormField>
  );
}

export interface SwitchFieldProps<T extends FieldValues> extends Pick<FormFieldProps, 'className'> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Boolean toggle. No `FormField` wrapper here — `Switch` already renders its
 * own label/description inline (a checkbox-shaped row, not a labelled input
 * box), and a `FormField` label above it would read as two labels.
 */
export function SwitchField<T extends FieldValues>({
  name,
  control,
  label,
  description,
  disabled,
  className,
}: SwitchFieldProps<T>) {
  const { field } = useController({ name, control });
  return (
    <Switch
      name={field.name}
      checked={Boolean(field.value)}
      onCheckedChange={(checked) => field.onChange(checked)}
      label={label}
      description={description}
      disabled={disabled}
      className={className}
    />
  );
}
