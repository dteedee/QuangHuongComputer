import type { Variants } from 'framer-motion';

/**
 * Bộ 3 variant chuẩn hoá cho toàn app.
 * Thời lượng 150-300ms để tôn trọng tinh thần "hiệu ứng có chừng mực".
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
