import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> {
    children: ReactNode;
    direction?: Direction;
    delay?: number;
    duration?: number;
    distance?: number;
    once?: boolean;
    className?: string;
}

const getInitialPosition = (direction: Direction, distance: number) => {
    switch (direction) {
        case 'up': return { y: distance };
        case 'down': return { y: -distance };
        case 'left': return { x: distance };
        case 'right': return { x: -distance };
        default: return {};
    }
};

export const FadeIn = ({
    children,
    direction = 'up',
    delay = 0,
    duration = 0.5,
    distance = 30,
    once = true,
    className,
    ...props
}: FadeInProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, ...getInitialPosition(direction, distance) }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once, margin: '-50px' }}
            transition={{
                duration,
                delay,
                ease: [0.16, 1, 0.3, 1] // Custom easing
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export const FadeInStagger = ({
    children,
    className,
    staggerDelay = 0.1,
    ...props
}: FadeInProps & { staggerDelay?: number }) => {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: staggerDelay
                    }
                }
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export const FadeInStaggerItem = ({
    children,
    className,
    direction = 'up',
    distance = 20
}: {
    children: ReactNode;
    className?: string;
    direction?: Direction;
    distance?: number;
}) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, ...getInitialPosition(direction, distance) },
                visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: {
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1]
                    }
                }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default FadeIn;
