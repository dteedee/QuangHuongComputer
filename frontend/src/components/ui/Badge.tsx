/**
 * Badge — small semantic label. design-direction.md §5.
 * Kept at this path (PascalCase) because wave-0 files import it here.
 * Colour is never the only channel: `dot` adds a shape, the text carries the
 * meaning.
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { badgeVariants, type BadgeVariants } from './variants';

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'>,
    BadgeVariants {
  /** 6px status dot in `currentColor` (§5, status badges). */
  dot?: boolean;
  children: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, dot = false, children, ...props },
  ref,
) {
  return (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {children}
    </span>
  );
});

export default Badge;
