import { InputHTMLAttributes, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { inputVariants, labelVariants } from '../../design-system/variants';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      icon: Icon,
      iconPosition = 'left',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className={cn(labelVariants())}>
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <Icon
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
                hasError ? 'text-danger-500' : 'text-gray-300'
              )}
              size={20}
            />
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ state: hasError ? 'error' : 'default' }),
              Icon && iconPosition === 'left' && 'pl-12',
              Icon && iconPosition === 'right' && 'pr-12',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            {...props}
          />

          {Icon && iconPosition === 'right' && (
            <Icon
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 transition-colors',
                hasError ? 'text-danger-500' : 'text-gray-300'
              )}
              size={20}
            />
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
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

Input.displayName = 'Input';
