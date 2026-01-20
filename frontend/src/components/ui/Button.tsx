import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';
import { buttonVariants, type ButtonVariants } from '../../design-system/variants';
import { cn } from '../../lib/utils';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
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

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
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
