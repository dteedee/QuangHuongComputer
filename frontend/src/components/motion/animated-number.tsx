import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { ease } from '../../design-system/motion';

export interface AnimatedNumberProps {
  value: number;
  className?: string;
  /** Defaults to vi-VN grouping with no decimals. */
  format?: (value: number) => string;
  /** Rendered before/after the number, e.g. `₫` or `%`. */
  suffix?: string;
}

const viFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** 900ms is the ticker's own duration (design-direction §7). */
const TICKER_SECONDS = 0.9;

/**
 * KPI ticker. **Dashboard numbers only** — never prices: a price that counts up
 * while the customer reads it is unreadable and looks like a trick.
 * Falls back to the plain value when the OS asks for reduced motion.
 */
export const AnimatedNumber = ({ value, className, format, suffix }: AnimatedNumberProps) => {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: TICKER_SECONDS,
      ease: ease.expo,
      onUpdate: (v) => setShown(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduced]);

  const text = (format ?? ((n: number) => viFormat.format(Math.round(n))))(shown);

  return (
    <span className={['num', className].filter(Boolean).join(' ')}>
      {text}
      {suffix ? <span className="cur">{suffix}</span> : null}
    </span>
  );
};

export default AnimatedNumber;
