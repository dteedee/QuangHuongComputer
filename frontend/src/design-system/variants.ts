import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-dark focus:ring-brand shadow-md hover:shadow-lg',
        secondary: 'bg-white text-brand border-2 border-brand hover:bg-brand hover:text-white',
        outline: 'bg-transparent text-brand border-2 border-brand hover:bg-brand-light',
        ghost: 'bg-transparent text-brand hover:bg-brand-light',
        // Danger uses burnt-orange to remain visually distinct from brand red
        danger: 'bg-danger text-white hover:bg-danger-700',
        success: 'bg-success text-white hover:bg-success-700',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-2.5 text-base',
        lg: 'px-8 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export const inputVariants = cva(
  'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-gray-900 placeholder:text-gray-400',
  {
    variants: {
      variant: {
        default: 'border-gray-200 focus:border-brand focus:ring-brand/20',
        error: 'border-danger focus:border-danger-700 focus:ring-danger/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export const labelVariants = cva(
  'block text-sm font-semibold text-gray-700'
);

export const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-700',
        primary: 'bg-brand-light text-brand',
        success: 'bg-success-100 text-success-700',
        warning: 'bg-warning-100 text-warning-700',
        danger: 'bg-danger-100 text-danger-700',
        info: 'bg-blue-100 text-blue-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

export const cardVariants = cva(
  'rounded-2xl overflow-hidden transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white border border-gray-200 shadow-sm',
        elevated: 'bg-white shadow-lg',
        outlined: 'bg-white border-2 border-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
