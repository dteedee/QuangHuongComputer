/**
 * Shared scroll-reveal observer.
 *
 * THE BUG THIS EXISTS TO PREVENT (design-direction.md §7 "Nội dung động"):
 * a `document.querySelectorAll('[data-reveal]')` sweep that runs once on mount
 * never sees nodes React inserts afterwards, so every dynamically rendered card
 * stays at `opacity: 0` FOREVER (measured in the prototype: the category rail,
 * the product grid and the mega-menu rail were all invisible).
 *
 * Fix, in three rules:
 *  1. each element registers ITSELF from its own effect, after it is in the DOM;
 *  2. a horizontal rail parked off-screen never intersects — mark it a group and
 *     reveal all of its children together (stagger preserved);
 *  3. when a custom `root` is used (admin scrolls in <main id="scroll">, not on
 *     body), an element outside that root can never intersect → reveal at once.
 */

export interface RevealOptions {
  /** Reveal every `[data-reveal]` descendant when this element appears. */
  group?: boolean;
  /** Scroll container. Admin passes `#scroll`; storefront leaves it undefined. */
  root?: Element | null;
}

const REVEALED = 'in';
const observers = new Map<Element | null, IntersectionObserver>();
const groups = new WeakSet<Element>();

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealNow = (el: Element): void => {
  el.classList.add(REVEALED);
};

const revealGroup = (root: Element, io: IntersectionObserver): void => {
  root.querySelectorAll('[data-reveal]').forEach((child) => {
    io.unobserve(child);
    revealNow(child);
  });
};

const getObserver = (root: Element | null): IntersectionObserver => {
  const existing = observers.get(root);
  if (existing) return existing;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        revealNow(entry.target);
        if (groups.has(entry.target)) revealGroup(entry.target, io);
      });
    },
    // reveal slightly before the element is fully in view; never re-hide
    { root: root ?? null, rootMargin: '0px 0px -8% 0px' },
  );
  observers.set(root, io);
  return io;
};

/**
 * Observe one element. Returns the cleanup function for the calling effect.
 * Safe to call during SSR/tests: falls back to revealing immediately.
 */
export const observeReveal = (el: Element | null, options: RevealOptions = {}): (() => void) => {
  if (!el) return () => undefined;

  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
    revealNow(el);
    if (options.group) el.querySelectorAll('[data-reveal]').forEach(revealNow);
    return () => undefined;
  }

  const root = options.root ?? null;
  // Rule 3: an element the root cannot contain would never intersect.
  if (root && !root.contains(el)) {
    revealNow(el);
    if (options.group) el.querySelectorAll('[data-reveal]').forEach(revealNow);
    return () => undefined;
  }

  const io = getObserver(root);
  if (options.group) groups.add(el);
  io.observe(el);

  return () => {
    io.unobserve(el);
    groups.delete(el);
  };
};
