import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { springSnappy } from '../../design-system/motion';

type MotionDivProps = ComponentPropsWithoutRef<typeof motion.div>;

export interface PressableProps extends Omit<MotionDivProps, 'children'> {
  children: ReactNode;
  /** Icon buttons press deeper (.94) than text buttons (.97). */
  icon?: boolean;
  /** Lift on hover — only where a real pointer exists. */
  lift?: boolean;
  disabled?: boolean;
}

/**
 * Press feedback wrapper: `scale(.97)` (buttons) / `.94` (icon buttons) on a
 * snappy spring. Wrap non-button things that must feel tappable; the UI kit's
 * `<Button>` already has this built in.
 */
export const Pressable = forwardRef<HTMLDivElement, PressableProps>(function Pressable(
  { children, icon, lift, disabled, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      whileTap={disabled ? undefined : { scale: icon ? 0.94 : 0.97 }}
      whileHover={disabled || !lift ? undefined : { y: -3 }}
      transition={springSnappy}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

export default Pressable;
