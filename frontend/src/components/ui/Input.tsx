import { type InputHTMLAttributes, forwardRef, type ComponentType } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ComponentType<{ className?: string; size?: number | string }>;
  iconPosition?: 'left' | 'right';
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      icon: Icon,
      iconPosition = 'left',
      suffix,
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
          <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <Icon
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
                hasError ? 'text-red-500' : 'text-gray-300'
              )}
              size={20}
            />
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none',
              hasError
                ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                : 'border-gray-200 focus:border-[#D70018] focus:ring-2 focus:ring-[#D70018]/20',
              Icon && iconPosition === 'left' && 'pl-12',
              Icon && iconPosition === 'right' && 'pr-12',
              className
            )}
            {...props}
          />

          {Icon && iconPosition === 'right' && (
            <Icon
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 transition-colors',
                hasError ? 'text-red-500' : 'text-gray-300'
              )}
              size={20}
            />
          )}

          {suffix && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {suffix}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
