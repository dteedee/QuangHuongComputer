import type { LabelDataItem } from '../../api/bulk-tools';
import { BarcodeImage } from './barcode-image';

interface LabelRoll40x30Props {
    labels: { item: LabelDataItem; serial?: string }[];
}

/** 40x30mm thermal-roll label, one per physical unit — `@page` matches the roll exactly. */
export function LabelRoll40x30({ labels }: LabelRoll40x30Props) {
    return (
        <div className="print-doc">
            <style>{`
                @media print { @page { size: 40mm 30mm; margin: 0; } }
                .label-roll { width: 40mm; height: 30mm; box-sizing: border-box; page-break-after: always; }
            `}</style>
            {labels.map((entry, idx) => (
                <div key={idx} className="label-roll flex flex-col items-center justify-center gap-0.5 bg-surface p-1 text-center">
                    <div className="line-clamp-2 text-[7px] font-semibold leading-tight">{entry.item.name}</div>
                    <BarcodeImage sku={entry.item.barcodePayload} widthMm={34} heightMm={10} />
                    <div className="text-[6px] num">{entry.item.sku}{entry.serial ? ` · ${entry.serial}` : ''}</div>
                    <div className="text-[8px] font-bold num">{entry.item.price.toLocaleString('vi-VN')}đ</div>
                </div>
            ))}
        </div>
    );
}
