/**
 * Switch — on/off toggle that takes effect immediately (not a form field that
 * needs saving; that is a Checkbox).
 *
 * `role="switch"` + `aria-checked` on a real `<button>`: keyboard Space/Enter
 * and focus come from the button element. The knob uses `springBouncy` — the
 * one place besides the heart "pop" where `back`-style overshoot is allowed
 * (design-direction §7).
 */
import { forwardRef, useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { springBouncy } from '../../design-system/motion';

/* `motion.*`, not `m.*`: `<LazyMotion>` is NOT mounted yet (see the note in
 * components/motion/motion-provider.tsx — 79 wave-0 files still use `motion.*`,
 * and `m` without LazyMotion silently never animates). Swap to `m` in the same
 * commit that adds LazyMotion, not before. */

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  /** Required when no visible `label` is given. */
  'aria-label'?: string;
  description?: ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  id?: string;
  name?: string;
  className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    onCheckedChange,
    label,
    description,
    disabled = false,
    size = 'md',
    id,
    name,
    className,
    ...aria
  },
  ref,
) {
  const reactId = useId();
  const switchId = id ?? `sw-${reactId}`;
  const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const travel = size === 'sm' ? 16 : 20;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        ref={ref}
        type="button"
        role="switch"
        id={switchId}
        name={name}
        aria-checked={checked}
        aria-labelledby={label ? `${switchId}-label` : undefined}
        aria-label={aria['aria-label']}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full border border-control-line p-0.5',
          'transition-colors duration-140 ease-out',
          checked ? 'border-brand bg-brand' : 'bg-sunken',
          disabled && 'cursor-not-allowed opacity-50',
          track,
        )}
      >
        <motion.span
          aria-hidden
          className={cn('rounded-full bg-surface shadow-sm', knob)}
          animate={{ x: checked ? travel : 0 }}
          transition={springBouncy}
        />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && (
            <label
              id={`${switchId}-label`}
              htmlFor={switchId}
              className={cn(
                'block text-sm leading-5 text-fg',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <span className="mt-0.5 block text-xs leading-4 text-fg-subtle">{description}</span>
          )}
        </span>
      )}
    </div>
  );
});

export default Switch;
