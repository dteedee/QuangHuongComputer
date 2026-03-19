import { type InputHTMLAttributes, forwardRef, type ComponentType, useState } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ComponentType<{ className?: string; size?: number | string }>;
  iconPosition?: 'left' | 'right';
  suffix?: React.ReactNode;
  hint?: string;
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
      hint,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-[11px] font-black uppercase tracking-widest px-1 transition-colors duration-200",
              isFocused ? 'text-[#D70018]' : 'text-gray-400',
              hasError && 'text-red-500'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative group">
          {/* Animated border glow on focus */}
          <div className={cn(
            "absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#D70018] to-[#ff4d6d] opacity-0 blur transition-all duration-300",
            isFocused && !hasError && "opacity-30",
            hasError && "opacity-30 from-red-500 to-red-400"
          )} />

          <div className="relative">
            {Icon && iconPosition === 'left' && (
              <Icon
                className={cn(
                  'absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-200',
                  hasError ? 'text-red-500' : isFocused ? 'text-[#D70018] scale-110' : 'text-gray-300',
                )}
                size={20}
              />
            )}

            <input
              ref={ref}
              id={inputId}
              className={cn(
                'relative w-full px-4 py-3.5 rounded-xl border-2 bg-white',
                'transition-all duration-300 ease-out',
                'focus:outline-none',
                'text-gray-900 placeholder:text-gray-400 placeholder:transition-opacity placeholder:duration-200',
                'focus:placeholder:opacity-50',
                hasError
                  ? 'border-red-400 focus:border-red-500 bg-red-50/50'
                  : 'border-gray-200 focus:border-[#D70018] hover:border-gray-300',
                Icon && iconPosition === 'left' && 'pl-12',
                (Icon && iconPosition === 'right') || suffix ? 'pr-12' : '',
                className
              )}
              onFocus={(e) => {
                setIsFocused(true);
                props.onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                props.onBlur?.(e);
              }}
              {...props}
            />

            {Icon && iconPosition === 'right' && !suffix && (
              <Icon
                className={cn(
                  'absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-200',
                  hasError ? 'text-red-500' : isFocused ? 'text-[#D70018]' : 'text-gray-300'
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
        </div>

        {/* Error message with animation */}
        {error && (
          <div className="flex items-center gap-2 animate-fade-in-up">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p className="text-xs text-gray-400 px-1">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
