/**
 * Select — labelled wrapper around `SearchableSelect`.
 *
 * Keeps the event-shaped `onChange({ target: { value } })` signature because 35
 * wave-0 call sites were written against a native `<select>` and pass the
 * handler straight through. New code should prefer `Combobox`
 * (= `SearchableSelect`), whose `onChange` is just `(value: string) => void`.
 */
import { forwardRef, useId } from 'react';
import { SearchableSelect } from './SearchableSelect';
import { labelClass, errorClass } from './variants';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  id?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string } }) => void;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(function Select(
  {
    className,
    label,
    error,
    options,
    id,
    value,
    defaultValue,
    onChange,
    name,
    disabled,
    placeholder,
  },
  ref,
) {
  const reactId = useId();
  const selectId = id ?? `sel-${reactId}`;

  return (
    <div className="w-full" ref={ref}>
      {label && (
        <label htmlFor={selectId} className={labelClass}>
          {label}
        </label>
      )}

      <SearchableSelect
        id={selectId}
        name={name}
        options={options}
        value={value ?? defaultValue ?? ''}
        onChange={(val) => onChange?.({ target: { value: val } })}
        disabled={disabled}
        error={!!error}
        placeholder={placeholder}
        className={className}
      />

      {error && (
        <p id={`${selectId}-error`} role="alert" className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
