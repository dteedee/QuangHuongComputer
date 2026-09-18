import type { LabelDataItem } from '../../api/bulk-tools';
import { BarcodeImage } from './barcode-image';

interface LabelSheetA4Props {
    /** One entry per physical label — a serial-tracked SKU repeats once per serial. */
    labels: { item: LabelDataItem; serial?: string }[];
}

const COLS = 3;
const ROWS = 8;
const PER_PAGE = COLS * ROWS;
// A4 210x297mm, 10mm outer margin each side -> 190x277mm usable, 3 cols / 8 rows exactly.
const CELL_W = 190 / COLS; // ~63.33mm
const CELL_H = 277 / ROWS; // ~34.6mm

/** A4 sheet of 3x8 labels (measured against a real Avery-style sheet — Risk Assessment). */
export function LabelSheetA4({ labels }: LabelSheetA4Props) {
    const pages: typeof labels[] = [];
    for (let i = 0; i < labels.length; i += PER_PAGE) pages.push(labels.slice(i, i + PER_PAGE));
    if (pages.length === 0) pages.push([]);

    return (
        <div className="print-doc">
            <style>{`
                @media print { @page { size: A4 portrait; margin: 0; } }
                .label-a4-page { width: 210mm; height: 297mm; padding: 10mm; box-sizing: border-box; }
                .label-a4-cell { width: ${CELL_W}mm; height: ${CELL_H}mm; box-sizing: border-box; }
            `}</style>
            {pages.map((page, pageIdx) => (
                <div key={pageIdx} className="label-a4-page grid grid-cols-3 bg-surface" style={{ pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto' }}>
                    {Array.from({ length: PER_PAGE }).map((_, cellIdx) => {
                        const entry = page[cellIdx];
                        return (
                            <div key={cellIdx} className="label-a4-cell flex flex-col items-center justify-center gap-0.5 border border-dashed border-line p-1 text-center">
                                {entry ? (
                                    <>
                                        <div className="line-clamp-2 text-[8px] font-semibold leading-tight">{entry.item.name}</div>
                                        <BarcodeImage sku={entry.item.barcodePayload} widthMm={40} heightMm={12} />
                                        <div className="text-[7px] num">{entry.item.sku}{entry.serial ? ` · ${entry.serial}` : ''}</div>
                                        <div className="text-[9px] font-bold num">{entry.item.price.toLocaleString('vi-VN')}đ</div>
                                    </>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
