import { useEffect, useState } from 'react';
import { labelDataApi } from '../../api/bulk-tools';

interface BarcodeImageProps {
    /** SKU for a Code-128 barcode, mutually exclusive with `serial`. */
    sku?: string;
    /** Serial for a QR code (warranty lookup payload), mutually exclusive with `sku`. */
    serial?: string;
    widthMm?: number;
    heightMm?: number;
    className?: string;
}

/**
 * `GET /inventory/barcode/{sku}` / `.../qrcode/{serial}` require the bearer token, so a plain
 * `<img src>` 404/401s. Fetches through the authenticated client and renders the SVG as an
 * object URL instead. See `docs/api-contracts/inventory-stock.md` §8.
 */
export function BarcodeImage({ sku, serial, widthMm = 30, heightMm = 12, className }: BarcodeImageProps) {
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;
        setFailed(false);
        setUrl(null);
        const run = async () => {
            try {
                objectUrl = sku
                    ? await labelDataApi.fetchBarcodeSvgUrl(sku)
                    : serial
                        ? await labelDataApi.fetchQrCodeSvgUrl(serial)
                        : null;
                if (!cancelled) setUrl(objectUrl);
            } catch {
                if (!cancelled) setFailed(true);
            }
        };
        void run();
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [sku, serial]);

    const style = { width: `${widthMm}mm`, height: `${heightMm}mm` };

    if (failed) {
        return (
            <div style={style} className={`flex items-center justify-center border border-line text-[8px] text-fg-muted ${className ?? ''}`}>
                Lỗi mã
            </div>
        );
    }
    if (!url) {
        return <div style={style} className={`animate-pulse bg-surface-subtle ${className ?? ''}`} />;
    }
    return <img src={url} alt={sku ?? serial ?? 'code'} style={style} className={className} />;
}
