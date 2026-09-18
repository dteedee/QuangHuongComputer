/**
 * ============================================================================
 * MOTION PRESETS — the only durations, easings, springs and variants allowed.
 * Contract: plans/260917-2100-full-system-overhaul/design/design-direction.md §7, §8.
 * Owner: W1-7. Wave-3 pages must import from here; inline `initial={{…}}`
 * blocks (176 of them in 79 files today) are being deleted, not added to.
 *
 * Rules: animate `transform` + `opacity` only. Never `box-shadow`, `width`,
 * `height`, `top/left` or `background-position`.
 * ==========================================================================*/
import type { Transition, Variants } from 'framer-motion';

/** Cubic-bezier tuple, mutable so framer-motion's `Easing` accepts it. */
type Bezier = [number, number, number, number];

/**
 * The eight durations (seconds). Nothing else is allowed.
 * 140 colour/hover/press · 220 fade/scrim/popover · 360 slide/FLIP/layout ·
 * 420 drawer/bulk bar/save bar · 480 admin reveal + toast in ·
 * 560 storefront reveal + image zoom · 760 progress + line-mask ·
 * 1100 chart line draw.
 */
export const dur = {
  fast: 0.14,
  base: 0.22,
  move: 0.36,
  drawer: 0.42,
  toast: 0.48,
  reveal: 0.56,
  progress: 0.76,
  draw: 1.1,
} as const;

/** Four easing curves. `expo` = position/size, `out` = fade/press/tooltip,
 *  `back` = switch + heart pop only, `io` = stroke drawing. */
export const ease = {
  expo: [0.16, 1, 0.3, 1] as Bezier,
  out: [0.22, 1, 0.36, 1] as Bezier,
  back: [0.34, 1.56, 0.64, 1] as Bezier,
  io: [0.65, 0, 0.35, 1] as Bezier,
};

/** Springs — only for user-driven interaction (drag, press, toggle). */
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 };
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 34 };
export const springBouncy: Transition = { type: 'spring', stiffness: 520, damping: 22 };

/** Stagger steps (seconds per element). */
export const staggerStep = { storefront: 0.04, admin: 0.05 } as const;

/** Stagger stops accumulating after 6 elements (design-direction §7). */
export const STAGGER_CAP = 6;
export const staggerIndex = (i: number, cap: number = STAGGER_CAP): number =>
  Math.min(Math.max(i, 0), cap);

/* --------------------------------- variants ------------------------------ */

/** Scroll reveal, storefront: 16px / 560ms. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: dur.reveal, ease: ease.expo } },
};

/** Scroll reveal, admin: denser — 12px / 480ms. */
export const fadeUpAdmin: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: dur.toast, ease: ease.expo } },
};

/** Plain fade, no movement (scrim, popover backdrop). */
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: dur.base, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: dur.fast, ease: ease.out } },
};

/** Container that staggers its children. */
export const stagger = (step: number = staggerStep.storefront, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** Route change: exit up 140ms, enter from below 220ms. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
  exit: { opacity: 0, y: -8, transition: { duration: dur.fast, ease: ease.out } },
};

/** Right-hand drawer (cart). Exit is ~2/3 of enter — the user already decided. */
export const drawerRight: Variants = {
  hidden: { x: '104%' },
  show: { x: 0, transition: { duration: dur.drawer, ease: ease.expo } },
  exit: { x: '104%', transition: { duration: dur.move, ease: ease.expo } },
};

/** Left-hand drawer (mobile menu, admin off-canvas sidebar). */
export const drawerLeft: Variants = {
  hidden: { x: '-104%' },
  show: { x: 0, transition: { duration: dur.drawer, ease: ease.expo } },
  exit: { x: '-104%', transition: { duration: dur.move, ease: ease.expo } },
};

/** Modal panel. Scrim uses `fade`. */
export const modalPanel: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: ease.expo } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: dur.fast, ease: ease.out } },
};

/** Toast: slides in from the right, 480ms. */
export const toastSlide: Variants = {
  hidden: { opacity: 0, x: '120%' },
  show: { opacity: 1, x: 0, transition: { duration: dur.toast, ease: ease.expo } },
  exit: { opacity: 0, x: '120%', transition: { duration: dur.move, ease: ease.expo } },
};

/** Press feedback: buttons .97, icon buttons .94. */
export const press = { whileTap: { scale: 0.97 }, transition: springSnappy } as const;
export const pressIcon = { whileTap: { scale: 0.94 }, transition: springSnappy } as const;

/** Cart badge pop after "add to cart". */
export const cartPop: Variants = {
  pop: { scale: [1, 1.32, 1], transition: { duration: dur.drawer, ease: ease.back } },
};

/** Product card hover (only where `@media (hover:hover)`). */
export const cardHover = {
  whileHover: { y: -3 },
  transition: { duration: dur.move, ease: ease.expo },
} as const;

export const motionPresets = {
  dur, ease, springSoft, springSnappy, springBouncy, staggerStep, staggerIndex,
  fadeUp, fadeUpAdmin, fade, stagger, pageTransition, drawerRight, drawerLeft,
  modalPanel, toastSlide, press, pressIcon, cartPop, cardHover,
} as const;
