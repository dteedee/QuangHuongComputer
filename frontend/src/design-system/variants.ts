import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button Variants
 */
export const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest rounded-2xl transition-all focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-500 hover:bg-primary-600 text-white shadow-xl shadow-primary-500/20 focus:ring-primary-500/20',
        secondary:
          'bg-gray-200 hover:bg-gray-300 text-gray-900 shadow-sm focus:ring-gray-500/20',
        outline:
          'border-2 border-gray-300 hover:border-primary-500 hover:text-primary-500 text-gray-700 bg-white focus:ring-primary-500/20',
        danger:
          'bg-danger-500 hover:bg-danger-600 text-white shadow-xl shadow-danger-500/20 focus:ring-danger-500/20',
        ghost:
          'hover:bg-gray-100 text-gray-700 focus:ring-gray-500/10',
        brand:
          'bg-[#D70018] hover:bg-[#b50014] text-white shadow-xl shadow-red-500/20 focus:ring-red-500/20',
      },
      size: {
        sm: 'px-4 py-2 text-[10px]',
        md: 'px-6 py-3 text-[11px]',
        lg: 'px-8 py-4 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

/**
 * Input Variants
 */
export const inputVariants = cva(
  // Base styles
  'w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold transition-all focus:outline-none focus:ring-4',
  {
    variants: {
      state: {
        default:
          'focus:ring-primary-500/10 focus:border-primary-100',
        error:
          'border-danger-500 focus:ring-danger-500/10 focus:border-danger-500',
        success:
          'border-success-500 focus:ring-success-500/10 focus:border-success-500',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export type InputVariants = VariantProps<typeof inputVariants>;

/**
 * Badge Variants
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1 font-black uppercase tracking-widest rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-500',
        primary: 'bg-primary-50 text-primary-600',
        success: 'bg-success-50 text-success-600',
        warning: 'bg-warning-50 text-warning-600',
        danger: 'bg-danger-50 text-danger-600',
        brand: 'bg-[#FFEDED] text-[#D70018]',
      },
      size: {
        sm: 'px-2 py-0.5 text-[9px]',
        md: 'px-2.5 py-1 text-[10px]',
        lg: 'px-3 py-1.5 text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

/**
 * Card Variants
 */
export const cardVariants = cva(
  'bg-white rounded-2xl transition-all',
  {
    variants: {
      variant: {
        default:
          'border border-gray-100 shadow-sm shadow-gray-200/50',
        premium:
          'border border-gray-100 shadow-sm shadow-gray-200/50 hover:shadow-lg hover:-translate-y-1 hover:border-gray-200',
        flat: 'border border-gray-50',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export type CardVariants = VariantProps<typeof cardVariants>;

/**
 * Label Variants
 */
export const labelVariants = cva(
  'font-black uppercase tracking-widest ml-1',
  {
    variants: {
      size: {
        sm: 'text-[9px]',
        md: 'text-[10px]',
        lg: 'text-[11px]',
      },
      color: {
        default: 'text-gray-400',
        muted: 'text-gray-500',
        dark: 'text-gray-700',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'default',
    },
  }
);

export type LabelVariants = VariantProps<typeof labelVariants>;
