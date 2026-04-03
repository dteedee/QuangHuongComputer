import { forwardRef } from 'react';
import { SearchableSelect } from './SearchableSelect';

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

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ className, label, error, options, id, value, defaultValue, onChange, name, disabled, placeholder, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;

    return (
      <div className="space-y-2" ref={ref}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-gray-700">
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
          error={hasError}
          placeholder={placeholder}
          className={className}
        />

        {error && (
          <p
            id={`${selectId}-error`}
            className="text-danger-500 text-xs font-bold ml-1"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
