import { HTMLAttributes, ReactNode } from 'react';
import { badgeVariants, type BadgeVariants } from '../../design-system/variants';
import { cn } from '../../lib/utils';

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    BadgeVariants {
  children: ReactNode;
}

export const Badge = ({
  className,
  variant,
  size,
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </span>
  );
};
