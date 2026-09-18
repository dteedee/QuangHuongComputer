/**
 * StatCard — one KPI tile. design-direction.md §6 (admin dashboard KPI grid).
 *
 * Three rules the audit forced into the type:
 *  - a KPI has a trend direction AND a word, never a bare colour;
 *  - `value` may be `null`, which renders "—", not `0`. A failed request must
 *    never be indistinguishable from a real zero (see also QueryBoundary);
 *  - the count-up ticker is opt-in and never used for money (§7).
 */
import type { ComponentType, ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './card';
import { AnimatedNumber } from '../motion/animated-number';

export interface StatCardProps {
  label: string;
  /** `null` renders "—". Pass a string for pre-formatted values (money, dates). */
  value: number | string | null | undefined;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  /** Percentage change vs the previous period. */
  delta?: { value: number; label: string } | null;
  /** Small caption under the value, e.g. "so với tháng trước". */
  hint?: ReactNode;
  /** Count-up animation. KPI counts only — never a price (§7). */
  animate?: boolean;
  className?: string;
}

const viFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export const StatCard = ({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  animate = false,
  className,
}: StatCardProps) => {
  const missing = value === null || value === undefined;
  const dir = delta ? (delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat') : null;
  const DirIcon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;

  return (
    <Card className={cn('p-4 lg:p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase leading-4 tracking-[.02em] text-fg-subtle">
          {label}
        </p>
        {Icon && <Icon size={18} className="shrink-0 text-fg-subtle" aria-hidden />}
      </div>

      <p className="mt-2 font-display text-2xl font-semibold leading-8 tracking-tight text-fg">
        {missing ? (
          <span className="text-fg-subtle">—</span>
        ) : typeof value === 'number' && animate ? (
          <AnimatedNumber value={value} />
        ) : (
          <span className="num">
            {typeof value === 'number' ? viFormat.format(value) : value}
          </span>
        )}
      </p>

      {delta && dir && (
        <p
          className={cn(
            'mt-1.5 flex items-center gap-1 text-xs leading-4 font-medium',
            dir === 'up' && 'text-success',
            dir === 'down' && 'text-danger',
            dir === 'flat' && 'text-fg-subtle',
          )}
        >
          <DirIcon size={14} aria-hidden />
          <span className="num">
            {delta.value > 0 ? '+' : ''}
            {delta.value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
          </span>
          <span className="text-fg-subtle">{delta.label}</span>
        </p>
      )}
      {hint && <p className="mt-1.5 text-xs leading-4 text-fg-subtle">{hint}</p>}
    </Card>
  );
};

export default StatCard;
