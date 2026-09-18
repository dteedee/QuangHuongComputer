/**
 * Button — the ONE button of the app (W1-12).
 * design-direction.md §5 (variants/sizes/states) + §7 (press = scale .97, 140ms).
 *
 * Path and prop names are kept as-is because 16 wave-0 files already import
 * `components/ui/Button`; the implementation underneath is new (tokens only).
 * `variant="secondary" | "success"` are deprecated aliases, still accepted so
 * those pages compile until their wave-3 track rewrites them.
 */
import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react';
import { Loader2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { buttonVariants, type ButtonVariants } from './variants';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    ButtonVariants {
  /** Swaps the leading icon for a spinner and disables the button. Width is
   *  preserved (§5) because the label stays mounted, only dimmed. */
  loading?: boolean;
  /** One-shot success state: shows a check instead of the icon. */
  success?: boolean;
  icon?: ComponentType<{ className?: string; size?: number | string }>;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
  /** @deprecated no-op, kept so wave-0 call sites still type-check. */
  ripple?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    block,
    loading = false,
    success = false,
    disabled,
    icon: Icon,
    iconPosition = 'left',
    children,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- swallowed on purpose: accepted for wave-0 call sites, never forwarded to the DOM.
    ripple,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const iconSize = size === 'sm' ? 16 : 18;
  /* One glyph slot: spinner > check > the caller's icon. Swapping inside the
   * same slot is what keeps the button from resizing mid-request. */
  const glyph = loading ? (
    <Loader2 size={iconSize} className="animate-spin" aria-hidden />
  ) : success ? (
    <Check size={iconSize} aria-hidden />
  ) : Icon ? (
    <Icon size={iconSize} aria-hidden />
  ) : null;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        buttonVariants({ variant, size, block }),
        'active:scale-[.97] motion-reduce:active:scale-100',
        className,
      )}
      {...props}
    >
      {glyph && iconPosition === 'left' && glyph}
      {children}
      {glyph && iconPosition === 'right' && glyph}
    </button>
  );
});

export default Button;
