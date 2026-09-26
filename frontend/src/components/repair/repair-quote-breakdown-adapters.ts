/** Map API quote shapes onto `RepairQuoteBreakdown` props — field copies only, no arithmetic. */
import type { PublicTrackedQuote, RepairQuoteTotals } from '../../api/repair/quote-types';
import type { RepairQuoteBreakdownProps as Props } from './repair-quote-breakdown';

/** Adapter for a saved quote / preview (`RepairQuoteTotals`) — pure field mapping, no arithmetic. */
export const breakdownFromQuote = (q: RepairQuoteTotals): Props => ({
    lines: q.lines.map((l) => ({
        key: l.id ?? String(l.sequence), kind: l.kind, description: l.description, quantity: l.quantity,
        unitPrice: l.unitPrice, discount: l.totalDiscount, lineTotal: l.lineTotal,
    })),
    totals: {
        subtotalAmount: q.subtotalAmount, discountTotal: q.discountTotal,
        netAmount: q.netAmount, vatAmount: q.vatAmount, vatRate: q.vatRate, totalCost: q.totalCost,
    },
});

/** Adapter for the public tracking payload. */
export const breakdownFromTracked = (q: PublicTrackedQuote): Props => ({
    lines: q.lines.map((l) => ({
        key: String(l.sequence), kind: l.kind, description: l.description, quantity: l.quantity,
        unitPrice: l.unitPrice, discount: l.discount, lineTotal: l.lineTotal,
    })),
    totals: {
        subtotalAmount: q.subtotalAmount, discountTotal: q.discountTotal,
        netAmount: q.netAmount, vatAmount: q.vatAmount, vatRate: q.vatRate, totalCost: q.totalCost,
    },
});
