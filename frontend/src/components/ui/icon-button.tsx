/**
 * IconButton — a button whose only content is an icon.
 * `aria-label` is REQUIRED BY THE TYPE: an icon-only control with no accessible
 * name is invisible to a screen reader, and the audit found dozens of them.
 * design-direction.md §5 (sizes) + §7 (icon press = scale .94).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { iconButtonVariants, type IconButtonVariants } from './variants';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'aria-label'>,
    IconButtonVariants {
  /** Mandatory accessible name — this is the whole point of the component. */
  'aria-label': string;
  children: ReactNode;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className, variant, size, loading = false, disabled, children, type = 'button', ...props },
    ref,
  ) {
    const px = size === 'sm' ? 16 : 18;
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          iconButtonVariants({ variant, size }),
          'active:scale-[.94] motion-reduce:active:scale-100',
          className,
        )}
        {...props}
      >
        {loading ? <Loader2 size={px} className="animate-spin" aria-hidden /> : children}
      </button>
    );
  },
);

export default IconButton;
