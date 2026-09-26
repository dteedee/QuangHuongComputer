/**
 * Read-only itemised repair quote: one row per line + subtotal / discount /
 * pre-VAT / VAT / total. Used by the backoffice work order, the customer's
 * approval screen, the public tracking page and the print view. Every number
 * comes from the server (`RepairQuoteCalculator`) — nothing is summed here.
 */
import { Money, Table, TBody, Td, Th, THead, Tr } from '../ui';
import { formatVatRate, QUOTE_LINE_KIND_LABELS, type RepairQuoteLineKind } from '../../api/repair/quote-types';

export interface QuoteBreakdownLine {
    key: string;
    kind: RepairQuoteLineKind;
    description: string;
    quantity: number;
    unitPrice: number;
    /** Line discount + share of the quote-level discount. */
    discount: number;
    lineTotal: number;
}

export interface QuoteBreakdownTotals {
    subtotalAmount: number;
    discountTotal: number;
    netAmount: number;
    vatAmount: number;
    vatRate: number;
    totalCost: number;
}

export interface RepairQuoteBreakdownProps {
    lines: QuoteBreakdownLine[];
    totals: QuoteBreakdownTotals;
    caption?: string;
}

const formatQuantity = (q: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(q);

export function RepairQuoteBreakdown({ lines, totals, caption = 'Chi tiết báo giá sửa chữa' }: RepairQuoteBreakdownProps) {
    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <Table>
                    <caption className="sr-only">{caption}</caption>
                    <THead>
                        <Tr>
                            <Th>Nội dung</Th>
                            <Th align="right">SL</Th>
                            <Th align="right">Đơn giá</Th>
                            <Th align="right">Giảm</Th>
                            <Th align="right">Thành tiền</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {lines.map((l) => (
                            <Tr key={l.key}>
                                <Td>
                                    <span className="block text-13 text-fg">{l.description}</span>
                                    <span className="text-2xs text-fg-subtle">{QUOTE_LINE_KIND_LABELS[l.kind] ?? l.kind}</span>
                                </Td>
                                <Td align="right" nowrap className="num">{formatQuantity(l.quantity)}</Td>
                                <Td align="right" nowrap><Money value={l.unitPrice} /></Td>
                                <Td align="right" nowrap>{l.discount > 0 ? <>−<Money value={l.discount} /></> : "—"}</Td>
                                <Td align="right" nowrap><Money value={l.lineTotal} className="font-medium" /></Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </div>
            <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-13">
                <dt className="text-fg-muted">Tạm tính</dt>
                <dd className="text-right"><Money value={totals.subtotalAmount} /></dd>
                {totals.discountTotal > 0 && (
                    <>
                        <dt className="text-fg-muted">Giảm giá</dt>
                        <dd className="text-right">−<Money value={totals.discountTotal} /></dd>
                    </>
                )}
                <dt className="text-fg-muted">Tiền trước thuế</dt>
                <dd className="text-right"><Money value={totals.netAmount} /></dd>
                <dt className="text-fg-muted">Thuế GTGT ({formatVatRate(totals.vatRate)})</dt>
                <dd className="text-right"><Money value={totals.vatAmount} /></dd>
                <dt className="border-t border-line pt-1 font-semibold text-fg">Tổng cộng</dt>
                <dd className="border-t border-line pt-1 text-right font-semibold text-fg"><Money value={totals.totalCost} /></dd>
            </dl>
            <p className="text-right text-2xs text-fg-subtle">Giá đã bao gồm VAT.</p>
        </div>
    );
}
