import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

export interface MotionProviderProps {
  children: ReactNode;
}

/**
 * Wraps the whole app exactly once (src/main.tsx, owned by W1-13):
 *
 * ```tsx
 * <MotionProvider><App /></MotionProvider>
 * ```
 *
 * `reducedMotion="user"` makes every framer-motion animation in the tree obey
 * the OS setting — transform/opacity animations are dropped, layout is kept.
 * The CSS half of the same promise lives in styles/base.css.
 *
 * NOT wrapped in `<LazyMotion features={domAnimation} strict>` yet, although
 * design-direction §8 asks for it: 79 files still render `motion.*` directly and
 * `strict` throws on those, while non-strict LazyMotion would leave them at
 * their `initial` styles — i.e. an invisible page. Switch to LazyMotion + `m.*`
 * (~25KB saved) once wave 3 has migrated those files; tracked as w1-7 IR #5.
 */
export const MotionProvider = ({ children }: MotionProviderProps) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);

export default MotionProvider;
