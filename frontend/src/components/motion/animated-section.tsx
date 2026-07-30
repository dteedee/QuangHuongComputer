import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, motionSafe } from './variants';

interface AnimatedSectionProps {
    children: ReactNode;
    className?: string;
    /** Cho phép chậm/nhanh so với mặc định (delay giây). */
    delay?: number;
    /** Chỉ chạy 1 lần khi section vào viewport (mặc định true). */
    once?: boolean;
}

/**
 * Wrapper section fade-up khi scroll vào viewport.
 * Tôn trọng `prefers-reduced-motion` — trả về block tĩnh nếu user tắt motion.
 */
export const AnimatedSection = ({
    children,
    className,
    delay = 0,
    once = true,
}: AnimatedSectionProps) => {
    const prefersReduced = useReducedMotion();
    const variants = motionSafe(fadeUp, prefersReduced);

    return (
        <motion.section
            className={className}
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once, margin: '0px 0px -100px 0px' }}
            transition={delay ? { delay } : undefined}
        >
            {children}
        </motion.section>
    );
};

export default AnimatedSection;
