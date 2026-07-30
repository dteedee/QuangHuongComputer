import { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface CheckoutSessionTimerProps {
    /** ISO-8601 hết hạn giữ chỗ. Nếu null, không hiển thị. */
    expiresAt: string | null;
    /** Kích hoạt khi timer hết → nơi gọi nhả tồn / thông báo. */
    onExpired?: () => void;
    /** Bấm gia hạn — nơi gọi tự chặn spam (1 lần). */
    onExtend?: () => void;
    canExtend?: boolean;
}

function formatRemaining(ms: number): string {
    if (ms <= 0) return '00:00';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CheckoutSessionTimer({ expiresAt, onExpired, onExtend, canExtend }: CheckoutSessionTimerProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!expiresAt) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [expiresAt]);

    useEffect(() => {
        if (!expiresAt || !onExpired) return;
        const remaining = new Date(expiresAt).getTime() - now;
        if (remaining <= 0) onExpired();
    }, [expiresAt, now, onExpired]);

    if (!expiresAt) return null;

    const remaining = new Date(expiresAt).getTime() - now;
    const expired = remaining <= 0;
    const warn = remaining < 60_000 && !expired;

    return (
        <div
            className={`mb-6 p-3 rounded-xl border flex items-center justify-between gap-3 ${
                expired
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : warn
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-blue-50 border-blue-100 text-blue-800'
            }`}
        >
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="w-4 h-4" />
                {expired ? (
                    <span>Phiên đã hết hạn — tồn kho đã được nhả.</span>
                ) : (
                    <span>Đang giữ hàng cho bạn: <span className="font-mono">{formatRemaining(remaining)}</span></span>
                )}
            </div>
            {canExtend && !expired && onExtend && (
                <button
                    type="button"
                    onClick={onExtend}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-current hover:bg-current hover:text-white transition-colors inline-flex items-center gap-1"
                >
                    <RefreshCw className="w-3 h-3" /> Gia hạn
                </button>
            )}
        </div>
    );
}

export default CheckoutSessionTimer;
