import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            duration: 0.2,
        },
    },
};

export const PageTransition = ({ children, className }: PageTransitionProps) => {
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Scale in transition
export const ScaleTransition = ({ children, className }: PageTransitionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Slide in transition
export const SlideTransition = ({
    children,
    className,
    direction = 'right'
}: PageTransitionProps & { direction?: 'left' | 'right' | 'up' | 'down' }) => {
    const directionOffset = {
        left: { x: -30, y: 0 },
        right: { x: 30, y: 0 },
        up: { x: 0, y: -30 },
        down: { x: 0, y: 30 },
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...directionOffset[direction] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...directionOffset[direction] }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
