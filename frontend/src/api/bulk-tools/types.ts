/**
 * Shared row/response shapes for W3-16 bulk tools, matching
 * `docs/api-contracts/catalog-bulk.md` and `docs/api-contracts/inventory-bulk.md` verbatim.
 * Kept separate from the per-endpoint files so import/opening-stock (same response shape)
 * do not duplicate the type.
 */

export type ImportMode = 'dryRun' | 'commit';

export interface RowError {
    row: number;
    column: string | null;
    message: string;
}

export interface SlugRename {
    sku: string;
    allocatedSlug: string;
}

/** `POST /catalog/bulk/products/import` response (catalog-bulk.md §2). */
export interface ProductImportResult {
    mode: ImportMode;
    created: number;
    updated: number;
    skipped: number;
    totalRows: number;
    errors: RowError[];
    warnings: string[];
    renames: SlugRename[];
    errorWorkbookToken: string | null;
}

/** `POST /inventory/bulk/opening-balances` response (inventory-bulk.md §2). */
export interface OpeningBalanceImportResult {
    mode: ImportMode;
    totalRows: number;
    committed: number;
    errors: RowError[];
    errorWorkbookToken: string | null;
}

export interface BulkPriceFilter {
    categoryId?: string | null;
    brandId?: string | null;
    productIds?: string[] | null;
    basis: 'sellingPrice' | 'cost';
    adjustmentType: 'percent' | 'amount';
    value: number;
    allowBelowCost: boolean;
}

export interface BulkPriceLine {
    productId: string;
    sku: string;
    name: string;
    oldPrice: number;
    newPrice: number;
    cost: number;
    newNetPrice: number;
    belowCost: boolean;
}

export interface BulkPriceResult {
    matchedCount: number;
    appliedCount: number;
    belowCostBlockedCount: number;
    lines: BulkPriceLine[];
}

export interface LabelDataItem {
    sku: string;
    name: string;
    barcodePayload: string;
    serials: string[];
    warrantyMonths?: number;
    price: number;
}
