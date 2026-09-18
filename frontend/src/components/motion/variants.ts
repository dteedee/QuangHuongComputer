import type { Variants } from 'framer-motion';

/**
 * @deprecated Pre-design-system variants. Use `@/design-system/motion`
 * (`fadeUp`, `drawerRight`, `press`, …) whose values come from
 * design-direction.md §7/§8. Kept because ~12 wave-0 pages still import
 * `fadeUp`/`motionSafe` from here; wave 3 removes the last call sites.
 *
 * Note the key difference: presets use `hidden`/`show`, these use
 * `hidden`/`visible` — do not mix the two in one component.
 */

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: 'easeOut' },
    },
};

export const scaleHover: Variants = {
    rest: { scale: 1 },
    hover: {
        scale: 1.02,
        transition: { duration: 0.15, ease: 'easeOut' },
    },
};

export const slideRight: Variants = {
    hidden: { x: '100%' },
    visible: {
        x: 0,
        transition: { duration: 0.25, ease: 'easeOut' },
    },
};

/**
 * Trả về variant rỗng khi user bật `prefers-reduced-motion`.
 * Dùng cùng `useReducedMotion()` của framer-motion.
 *
 * Ví dụ:
 *   const reduced = useReducedMotion();
 *   <motion.div variants={motionSafe(fadeUp, reduced)} ... />
 */
export const motionSafe = (
    variants: Variants,
    prefersReduced: boolean | null,
): Variants => (prefersReduced ? {} : variants);

// Re-export để nơi dùng chỉ cần import 1 chỗ.
export { useReducedMotion } from 'framer-motion';
