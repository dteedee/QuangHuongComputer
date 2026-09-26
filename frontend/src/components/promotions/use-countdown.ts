/**
 * One ticking countdown for every promotion surface (homepage flash-sale panel, `/flash-sale`,
 * coupon cards on `/khuyen-mai`). `endAt` is a UTC ISO string from the API; the remaining time is
 * zone-independent, so no Asia/Ho_Chi_Minh conversion is needed for the arithmetic.
 */
import { useEffect, useState } from 'react';

export interface CountdownParts {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

/** null once `endAt` has passed (or is unparseable). */
export function remainingParts(endAt: string, now = Date.now()): CountdownParts | null {
    const ms = new Date(endAt).getTime() - now;
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const total = Math.floor(ms / 1000);
    return {
        days: Math.floor(total / 86400),
        hours: Math.floor((total % 86400) / 3600),
        minutes: Math.floor((total % 3600) / 60),
        seconds: total % 60,
    };
}

export const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, '0');

/** "2 ngày 03:04:05" / "03:04:05" — for inline text (coupon cards). */
export function formatCountdown(parts: CountdownParts): string {
    const clock = `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;
    return parts.days > 0 ? `${parts.days} ngày ${clock}` : clock;
}

/**
 * `{ parts, ended }`, re-evaluated every second. No `endAt` (open-ended promotion) -> no timer,
 * `parts` null and `ended` false: the caller shows "không giới hạn thời gian", not "đã kết thúc".
 */
export function useCountdown(endAt: string | null | undefined) {
    const [parts, setParts] = useState(() => (endAt ? remainingParts(endAt) : null));

    useEffect(() => {
        if (!endAt) {
            setParts(null);
            return;
        }
        setParts(remainingParts(endAt));
        const id = window.setInterval(() => {
            const next = remainingParts(endAt);
            setParts(next);
            if (!next) window.clearInterval(id);
        }, 1000);
        return () => window.clearInterval(id);
    }, [endAt]);

    return { parts, ended: !!endAt && parts === null };
}
