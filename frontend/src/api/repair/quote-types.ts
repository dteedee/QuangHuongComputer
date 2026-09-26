/**
 * Repair quotes — itemised lines (Part / Labor / Service / Other). Every money
 * field is an integer VND amount, VAT-inclusive, COMPUTED BY THE SERVER
 * (`RepairQuoteCalculator`); the SPA never adds, discounts or splits VAT — the
 * quote editor asks `POST /repair/work-orders/{id}/quote/preview` instead.
 */
import type { QuoteStatus } from './types';

export type RepairQuoteLineKind = 'Part' | 'Labor' | 'Service' | 'Other';

export const QUOTE_LINE_KIND_LABELS: Record<RepairQuoteLineKind, string> = {
    Part: 'Linh kiện',
    Labor: 'Công sửa',
    Service: 'Dịch vụ',
    Other: 'Khác',
};

/** One line as the client sends it. `unitPrice` omitted + `serviceTypeId` ⇒ server uses the catalog base price. */
export interface RepairQuoteLineInput {
    kind: RepairQuoteLineKind;
    description?: string;
    quantity: number;
    unitPrice?: number;
    lineDiscount?: number;
    inventoryItemId?: string;
    productId?: string;
    serviceTypeId?: string;
}

export interface UpsertRepairQuoteInput {
    lines: RepairQuoteLineInput[];
    discountAmount: number;
    estimatedHours?: number;
    hourlyRate?: number;
    description?: string;
    notes?: string;
}

export interface RepairQuoteLine {
    id?: string | null;
    sequence: number;
    kind: RepairQuoteLineKind;
    description: string;
    inventoryItemId?: string | null;
    productId?: string | null;
    serviceTypeId?: string | null;
    quantity: number;
    unitPrice: number;
    lineDiscount: number;
    grossAmount: number;
    allocatedDiscount: number;
    /** lineDiscount + allocatedDiscount, summed by the server. */
    totalDiscount: number;
    lineTotal: number;
    vatRate: number;
    netAmount: number;
    vatAmount: number;
}

/** Totals shared by a saved quote and a preview. */
export interface RepairQuoteTotals {
    subtotalAmount: number;
    lineDiscountTotal: number;
    discountAmount: number;
    /** lineDiscountTotal + discountAmount, summed by the server. */
    discountTotal: number;
    netAmount: number;
    vatAmount: number;
    vatRate: number;
    partsCost: number;
    laborCost: number;
    serviceFee: number;
    totalCost: number;
    lines: RepairQuoteLine[];
}

export type RepairQuotePreview = RepairQuoteTotals;

export interface RepairQuote extends RepairQuoteTotals {
    id: string;
    quoteNumber: string;
    workOrderId: string;
    status: QuoteStatus;
    estimatedHours: number;
    hourlyRate: number;
    description?: string | null;
    notes?: string | null;
    validUntil: string;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
    createdAt: string;
    isExpired: boolean;
}

/** Quote summary on the public tracking page (no internal ids). */
export interface PublicTrackedQuote {
    quoteNumber: string;
    status: QuoteStatus;
    validUntil: string;
    subtotalAmount: number;
    discountTotal: number;
    netAmount: number;
    vatAmount: number;
    vatRate: number;
    totalCost: number;
    lines: Array<{
        sequence: number;
        kind: RepairQuoteLineKind;
        description: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        lineTotal: number;
    }>;
}

/** "8%" — display of a server-provided rate, not a computation. */
export const formatVatRate = (rate: number): string => `${Math.round(rate * 1000) / 10}%`;
