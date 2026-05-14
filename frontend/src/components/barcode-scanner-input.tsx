import { useRef, useEffect } from 'react';

interface BarcodeScannerInputProps {
    onScan: (code: string) => void;
    placeholder?: string;
    className?: string;
}

export default function BarcodeScannerInput({
    onScan,
    placeholder = 'Quét barcode...',
    className = '',
}: BarcodeScannerInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const bufferRef = useRef('');
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement !== inputRef.current) return;
            if (e.key === 'Enter' && bufferRef.current.length > 3) {
                onScan(bufferRef.current);
                bufferRef.current = '';
                if (inputRef.current) inputRef.current.value = '';
                return;
            }
            if (e.key.length === 1) {
                bufferRef.current += e.key;
                clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    bufferRef.current = '';
                }, 100);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onScan]);

    return (
        <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${className}`}
            onChange={e => { bufferRef.current = e.target.value; }}
        />
    );
}
