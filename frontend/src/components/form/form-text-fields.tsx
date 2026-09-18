/**
 * `TextField` / `NumberField` / `MoneyField` — text-shaped RHF fields built
 * on `FormField` + the W1-12 `Input`. All three read their error via
 * `useController`'s `fieldState`, not `useFormContext`, so nested paths
 * (`items.0.sku`) resolve exactly the way RHF resolves them internally.
 *
 * Integration note: `Input` already owns its full error/hint/`aria-invalid`/
 * `aria-describedby` rendering (it generates its own message id and merges
 * it with an incoming `aria-describedby`) — so these fields pass `error`
 * straight to `Input` instead of through `FormField`'s own error paragraph.
 * `FormField` here only contributes the label + the `id` the label's
 * `htmlFor` points at, avoiding a duplicated error line under the field.
 *
 * D01 (VAT-inclusive money): `MoneyField` is for whole-đồng amounts only —
 * thousand-separated display, integer value in form state, no cents. It is
 * NOT a currency-code-aware money type; every price in this codebase is VND.
 */
import type { ComponentProps } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input } from '../ui/Input';
import { FormField, type FormFieldProps } from './form-field';

type SharedFieldChrome = Pick<FormFieldProps, 'label' | 'required' | 'className'>;

type InputPassthrough = Omit<
  ComponentProps<typeof Input>,
  'id' | 'name' | 'value' | 'onChange' | 'onBlur' | 'ref' | 'label' | 'error'
>;

export interface TextFieldProps<T extends FieldValues> extends SharedFieldChrome, InputPassthrough {
  name: FieldPath<T>;
  control: Control<T>;
}

export function TextField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  className,
  ...inputProps
}: TextFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  return (
    <FormField label={label} required={required} className={className}>
      {(a11y) => <Input {...inputProps} {...field} id={a11y.id} error={fieldState.error?.message} />}
    </FormField>
  );
}

export interface NumberFieldProps<T extends FieldValues> extends SharedFieldChrome, InputPassthrough {
  name: FieldPath<T>;
  control: Control<T>;
  min?: number;
  max?: number;
  step?: number;
}

/** Plain numeric input (quantity, %, hours...). Empty string maps to `undefined`, not `NaN`. */
export function NumberField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  className,
  min,
  max,
  step,
  ...inputProps
}: NumberFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  const value = field.value === undefined || field.value === null ? '' : String(field.value);

  return (
    <FormField label={label} required={required} className={className}>
      {(a11y) => (
        <Input
          {...inputProps}
          id={a11y.id}
          error={fieldState.error?.message}
          type="number"
          inputMode="decimal"
          name={field.name}
          ref={field.ref}
          min={min}
          max={max}
          step={step}
          value={value}
          onBlur={field.onBlur}
          onChange={(e) => {
            const raw = e.target.value;
            field.onChange(raw === '' ? undefined : Number(raw));
          }}
        />
      )}
    </FormField>
  );
}

export interface MoneyFieldProps<T extends FieldValues> extends SharedFieldChrome, InputPassthrough {
  name: FieldPath<T>;
  control: Control<T>;
  min?: number;
  max?: number;
  /** Unit shown in the affix box. Default "đ" (VND, D01 — always VAT-inclusive integer đồng). */
  currencyLabel?: string;
}

/** Group digits the Vietnamese way (dot separator) — same formatter the UI kit's `Price` uses. */
function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n));
}

/**
 * VND money input: thousand-separator display, integer value in form state
 * (D01 — no cents, price is already VAT-inclusive). POS, payroll, expenses
 * and pricing screens all use this instead of a bare `NumberField`.
 */
export function MoneyField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  className,
  min = 0,
  max,
  currencyLabel = 'đ',
  ...inputProps
}: MoneyFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  const isEmpty = field.value === undefined || field.value === null || field.value === '';
  const display = isEmpty ? '' : formatVnd(Number(field.value));

  return (
    <FormField label={label} required={required} className={className}>
      {(a11y) => (
        <Input
          {...inputProps}
          id={a11y.id}
          error={fieldState.error?.message}
          inputMode="numeric"
          name={field.name}
          ref={field.ref}
          suffix={currencyLabel}
          value={display}
          onBlur={field.onBlur}
          onChange={(e) => {
            // Strip everything but digits — the display is already formatted,
            // so re-parsing digits on every keystroke keeps the caret sane
            // without a masked-input dependency.
            const digitsOnly = e.target.value.replace(/[^\d]/g, '');
            if (digitsOnly === '') {
              field.onChange(undefined);
              return;
            }
            // Digits-only parsing can never go negative, so `min` only ever
            // matters when it is a positive floor (e.g. a minimum order value).
            let parsed = Number(digitsOnly);
            if (typeof max === 'number') parsed = Math.min(parsed, max);
            if (typeof min === 'number' && min > 0) parsed = Math.max(parsed, min);
            field.onChange(parsed);
          }}
        />
      )}
    </FormField>
  );
}
