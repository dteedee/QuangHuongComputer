# API contract — Catalog bulk ops (W2-22)

**Owner:** W2-22 (`backend/Services/Catalog/Application/BulkOps/**`,
`backend/Services/Catalog/Endpoints/BulkOps/**`). Base path `/api/catalog/bulk`. Registered via
`ICatalogSubmodule` (`CatalogBulkOpsSubmodule`), not `CatalogEndpoints.cs`.
**Status:** written 2026-09-18. W3-16 builds the upload wizard / preview UI from this document
alone; W3-4 points its export button here.

## 0. Cross-cutting rules

- **`.xlsx` only, ≤ 5 MB, ≤ 5.000 rows** — enforced by the shared `ExcelImportPipeline<TRow>`
  (`BuildingBlocks/Spreadsheet`, D10) before the file is decompressed. A structural problem (wrong
  file type, missing header, too many rows) is a plain `400 { error }`, not the row-level shape
  below.
- **Row errors never partially import.** `mode=dryRun` never writes. `mode=commit` refuses (writes
  nothing) the moment `errors[]` is non-empty for ANY row.
- **Money is VND, integer, may be typed with `.`/`,` thousands separators** ("1.500.000" and
  "1500000" both parse). Selling price / list price **include VAT** (D01); reference cost **excludes
  VAT**.
- **No image ever comes from this pipeline** (D02: no URL fetch = no SSRF/hotlink path). A row with
  "Hiện trên web = Y" is imported anyway, unpublished (`PublishedAt = null`), with a warning — never
  rejected.
- Every write goes through `AuditScope.Bulk` (one audit summary row, not one per product) and sets
  `PriceChangeContext.Source` (`"Import"` / `"BulkPrice"`) so `CatalogDbContext`'s existing price-
  history hook writes `ProductPriceChanges` — this module never writes that table directly.

## 1. `GET /products/template`

Permission `Catalog.Import`. Downloads the blank `SanPham` template plus a `DanhMuc` lookup sheet
(active category/brand names, with an Excel data-validation dropdown on the Category/Brand columns
generated from the live database at request time).

## 2. `POST /products/import`

Permission `Catalog.Import`. `multipart/form-data`, field `file`; query `mode=dryRun|commit`
(default `dryRun`), `onDuplicate=skip|update` (default `skip`, matched by SKU).

Response `200`:
```json
{
  "mode": "dryRun",
  "created": 12, "updated": 3, "skipped": 1, "totalRows": 16,
  "errors": [{ "row": 5, "column": "Danh mục", "message": "Không tìm thấy danh mục '...'" }],
  "warnings": ["SKU ABC-1: đánh dấu \"Hiện trên web\" nhưng nhập không kèm ảnh..."],
  "renames": [{ "sku": "ABC-1", "allocatedSlug": "chuot-logitech-m100-2" }],
  "errorWorkbookToken": "a1b2c3..."
}
```
`400 { error }` for a structural file problem (wrong extension, missing column, >5.000 rows).

**Deviation from phase-71 Requirements' literal `{row, column, message}` for every error:**
category/brand-not-found and in-file duplicate-SKU errors DO carry the real Excel row (they run
inside the pipeline's `validateRow` hook, which the platform already ties to the row). The one thing
NOT row-tied is `renames[]` and `warnings[]` — keyed by SKU instead, because existing-SKU lookup and
slug allocation need the full set of SKUs first (a second pass, after the platform's own row-number
tracking has already ended). See track report §Deviations.

## 3. `GET /products/import/errors/{token}`

Permission `Catalog.Import`. Downloads the error workbook from step 2 (kept 24h, Redis-backed —
`404` after that or if the token is wrong).

## 4. `GET /products/export`

Permission `Catalog.Export`. Query `categoryId?`, `brandId?`, `ids?` (comma-separated GUIDs).
Same columns as the template — a round-trip: export, edit in Excel, re-`import`. Every text cell is
run through `ExcelSafeText.Neutralize` (a cell starting with `=`/`+`/`-`/`@` is written with a
leading apostrophe so it opens as text, not a live formula).

## 5. `POST /price/preview` and `POST /price/apply`

Permission `Catalog.BulkPrice` on both. Body:
```json
{
  "categoryId": null, "brandId": null, "productIds": null,
  "basis": "cost", "adjustmentType": "percent", "value": 15,
  "allowBelowCost": false
}
```
`basis`: `"sellingPrice"` (adjust `Products.Price` directly) or `"cost"` (adjust `Products.CostPrice`,
then gross up by the product's own resolved VAT rate — `VatRateResolver.Resolve` on
`Category.VatRate`/`VatReductionEligible`, D01). `adjustmentType`: `"percent"` or `"amount"` (VND).
Result always rounded **up** to the nearest 1.000đ. At most 5.000 matched products per run
(`400` above that — narrow the filter).

Response:
```json
{
  "matchedCount": 40, "appliedCount": 38, "belowCostBlockedCount": 2,
  "lines": [{ "productId": "...", "sku": "...", "name": "...",
              "oldPrice": 1000000, "newPrice": 1150000, "cost": 1000000,
              "newNetPrice": 1064815, "belowCost": false }]
}
```
A line with `belowCost: true` is excluded from `apply` unless `allowBelowCost: true` (the caller
already holds `Catalog.BulkPrice` by virtue of reaching the handler — there is no separate
permission check for the override, per Requirements).

**Known gap (filed as integration request):** the cost figure used is always `Products.CostPrice`.
Key Insights specifies `InventoryItem.AverageCost` when it is above zero. Catalog has no
cross-module contract to Inventory (`api-conventions.md` §9: "a module never references another
module") and none existed for cost to reuse — adding one is outside this track's file ownership.
See `plans/260917-2100-full-system-overhaul/reports/integration-requests-w2.md`.

## 6. Backlog

The `ThongSo` specification sheet stays in `backlog.md` (D10) — not in scope here.
