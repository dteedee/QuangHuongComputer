/**
 * Sales — quotations (báo giá B2B, W2-19 backend / W3-17 this client).
 * Contract: `docs/api-contracts/sales-quotations.md`. Route uses "quotations",
 * never "quote" (already taken by POS cart pricing + RepairQuotes).
 * Money is VAT-inclusive per D01; FE never computes tax, only displays the
 * server's breakdown.
 */
import client from '../client';

export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted';
export type BuyerType = 'Individual' | 'Organization' | 'BudgetUnit';

export interface QuotationLineDto {
    id: string;
    sequence: number;
    productId: string;
    variantId?: string | null;
    productName: string;
    productSku: string;
    unitName: string;
    quantity: number;
    unitPrice: number;
    lineDiscount: number;
    vatRate: number;
    netAmount: number;
    vatAmount: number;
    lineTotal: number;
    notes?: string | null;
}

export interface QuotationLineInput {
    productId: string;
    variantId?: string | null;
    quantity: number;
    unitPriceOverride?: number | null;
    lineDiscount?: number;
    notes?: string | null;
}

export interface QuotationDto {
    id: string;
    quotationNumber: string;
    status: QuotationStatus;
    customerId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    buyerType: BuyerType;
    buyerLegalName?: string | null;
    buyerTaxCode?: string | null;
    buyerBudgetUnitCode?: string | null;
    buyerAddress?: string | null;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    paymentTermDays: number;
    validUntil?: string | null;
    acceptedAt?: string | null;
    convertedAt?: string | null;
    convertedOrderId?: string | null;
    termsText?: string | null;
    notes?: string | null;
    createdBy?: string | null;
    createdAt: string;
    updatedAt?: string | null;
    lines: QuotationLineDto[];
}

/** Deliberately NOT `Omit<QuotationDto, 'lines'>` — read verbatim from the real
 *  backend record (`Sales/Application/Quotations/QuotationDtos.cs`, read-only
 *  access), which trims the list row to these 8 fields, not the full detail
 *  shape minus lines. */
export interface QuotationListItemDto {
    id: string;
    quotationNumber: string;
    status: QuotationStatus;
    customerName?: string | null;
    validUntil?: string | null;
    totalAmount: number;
    createdBy?: string | null;
    createdAt: string;
}

export interface QuotationListParams {
    status?: QuotationStatus;
    customerId?: string;
    validAfter?: string;
    validBefore?: string;
    createdBy?: string;
    page?: number;
    pageSize?: number;
}

export interface QuotationListResult {
    items: QuotationListItemDto[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface UpsertQuotationRequest {
    customerId?: string | null;
    customerName: string;
    customerPhone?: string | null;
    customerEmail?: string | null;
    buyerType: BuyerType;
    buyerLegalName: string;
    buyerTaxCode?: string | null;
    buyerBudgetUnitCode?: string | null;
    buyerAddress?: string | null;
    validUntil?: string | null;
    paymentTermDays: number;
    termsText?: string | null;
    notes?: string | null;
    lines: QuotationLineInput[];
}

export interface ConvertQuotationRequest {
    recipientName: string;
    phone: string;
    streetAddress?: string | null;
    ward?: string | null;
    district?: string | null;
    province?: string | null;
    isPickup: boolean;
    pickupStoreId?: string | null;
    pickupStoreName?: string | null;
    notes?: string | null;
}

export interface ConvertQuotationResult {
    success: boolean;
    orderId?: string;
    orderNumber?: string;
    totalAmount?: number;
    paymentMethod?: string;
    paymentDueDate?: string;
    errorMessage?: string;
}

export interface QuotationVatBreakdownRow {
    rate: number;
    net: number;
    vat: number;
}

export interface QuotationPrintCompanyBlock {
    name: string;
    taxCode: string;
    address: string;
    phone?: string;
    email?: string;
}

export interface QuotationPrintPayloadDto {
    company: QuotationPrintCompanyBlock;
    quotation: QuotationDto;
    vatBreakdown: QuotationVatBreakdownRow[];
    termsText?: string | null;
}

export const quotationsApi = {
    list: (params: QuotationListParams = {}) =>
        client.get<QuotationListResult>('/sales/quotations', { params }).then((r) => r.data),
    getById: (id: string) => client.get<QuotationDto>(`/sales/quotations/${id}`).then((r) => r.data),
    create: (body: UpsertQuotationRequest) => client.post<QuotationDto>('/sales/quotations', body).then((r) => r.data),
    update: (id: string, body: UpsertQuotationRequest) =>
        client.put<QuotationDto>(`/sales/quotations/${id}`, body).then((r) => r.data),
    send: (id: string) => client.post<QuotationDto>(`/sales/quotations/${id}/send`).then((r) => r.data),
    accept: (id: string) => client.post<QuotationDto>(`/sales/quotations/${id}/accept`).then((r) => r.data),
    reject: (id: string, reason?: string) =>
        client.post<QuotationDto>(`/sales/quotations/${id}/reject`, reason ? { reason } : {}).then((r) => r.data),
    convert: (id: string, body: ConvertQuotationRequest) =>
        client.post<ConvertQuotationResult>(`/sales/quotations/${id}/convert`, body).then((r) => r.data),
    getPrintPayload: (id: string) =>
        client.get<QuotationPrintPayloadDto>(`/sales/quotations/${id}/print`).then((r) => r.data),
    expireDue: () => client.post<{ expiredCount: number }>('/sales/quotations/expire-due').then((r) => r.data),
};
