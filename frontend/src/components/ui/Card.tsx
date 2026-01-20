import { HTMLAttributes, ReactNode } from 'react';
import { cardVariants, type CardVariants } from '../../design-system/variants';
import { cn } from '../../lib/utils';

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    CardVariants {
  children: ReactNode;
}

export const Card = ({
  className,
  variant,
  padding,
  children,
  ...props
}: CardProps) => {
  return (
    <div
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    >
      {children}
    </div>
  );
};
