import { SelectHTMLAttributes, forwardRef } from 'react';
import { inputVariants, labelVariants } from '../../design-system/variants';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={selectId} className={cn(labelVariants())}>
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={cn(
            inputVariants({ state: hasError ? 'error' : 'default' }),
            'appearance-none bg-[url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E\')] bg-[length:20px] bg-[right_1.25rem_center] bg-no-repeat',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${selectId}-error` : undefined}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

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
