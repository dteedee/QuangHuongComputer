/** Countdown cells for a flash sale's `endAt`, drawn on the brand/ink panel (white text). */
import { pad2, useCountdown } from '../promotions/use-countdown';

export const FlashSaleCountdown = ({ endAt }: { endAt: string }) => {
    const { parts } = useCountdown(endAt);

    if (!parts) return <span className="text-sm font-semibold">Đã kết thúc</span>;

    const cell = (value: number, label: string) => (
        <span className="flex flex-col items-center">
            <span className="num min-w-[2.2rem] rounded-md bg-white/20 px-1.5 py-1 text-base font-bold tabular-nums">{pad2(value)}</span>
            <span className="mt-0.5 text-2xs uppercase tracking-wide text-white/75">{label}</span>
        </span>
    );

    return (
        <div className="flex items-center gap-1.5" role="timer" aria-label="Thời gian còn lại của chương trình">
            {parts.days > 0 && cell(parts.days, 'ngày')}
            {cell(parts.hours, 'giờ')}
            {cell(parts.minutes, 'phút')}
            {cell(parts.seconds, 'giây')}
        </div>
    );
};

export default FlashSaleCountdown;
