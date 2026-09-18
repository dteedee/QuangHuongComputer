/**
 * Flash-sale countdown. Rendered only when an active sale really carries an end
 * time for this product (`GET /api/content/promotions/active` → `endAt`), and
 * it removes itself the moment the window closes — no ticker over a sale that
 * has already ended.
 */
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface ProductFlashCountdownProps {
    /** ISO-8601 end of the sale window. */
    endAt?: string | null;
}

function remainingMs(endAt: string): number {
    const end = new Date(endAt).getTime();
    if (Number.isNaN(end)) return 0;
    return Math.max(0, end - Date.now());
}

function format(ms: number): string {
    const total = Math.floor(ms / 1000);
    const days = Math.floor(total / 86400);
    const h = String(Math.floor((total % 86400) / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return days > 0 ? `${days} ngày ${h}:${m}:${s}` : `${h}:${m}:${s}`;
}

export default function ProductFlashCountdown({ endAt }: ProductFlashCountdownProps) {
    const [left, setLeft] = useState(() => (endAt ? remainingMs(endAt) : 0));

    useEffect(() => {
        if (!endAt) return;
        setLeft(remainingMs(endAt));
        const id = window.setInterval(() => setLeft(remainingMs(endAt)), 1000);
        return () => window.clearInterval(id);
    }, [endAt]);

    if (!endAt || left <= 0) return null;

    return (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-text">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            Kết thúc sau <span className="num tabular-nums">{format(left)}</span>
        </p>
    );
}
