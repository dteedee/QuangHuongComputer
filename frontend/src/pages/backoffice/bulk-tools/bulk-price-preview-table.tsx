import { useRef, useState } from 'react';
import type { BulkPriceLine } from '../../../api/bulk-tools';
import { Badge } from '../../../components/ui';

const ROW_H = 36;
const VIEWPORT_H = 420;
const OVERSCAN = 8;

const money = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

/**
 * Windowed preview table — up to 5.000 rows (catalog-bulk.md §5 cap), no virtualization lib in
 * the project and none may be installed (`qh-build.sh` blocks `npm install`), so this renders
 * only the rows in view + overscan instead of the whole DOM at once.
 */
export function BulkPricePreviewTable({ lines }: { lines: BulkPriceLine[] }) {
    const [scrollTop, setScrollTop] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
    const visibleCount = Math.ceil(VIEWPORT_H / ROW_H) + OVERSCAN * 2;
    const end = Math.min(lines.length, start + visibleCount);
    const visible = lines.slice(start, end);

    return (
        <div
            ref={ref}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            style={{ height: VIEWPORT_H, overflowY: 'auto' }}
            className="rounded-lg border border-line"
            role="table"
            aria-label="Bảng xem trước giá"
        >
            <div className="sticky top-0 z-10 flex bg-surface-subtle text-xs font-semibold" role="row">
                <span className="w-1/3 px-2 py-2">Sản phẩm</span>
                <span className="w-1/6 px-2 py-2 text-right">Giá cũ</span>
                <span className="w-1/6 px-2 py-2 text-right">Giá mới</span>
                <span className="w-1/6 px-2 py-2 text-right">Giá vốn</span>
                <span className="w-1/6 px-2 py-2 text-right">Trạng thái</span>
            </div>
            <div style={{ height: lines.length * ROW_H, position: 'relative' }}>
                {visible.map((line, i) => {
                    const top = (start + i) * ROW_H;
                    return (
                        <div
                            key={line.productId}
                            role="row"
                            style={{ position: 'absolute', top, height: ROW_H, width: '100%' }}
                            className="flex items-center border-t border-line/50 text-sm"
                        >
                            <span className="w-1/3 truncate px-2">{line.name} <span className="num text-fg-muted">({line.sku})</span></span>
                            <span className="w-1/6 px-2 text-right num">{money(line.oldPrice)}</span>
                            <span className={`w-1/6 px-2 text-right num font-medium ${line.belowCost ? 'text-danger' : ''}`}>{money(line.newPrice)}</span>
                            <span className="w-1/6 px-2 text-right num text-fg-muted">{money(line.cost)}</span>
                            <span className="w-1/6 px-2 text-right">
                                {line.belowCost ? <Badge className="bg-danger/10 text-danger">Dưới giá vốn</Badge> : <Badge className="bg-success-subtle text-success">Áp dụng</Badge>}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
