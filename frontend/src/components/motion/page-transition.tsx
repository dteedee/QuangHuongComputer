import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageTransition } from '../../design-system/motion';

export interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Route-level transition: out `y:-8` 140ms, in `y:8 → 0` 220ms.
 *
 * The route key goes on THIS element, not inside it — `AnimatePresence` reads
 * the keys of its own direct children, so a key set on some inner node never
 * produces an exit animation:
 *
 * ```tsx
 * <AnimatePresence mode="wait">
 *   <PageTransition key={location.pathname}><Outlet /></PageTransition>
 * </AnimatePresence>
 * ```
 *
 * Do NOT wrap a page in this when only a filter query changed — the grid
 * handles its own skeleton and a full-page fade there just feels slow.
 */
export const PageTransition = ({ children, className }: PageTransitionProps) => (
  <motion.div
    className={className}
    variants={pageTransition}
    initial="hidden"
    animate="show"
    exit="exit"
  >
    {children}
  </motion.div>
);

export default PageTransition;
