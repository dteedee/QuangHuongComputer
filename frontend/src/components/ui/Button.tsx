import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type ComponentType, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  icon?: ComponentType<{ className?: string; size?: number | string }>;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
  ripple?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      success = false,
      disabled,
      icon: Icon,
      iconPosition = 'left',
      children,
      ripple = true,
      ...props
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = useState(false);
    const isDisabled = disabled || loading;

    const variants = {
      primary: 'bg-[#D70018] text-white hover:bg-[#B50014] focus:ring-[#D70018] shadow-md hover:shadow-xl hover:shadow-red-500/25',
      secondary: 'bg-white text-[#D70018] border-2 border-[#D70018] hover:bg-[#D70018] hover:text-white hover:shadow-lg',
      outline: 'bg-transparent text-[#D70018] border-2 border-[#D70018] hover:bg-[#D70018]/10 hover:border-[#B50014]',
      ghost: 'bg-transparent text-[#D70018] hover:bg-[#D70018]/10',
      danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/25',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/25',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-2.5 text-base',
      lg: 'px-8 py-3.5 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 rounded-xl font-bold',
          'transition-all duration-300 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          'active:scale-[0.98]',
          !isDisabled && 'hover:-translate-y-0.5',
          variants[variant],
          sizes[size],
          ripple && 'overflow-hidden',
          isPressed && 'scale-[0.98]',
          className
        )}
        disabled={isDisabled}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        {...props}
      >
        {/* Shine effect overlay */}
        <span className="absolute inset-0 overflow-hidden rounded-xl">
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
        </span>

        {/* Content */}
        <span className="relative flex items-center justify-center gap-2">
          {loading && (
            <Loader2 size={18} className="animate-spin" />
          )}
          {success && !loading && (
            <Check size={18} className="animate-bounce-in text-white" />
          )}
          {!loading && !success && Icon && iconPosition === 'left' && (
            <Icon size={18} className="transition-transform group-hover:scale-110" />
          )}
          <span>{success ? 'Thành công!' : children}</span>
          {!loading && !success && Icon && iconPosition === 'right' && (
            <Icon size={18} className="transition-transform group-hover:translate-x-1" />
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
