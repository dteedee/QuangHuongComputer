/**
 * Skeleton — `.sk` shimmer from styles/base.css (transform-only, 1.4s linear,
 * disabled under reduced motion). design-direction.md §5.
 *
 * A skeleton must match the real frame it replaces, or it trades a spinner for
 * layout shift: a product-card skeleton has all 7 tiers, a table skeleton has
 * the real number of columns. The 420ms anti-flash floor lives in
 * `use-skeleton-floor.ts`.
 */
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Tailwind rounding override; defaults to the 8px skeleton radius (§4). */
  rounded?: string;
}

export const Skeleton = ({ className, rounded, ...props }: SkeletonProps) => (
  <div aria-hidden className={cn('sk', rounded ?? 'rounded-md', className)} {...props} />
);

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  /** Last line is shorter, like real text. */
  lastLineWidth?: string;
}

export const SkeletonText = ({
  lines = 3,
  className,
  lastLineWidth = 'w-2/3',
}: SkeletonTextProps) => (
  <div className={cn('space-y-2', className)} aria-hidden>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        className={cn('h-4', i === lines - 1 && lines > 1 ? lastLineWidth : 'w-full')}
      />
    ))}
  </div>
);

/** Circle skeleton for avatars. */
export const SkeletonCircle = ({ className, ...props }: SkeletonProps) => (
  <Skeleton rounded="rounded-full" className={cn('h-10 w-10', className)} {...props} />
);

export default Skeleton;
