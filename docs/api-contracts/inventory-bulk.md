# API contract — Inventory bulk ops (W2-18)

**Owner:** W2-18 (`backend/Services/Inventory/Application/BulkOps/**`,
`backend/Services/Inventory/Endpoints/BulkOps/**`). Base path `/api/inventory/bulk`. Registered via
`IInventorySubmodule` (`InventoryBulkOpsSubmodule`), auto-discovered — nothing in
`InventoryEndpoints.cs` or `DependencyInjection.cs` changed.
**Status:** written 2026-09-18. W3-16 builds the upload wizard + label sheets from this document alone.

## 0. Cross-cutting rules

- **`.xlsx` only, ≤ 10 MB, ≤ 5.000 rows, magic-byte checked, macros rejected.** `BulkUploadGuard`
  reads the whole upload into memory under the 10 MB cap, checks the zip signature (`PK\x03\x04`)
  before anything is decompressed, then opens the zip's central directory (cheap — no inflate) and
  rejects a workbook containing `xl/vbaProject.bin`. The row cap (5.000) is `ExcelImportPipeline`'s
  own `DefaultMaxRows`, enforced during parsing.
- **Row errors never partially import.** `mode=dryRun` (default) never writes. `mode=commit` writes
  nothing the moment `errors[]` is non-empty.
- **One transaction per commit.** Opening balances: every row's `IStockLedger.Receive` call plus its
  serial rows share one ambient transaction (`IStockLedger.InTransactionAsync`). Suppliers: one
  `InventoryDbContext` transaction around the whole batch.
- **Cost here excludes VAT; the selling price elsewhere includes it (D01).** The opening-balance
  template's cost column header says "chưa VAT" explicitly.
- Cell **values only** — `ExcelImportPipeline` never evaluates formulas, only reads
  `Cell.GetString()`. Every exported cell (error workbook) goes through `ExcelSafeText.Neutralize`
  (leading `=`/`+`/`-`/`@` gets a literal-text prefix) — CWE-1236 formula-injection protection.
- The error workbook is cached 24h (Redis, `ICacheService`) and downloadable only by staff holding
  the same permission as the import it came from.

## 1. `GET /bulk/opening-balances/template`

Permission `Inventory.ImportOpening`. Downloads the blank template (`Mã SKU`, `Mã kho`, `Số lượng`,
`Đơn giá vốn (chưa VAT)`, `Serial (cách nhau bằng ;)`) plus a `DanhMuc` sheet listing active
warehouse codes and active SKUs, with a data-validation dropdown on both columns.

## 2. `POST /bulk/opening-balances`

Permission `Inventory.ImportOpening`. `multipart/form-data`, field `file`; query
`mode=dryRun|commit` (default `dryRun`).

**Row rules** (`OpeningBalanceRowValidator`):
- SKU must resolve to an **active** product; warehouse code must resolve to an **active** warehouse.
- The (product, warehouse) pair is rejected when it already has **any** `StockMovement` **or** a
  non-zero `QuantityOnHand` — message: *"đã có phát sinh hoặc còn số dư — dùng phiếu kiểm kê hoặc
  phiếu điều chỉnh"*. This is stricter than "no movement yet": W0-6 seeds `InventoryItem` rows with a
  quantity but no movement, so quantity alone must also be checked (phase-67 Key Insights).
- Same (product, warehouse) pair repeated in the file → row error.
- Serial-tracked category (`Category.IsSerialTracked`, D08): `serials.Count` must equal `Quantity`.
  A serial repeated in-row, repeated elsewhere in the file, or already in `SerialNumbers` → row
  error.

**Commit**: one `StockMovement` per row, `Reason = OpeningBalance`, posted through
`IStockLedger.ReceiveAsync` (this track never writes `InventoryItem` directly — Architecture).
`AverageCost` is set from the imported cost. Serial rows are created with `WarrantyMonths` from
`Product.WarrantyMonths` (D08), 12 as fallback.

Response `200`:
```json
{
  "mode": "dryRun",
  "totalRows": 3, "committed": 0,
  "errors": [{ "row": 4, "column": null, "message": "SKU 'ABC' tại kho 'KHO-CHINH' đã có phát sinh hoặc còn số dư — dùng phiếu kiểm kê hoặc phiếu điều chỉnh." }],
  "errorWorkbookToken": "a1b2c3..."
}
```
`400 { error, code: VALIDATION_FAILED }` (via `RequestValidationException`) for a structural/upload
problem (wrong extension, >10 MB, not a zip, contains a macro, missing column, >5.000 rows).

## 3. `GET /bulk/opening-balances/errors/{token}`

Permission `Inventory.ImportOpening`. Downloads the error workbook from step 2.

## 4. `GET /bulk/suppliers/template`

Permission `Inventory.CreateSupplier`. Downloads the blank template (`Tên nhà cung cấp`, `Mã số
thuế`, `Số điện thoại`, `Email`, `Địa chỉ`, `Điều khoản thanh toán`) plus a `DanhMuc` sheet with the
valid `PaymentTermType` codes and existing supplier names (so staff can spot a near-duplicate before
typing one).

## 5. `POST /bulk/suppliers`

Permission `Inventory.CreateSupplier`. `multipart/form-data`, field `file`; query
`mode=dryRun|commit` (default `dryRun`).

**Matching** (`SupplierImportService`): tax code first, then name (trimmed, case-insensitive). A
match **updates** the existing supplier's contact/address/payment-terms fields instead of creating a
second row — "never create a duplicate silently" (Implementation Steps #4).

Response `200`:
```json
{ "mode": "dryRun", "totalRows": 5, "created": 3, "matched": 2, "errors": [], "errorWorkbookToken": null }
```

## 6. `GET /bulk/suppliers/errors/{token}`

Permission `Inventory.CreateSupplier`.

## 7. `GET /bulk/label-data?skus=SKU1,SKU2` or `?grnId={guid}`

Permission `Inventory.ViewStock`. Returns the print payload for W3-16 — barcode image rendering
itself already exists (`BarcodeEndpoints`); this only returns the data.

- `skus=...`: one item per resolved SKU, `serials[]` = that product's serials currently `InStock`
  (a sold/scrapped unit is not relabelled).
- `grnId=...`: one item per GRN line, `serials[]` = exactly the serials that GRN line generated
  (`SerialNumber.GoodsReceivedNoteItemId`) — a re-print always matches the document, not today's
  stock.
- Exactly one of `skus` / `grnId` is required; neither → `400 VALIDATION_FAILED`.

Response `200`:
```json
{ "items": [{ "sku": "CPU-001", "name": "...", "barcodePayload": "CPU-001", "serials": ["SN1","SN2"], "warrantyMonths": 24, "price": 5490000 }] }
```

## Deviations from the phase file (see track report for the full reasoning)

- **Permissions**: the phase file's Architecture line says `Inventory.View` for the label endpoint —
  that constant does not exist in `PermissionsCommerce.cs`. Used `Inventory.ViewStock` (same class of
  read `BarcodeEndpoints` already gates that way). Supplier import names no permission at all; used
  `Inventory.CreateSupplier` (it already governs single-supplier creation).
- **DI**: `IInventorySubmodule` has no `Register(IServiceCollection)` hook the way Catalog's
  `ICatalogSubmodule` does, and `DependencyInjection.cs` is outside this track's ownership. Every
  service below is constructed by hand inside its endpoint from already-registered building blocks
  (`InventoryDbContext`, `CatalogDbContext`, `IStockLedger`, `ICacheService`) — same pattern as
  `QuickReceiveEndpoints` building `GoodsReceiptService` via a static factory. No DI registration
  needed, no file outside ownership touched.
