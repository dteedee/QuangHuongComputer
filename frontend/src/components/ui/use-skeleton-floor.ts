/**
 * useSkeletonFloor — holds a skeleton on screen for at least 420ms so a fast
 * response does not produce a flash of shimmer (design-direction §5).
 *
 * Returns `false` immediately when the user asked for reduced motion: they
 * want the result, not the choreography.
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const MIN_VISIBLE_MS = 420;

export function useSkeletonFloor(loading: boolean): boolean {
  const reduced = useReducedMotion();
  const [held, setHeld] = useState(loading);
  const startedAt = useRef<number>(loading ? Date.now() : 0);

  useEffect(() => {
    if (loading) {
      startedAt.current = Date.now();
      setHeld(true);
      return;
    }
    if (reduced) {
      setHeld(false);
      return;
    }
    const elapsed = Date.now() - startedAt.current;
    if (elapsed >= MIN_VISIBLE_MS) {
      setHeld(false);
      return;
    }
    const t = window.setTimeout(() => setHeld(false), MIN_VISIBLE_MS - elapsed);
    return () => window.clearTimeout(t);
  }, [loading, reduced]);

  return held;
}
