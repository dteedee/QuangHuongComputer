import { forwardRef, useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { STAGGER_CAP, staggerIndex } from '../../design-system/motion';
import { observeReveal } from './use-reveal-observer';

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger position. Capped at 6 so a long list does not drip in forever. */
  index?: number;
  /** Cap override (product grid uses `i % 4`, see design-direction §7). */
  cap?: number;
  /** Reveal every `[data-reveal]` child together — required for horizontal rails. */
  group?: boolean;
  /** Scroll container; admin passes the `<main id="scroll">` element. */
  root?: Element | null;
  /** Rendered element, default `div`. */
  as?: ElementType;
  style?: CSSProperties;
}

/**
 * CSS-driven scroll reveal (opacity + translateY, see styles/base.css).
 * Registers itself with the shared observer AFTER mount, so nodes rendered
 * later — which is all of them in React — are always observed.
 *
 * ```tsx
 * <Reveal index={i % 4}><ProductCard … /></Reveal>
 * <Reveal group className="flex overflow-x-auto">{chips}</Reveal>
 * ```
 */
export const Reveal = forwardRef<HTMLElement, RevealProps>(function Reveal(
  { children, className, index = 0, cap = STAGGER_CAP, group, root, as, style },
  forwardedRef,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const Tag = (as ?? 'div') as ElementType;

  useEffect(() => observeReveal(localRef.current, { group, root }), [group, root]);

  const setRef = (node: HTMLElement | null) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  return (
    <Tag
      ref={setRef}
      className={className}
      data-reveal=""
      {...(group ? { 'data-reveal-group': '' } : {})}
      style={{ ...style, '--i': staggerIndex(index, cap) } as CSSProperties}
    >
      {children}
    </Tag>
  );
});

export default Reveal;
