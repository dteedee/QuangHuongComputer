import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dur, ease } from '../../design-system/motion';

export interface CollapseProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  /** Element id so the trigger can point `aria-controls` at it. */
  id?: string;
}

/**
 * Accordion / filter-group collapse, 360ms expo.
 *
 * This is the ONE place height is animated (design-direction §7 bans it for
 * hover/scroll effects). It is a discrete, user-initiated action on a small
 * subtree, and the alternatives (scaleY, clip-path) distort the content.
 */
export const Collapse = ({ open, children, className, id }: CollapseProps) => (
  <AnimatePresence initial={false}>
    {open && (
      <motion.div
        id={id}
        className={className}
        style={{ overflow: 'hidden' }}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: dur.move, ease: ease.expo }}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

export default Collapse;
