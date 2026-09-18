/**
 * EmptyState — "there is nothing here, and here is what you can do about it".
 * design-direction.md §5: dashed `--line-strong` block on `--surface`, `py-14`,
 * 40px muted icon, 16/600 title, muted description, and ALWAYS one primary
 * action ("Xoá lọc", "Thêm mới"). An empty screen with no way out is a dead end.
 */
import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  /** Lucide-shaped icon component. Rendered at 40px, `--fg-subtle`. */
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  description?: ReactNode;
  /** The one thing the user can do. Omit only when there is genuinely nothing. */
  action?: { label: string; onClick: () => void; icon?: EmptyStateProps['icon'] };
  /** Secondary escape hatch, e.g. "Xoá bộ lọc". */
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
  children?: ReactNode;
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong',
      'bg-surface px-6 py-14 text-center',
      className,
    )}
  >
    <Icon size={40} className="text-fg-subtle" aria-hidden />
    <p className="mt-4 font-display text-base font-semibold leading-6 text-fg">{title}</p>
    {description && (
      <p className="mt-1.5 max-w-prose text-sm leading-5 text-fg-muted">{description}</p>
    )}
    {(action || secondaryAction) && (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {action && (
          <Button variant="primary" size="sm" icon={action.icon} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
    {children}
  </div>
);

export default EmptyState;
