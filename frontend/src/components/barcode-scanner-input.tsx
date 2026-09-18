/**
 * Ô quét mã vạch. Máy quét USB gõ ký tự rồi bấm Enter — nên đây là một ô nhập bình thường,
 * bắt phím Enter, chứ không phải bộ đệm phím toàn cục như bản cũ (bản cũ nghe `window` và nuốt
 * cả phím của ô khác, đồng thời tự xoá bộ đệm sau 100ms nên người gõ tay không dùng được).
 */
import { forwardRef, useRef, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { Input } from './ui';

interface BarcodeScannerInputProps {
    onScan: (code: string) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

const BarcodeScannerInput = forwardRef<HTMLInputElement, BarcodeScannerInputProps>(
    function BarcodeScannerInput({ onScan, placeholder = 'Quét mã vạch hoặc nhập SKU', className, autoFocus }, ref) {
        const [value, setValue] = useState('');
        const inner = useRef<HTMLInputElement>(null);

        return (
            <Input
                ref={ref ?? inner}
                className={className}
                icon={ScanBarcode}
                autoFocus={autoFocus}
                aria-label="Quét mã vạch"
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const code = value.trim();
                    if (!code) return;
                    onScan(code);
                    setValue('');
                }}
            />
        );
    }
);

export default BarcodeScannerInput;
