import { ButtonHTMLAttributes, forwardRef, ReactNode, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ComponentType<{ className?: string; size?: number }>;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon: Icon,
      iconPosition = 'left',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const variants = {
      primary: 'bg-[#D70018] text-white hover:bg-[#B50014] focus:ring-[#D70018] shadow-md hover:shadow-lg',
      secondary: 'bg-white text-[#D70018] border-2 border-[#D70018] hover:bg-[#D70018] hover:text-white',
      outline: 'bg-transparent text-[#D70018] border-2 border-[#D70018] hover:bg-[#D70018]/10',
      ghost: 'bg-transparent text-[#D70018] hover:bg-[#D70018]/10',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      success: 'bg-green-600 text-white hover:bg-green-700',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-2.5 text-base',
      lg: 'px-8 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {!loading && Icon && iconPosition === 'left' && <Icon size={18} />}
        {children}
        {!loading && Icon && iconPosition === 'right' && <Icon size={18} />}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
