import { useMemo, type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { dur, ease, fadeUp, fadeUpAdmin } from '../../design-system/motion';

export interface FadeInProps {
  children: ReactNode;
  className?: string;
  /** Denser 12px / 480ms variant for admin screens. */
  dense?: boolean;
  /** Animate once when scrolled into view (default) or immediately on mount. */
  onMount?: boolean;
  /** Seconds. Prefer `<Stagger>` over hand-rolled delays. */
  delay?: number;
}

/**
 * Fade + rise. Honours `prefers-reduced-motion` through `<MotionProvider>`
 * (`MotionConfig reducedMotion="user"`), so no per-component check is needed.
 */
export const FadeIn = ({ children, className, dense, onMount, delay }: FadeInProps) => {
  /* `delay` has to go INSIDE the variant: framer-motion uses a variant's own
   * `transition` and ignores the component-level `transition` prop whenever one
   * is present, so passing `transition={{ delay }}` here would do nothing. */
  const variants = useMemo<Variants>(() => {
    const base = dense ? fadeUpAdmin : fadeUp;
    if (!delay) return base;
    return {
      hidden: { opacity: 0, y: dense ? 12 : 16 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: dense ? dur.toast : dur.reveal, ease: ease.expo, delay },
      },
    };
  }, [dense, delay]);

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      {...(onMount
        ? { animate: 'show' }
        : { whileInView: 'show', viewport: { once: true, margin: '0px 0px -8% 0px' } })}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;
