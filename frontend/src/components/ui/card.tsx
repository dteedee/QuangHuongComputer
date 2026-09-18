/**
 * Card + CardHeader / CardBody / CardFooter — the one surface container.
 * design-direction.md §4: border `--line` + `shadow-xs`; the shadow only grows
 * on hover or when the surface floats, and is never animated.
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { cardVariants, type CardVariants } from './variants';

export interface CardProps extends HTMLAttributes<HTMLDivElement>, CardVariants {
  /** Lifts 3px and darkens the border on hover — pointer devices only (§7). */
  interactive?: boolean;
  children?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, radius, padded, interactive = false, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, radius, padded }),
        interactive &&
          '[@media(hover:hover)]:hover:-translate-y-[3px] [@media(hover:hover)]:hover:border-line-strong ' +
            'transition-transform duration-360 ease-expo motion-reduce:transform-none',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-3 border-b border-line px-4 py-3 lg:px-5',
          className,
        )}
        {...props}
      />
    );
  },
);

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardBody({ className, ...props }, ref) {
    return <div ref={ref} className={cn('px-4 py-4 lg:px-5', className)} {...props} />;
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-end gap-2 border-t border-line px-4 py-3 lg:px-5',
          className,
        )}
        {...props}
      />
    );
  },
);

/** Card title — 16/600, display face, Vietnamese-safe line-height. */
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn('font-display text-base font-semibold leading-6 text-fg', className)}
        {...props}
      />
    );
  },
);
