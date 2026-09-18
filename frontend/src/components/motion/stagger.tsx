import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, fadeUpAdmin, stagger, staggerStep } from '../../design-system/motion';

export interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** 50ms steps + the denser child variant (admin), instead of 40ms. */
  dense?: boolean;
  /** Seconds before the first child starts (drawer items use 0.14). */
  delayChildren?: number;
  /** Run on mount instead of when scrolled into view. */
  onMount?: boolean;
}

/**
 * Stagger container. Children must be `<StaggerItem>`.
 * Keep lists short: only the first viewport of a long list should stagger —
 * hand the rest plain `<StaggerItem animate={false}>`-free markup.
 */
export const Stagger = ({ children, className, dense, delayChildren = 0, onMount }: StaggerProps) => (
  <motion.div
    className={className}
    variants={stagger(dense ? staggerStep.admin : staggerStep.storefront, delayChildren)}
    initial="hidden"
    {...(onMount
      ? { animate: 'show' }
      : { whileInView: 'show', viewport: { once: true, margin: '0px 0px -8% 0px' } })}
  >
    {children}
  </motion.div>
);

export interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  dense?: boolean;
}

export const StaggerItem = ({ children, className, dense }: StaggerItemProps) => (
  <motion.div className={className} variants={dense ? fadeUpAdmin : fadeUp}>
    {children}
  </motion.div>
);

export default Stagger;
