/** Countdown to a flash sale's `endAt`, in `Asia/Ho_Chi_Minh` terms (the value is UTC ISO). */
import { useEffect, useState } from 'react';

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

function remainingParts(endAt: string) {
    const ms = new Date(endAt).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const total = Math.floor(ms / 1000);
    return {
        days: Math.floor(total / 86400),
        hours: Math.floor((total % 86400) / 3600),
        minutes: Math.floor((total % 3600) / 60),
        seconds: total % 60,
    };
}

export const FlashSaleCountdown = ({ endAt }: { endAt: string }) => {
    const [parts, setParts] = useState(() => remainingParts(endAt));

    useEffect(() => {
        setParts(remainingParts(endAt));
        const id = window.setInterval(() => setParts(remainingParts(endAt)), 1000);
        return () => window.clearInterval(id);
    }, [endAt]);

    if (!parts) return <span className="text-sm font-semibold">Đã kết thúc</span>;

    const cell = (value: number, label: string) => (
        <span className="flex flex-col items-center">
            <span className="num min-w-[2.2rem] rounded-md bg-white/20 px-1.5 py-1 text-base font-bold tabular-nums">{pad(value)}</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wide text-white/75">{label}</span>
        </span>
    );

    return (
        <div className="flex items-center gap-1.5" aria-label="Thời gian còn lại của chương trình">
            {parts.days > 0 && cell(parts.days, 'ngày')}
            {cell(parts.hours, 'giờ')}
            {cell(parts.minutes, 'phút')}
            {cell(parts.seconds, 'giây')}
        </div>
    );
};

export default FlashSaleCountdown;
