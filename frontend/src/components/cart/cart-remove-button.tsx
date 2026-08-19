import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface CartRemoveButtonProps {
    onConfirm: () => void;
    size?: number;
    className?: string;
}

const CONFIRM_WINDOW_MS = 2500;

/**
 * Nút xoá 2 bước: click 1 → chuyển sang trạng thái "Xoá?" chờ xác nhận (tự huỷ sau 2.5s),
 * click 2 (trong lúc chờ) → xoá thật. Tránh dùng window.confirm (chặn UI, xấu trên mobile)
 * nhưng vẫn ngăn xoá nhầm khi bấm lướt tay.
 */
export function CartRemoveButton({ onConfirm, size = 16, className }: CartRemoveButtonProps) {
    const [confirming, setConfirming] = useState(false);
    const timerRef = useRef<number | undefined>(undefined);

    useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

    const handleClick = () => {
        if (confirming) {
            if (timerRef.current) window.clearTimeout(timerRef.current);
            setConfirming(false);
            onConfirm();
            return;
        }
        setConfirming(true);
        timerRef.current = window.setTimeout(() => setConfirming(false), CONFIRM_WINDOW_MS);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            title={confirming ? 'Bấm lần nữa để xác nhận xoá' : 'Xoá sản phẩm'}
            aria-label={confirming ? 'Xác nhận xoá sản phẩm' : 'Xoá sản phẩm'}
            className={`flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                confirming
                    ? 'bg-red-500 text-white px-2 py-1.5 text-[11px] font-bold'
                    : 'p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50'
            } ${className ?? ''}`}
        >
            {confirming ? 'Xoá?' : <Trash2 size={size} />}
        </button>
    );
}

export default CartRemoveButton;
