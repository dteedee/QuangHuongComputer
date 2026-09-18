/**
 * Motion primitives. Presets (durations, easings, springs, variants) live in
 * `@/design-system/motion`; this barrel exports the React components.
 */
export { MotionProvider } from './motion-provider';
export { Reveal } from './reveal';
export { observeReveal, type RevealOptions } from './use-reveal-observer';
export { FadeIn } from './fade-in';
export { Stagger, StaggerItem } from './stagger';
export { PageTransition } from './page-transition';
export { Pressable } from './pressable';
export { Collapse } from './collapse';
export { AnimatedNumber } from './animated-number';

/** @deprecated Pre-design-system section wrapper — use `<FadeIn>`. Still
 *  imported by ~10 wave-0 pages; wave 3 removes the last call sites. */
export { AnimatedSection } from './animated-section';
