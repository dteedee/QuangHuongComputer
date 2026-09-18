/**
 * Price — the only way to render money in this app.
 *
 * D01 (`decisions/D01-vat-va-gia-ban.md`): every displayed price is an INTEGER
 * number of VND and is already VAT-inclusive. The frontend never computes tax
 * and never renders a fractional đồng. design-direction.md §3: `.price` /
 * `.money` carry `tabular-nums` so money columns stop jittering between pages.
 *
 * `₫` is a separate `<span class="cur">` (0.72em/600, raised) instead of
 * `Intl` currency formatting, because `Intl` emits "27.599.000 ₫" with a
 * non-breaking space and no way to style the symbol.
 */
import { cn } from '../../lib/utils';
import { formatDong } from './kit-utils';

export interface PriceProps {
  /** VND, VAT-inclusive, integer. Nulls render as "Liên hệ". */
  value: number | null | undefined;
  /** Pre-discount price. Rendered struck-through when higher than `value`. */
  compareAt?: number | null;
  /** `admin` uses the denser `.money` face (§3). */
  tone?: 'storefront' | 'admin';
  /** Show `-x%` next to the old price. Percentage is derived, never passed in. */
  showDiscount?: boolean;
  /** Copy for a missing price. */
  emptyLabel?: string;
  className?: string;
}

export const Price = ({
  value,
  compareAt,
  tone = 'storefront',
  showDiscount = true,
  emptyLabel = 'Liên hệ',
  className,
}: PriceProps) => {
  if (value === null || value === undefined) {
    return <span className={cn('text-fg-subtle', className)}>{emptyLabel}</span>;
  }

  const hasOld = typeof compareAt === 'number' && compareAt > value && value > 0;
  const percent = hasOld ? Math.round(((compareAt - value) / compareAt) * 100) : 0;

  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <span className={tone === 'admin' ? 'money font-semibold text-fg' : 'price text-brand-text'}>
        {formatDong(value)}
        <span className="cur">₫</span>
      </span>
      {hasOld && (
        <>
          <span className="price-old text-sm">
            {formatDong(compareAt)}
            <span className="cur">₫</span>
          </span>
          {showDiscount && percent > 0 && (
            <span className="num rounded-sm bg-brand px-1 py-px text-2xs font-semibold text-white">
              -{percent}%
            </span>
          )}
        </>
      )}
    </span>
  );
};

/**
 * Money — a bare amount for table cells and totals. No brand colour, no old
 * price; just `tabular-nums` and the đồng sign.
 */
export const Money = ({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) => {
  if (value === null || value === undefined) return <span className={className}>—</span>;
  return (
    <span className={cn('money', className)}>
      {formatDong(value)}
      <span className="cur">₫</span>
    </span>
  );
};

export default Price;
