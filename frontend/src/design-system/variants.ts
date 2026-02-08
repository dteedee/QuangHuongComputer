import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-[#D70018] text-white hover:bg-[#B50014] focus:ring-[#D70018] shadow-md hover:shadow-lg',
        secondary: 'bg-white text-[#D70018] border-2 border-[#D70018] hover:bg-[#D70018] hover:text-white',
        outline: 'bg-transparent text-[#D70018] border-2 border-[#D70018] hover:bg-[#D70018]/10',
        ghost: 'bg-transparent text-[#D70018] hover:bg-[#D70018]/10',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        success: 'bg-green-600 text-white hover:bg-green-700',
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
  'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-gray-200 focus:border-[#D70018] focus:ring-[#D70018]/20',
        error: 'border-red-500 focus:border-red-600 focus:ring-red-500/20',
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
