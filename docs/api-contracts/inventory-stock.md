# Inventory — stock, warehouses, transfers, counts, adjustments, serials

**Owner:** W2-5. **Status:** frozen 2026-09-18 (wave 2). Purchasing (PR/RFQ/PO/GRN/landed cost/
purchase return) is **W2-12** and is documented separately.

Everything here obeys `docs/api-conventions.md`: RFC 9457 problem+json errors with a stable `code`,
`?page&pageSize&search&sortBy&sortDir` paging with a `PagedResult<T>` envelope, document numbers
`PREFIX-yyyyMM-#####`, UTC storage / `Asia/Ho_Chi_Minh` business dates. Permissions come from
`docs/permission-matrix.md`; **no endpoint is gated on a role string.**

Wave 3 builds the inventory UI from this document alone.

---

## 1. `IStockLedger` — the in-process contract

`InventoryModule.Application.Stock.IStockLedger`, registered scoped. It is the **only** writer of
`InventoryItems.QuantityOnHand`, `.ReservedQuantity`, `.AverageCost` and of `StockMovements`.
W2-12 (GRN), W2-13 (repair parts) and W2-3/W2-10 (checkout, POS, returns) call these signatures —
never `db.InventoryItems.Update(...)`.

```csharp
readonly record struct StockLocation(Guid ProductId, Guid? VariantId = null, Guid? WarehouseId = null);
sealed record StockLedgerContext(string PerformedBy, string? ReferenceId = null, string? ReferenceType = null,
                                 string? DocumentReference = null, string? Notes = null);
sealed record StockLedgerEntry(Guid MovementId, Guid InventoryItemId, Guid ProductId, Guid? VariantId,
                               Guid? WarehouseId, MovementType Type, StockMovementReason Reason, int Delta,
                               int QuantityOnHand, int ReservedQuantity, decimal UnitCost, decimal AverageCost);

Task<StockLedgerEntry>              ReceiveAsync(StockLocation l, int qty, decimal unitCost, StockLedgerContext c,
                                                 StockMovementReason reason = GoodsReceipt, CancellationToken ct = default);
Task<StockLedgerEntry>              IssueAsync  (StockLocation l, int qty, StockLedgerContext c,
                                                 StockMovementReason reason = Sale, CancellationToken ct = default);
Task<StockLedgerEntry>              AdjustAsync (StockLocation l, int delta, StockLedgerContext c,
                                                 StockMovementReason reason = ManualAdjustment, CancellationToken ct = default);
Task<IReadOnlyList<StockLedgerEntry>> TransferAsync(StockLocation source, Guid toWarehouseId, int qty,
                                                 StockLedgerContext c, CancellationToken ct = default);
Task<StockLedgerEntry>              ReserveAsync(StockLocation l, int qty, StockLedgerContext c, CancellationToken ct = default);
Task<StockLedgerEntry>              CommitAsync (StockLocation l, int qty, StockLedgerContext c, CancellationToken ct = default);
Task<StockLedgerEntry>              ReleaseAsync(StockLocation l, int qty, StockLedgerContext c, CancellationToken ct = default);
Task<IReadOnlyList<string>>         MoveSerialsAsync(Guid productId, Guid fromWarehouseId, Guid toWarehouseId,
                                                 int qty, CancellationToken ct = default);
Task<T>                             InTransactionAsync<T>(Func<CancellationToken, Task<T>> work, CancellationToken ct = default);
```

Rules every caller can rely on:

| rule | detail |
|---|---|
| one movement per quantity change | `StockMovements` row carries type, reason code, signed quantity, unit cost, `BalanceAfter`, warehouse, variant, reference and `PerformedBy`. |
| actor from the JWT | `StockLedgerContext.From(ClaimsPrincipal)`. Never from the request body. |
| `WarehouseId = null` → default warehouse | D09. `Warehouses.IsDefault` is unique (partial index); missing default → `DOMAIN_RULE` 400. |
| weighted average on receipt | `ApplyPurchase(qty, unitCost)`; a transfer carries the source row's `AverageCost` into the destination. |
| never negative | `IssueAsync`/`AdjustAsync` refuse to drop below 0 **or** below `ReservedQuantity`. |
| transactional | execution strategy + transaction; up to 3 retries on an `xmin` conflict, then `CONFLICT` 409 (`CONCURRENCY_CONFLICT`). Nested calls join the caller's transaction (`InTransactionAsync`). |
| projection | `StockChangedEvent(ProductId, WarehouseId, QuantityOnHand, Delta, OccurredOn)` published after commit, fire-and-forget (no outbox yet — `docs/integration-events.md`). **`QuantityOnHand` is the total across sellable warehouses only** (D09: `Main`, `Branch`, `Showroom`), so Catalog can assign it straight to `Products.StockQuantity` and defective stock is never advertised. `LowStockEvent` follows when the row is at or below its threshold. |

`StockMovementReason` (new enum, `Domain/StockMovementReason.cs`): `GoodsReceipt=0`,
`OpeningBalance=1`, `CustomerReturn=2`, `TransferIn=3`, `TransferOut=4`, `Sale=5`,
`DeliveryNote=6`, `RepairPart=7`, `CountAdjustment=8`, `ManualAdjustment=9`, `Damage=10`,
`Loss=11`, `Found=12`, `Expiry=13`, `Reservation=14`, `ReservationRelease=15`,
`ReservationCommit=16`, `PurchaseReturn=17`.

**D10:** `OpeningBalance` is the only receipt that may skip a GRN. Same-day purchases go through
W2-12's quick receive, which creates a real PO and GRN.

---

## 2. Stock

| method | path | permission | notes |
|---|---|---|---|
| GET | `/api/inventory/stock` | `Inventory.ViewStock` | paged. Filters `warehouseId`, `productId`, `lowStockOnly`. Sort: `quantityOnHand`, `averageCost`, `lastStockUpdate`. |
| GET | `/api/inventory/stock/{productId}` | `Inventory.ViewStock` | every row of that product (all variants, all warehouses). 404 when none. |
| GET | `/api/inventory/products/{productId}/stock` | anonymous | storefront. Sellable warehouses only. `{ productId, quantityOnHand, reservedQuantity, availableQuantity }`. |
| GET | `/api/inventory/products/{productId}/variants/{variantId}/stock` | anonymous | same shape + `variantId`. |
| GET | `/api/inventory/products/{productId}/stock-by-branch` | anonymous | array of `{ warehouseId, warehouseName, warehouseCode, address, city, phone, type, quantity }`, `Branch`/`Showroom` with `quantity > 0`. |
| POST | `/api/inventory/stock/{productId}/reserve` | `Inventory.ManageStock` | body `{ quantity, referenceId, referenceType, variantId?, warehouseId?, expirationHours?=24, notes? }` → `{ success, reservationId, quantityOnHand, reservedQuantity }`. Over-reserve → 400 `DOMAIN_RULE`. |
| POST | `/api/inventory/reservations/{referenceId}/fulfill` | `Inventory.ManageStock` | commits every active reservation of that reference in one transaction. |
| POST | `/api/inventory/reservations/{referenceId}/release` | `Inventory.ManageStock` | body `{ reason }`. |
| PUT | `/api/inventory/stock/{id}/adjust` | `Inventory.AdjustStock` | single-row correction. Body `{ amount, reason }`; **empty reason → 400 `VALIDATION_FAILED`**. Writes an `Adjustment` movement. For anything needing sign-off use §5. |
| POST | `/api/inventory/stock/opening-balance` | `Inventory.ImportOpening` | D10. Body `{ productId, quantity, unitCost, variantId?, warehouseId?, notes? }`. Reason `OpeningBalance`. |

## 3. Warehouses

`GET /api/inventory/warehouses` · `GET .../dropdown` · `GET .../{id}` → `Inventory.ViewStock`;
`POST /api/inventory/warehouses` → `Inventory.ManageStock`; `PUT`/`DELETE .../{id}` →
`Inventory.AdjustStock`. Responses carry `isSellable` (D09). Unknown `type` → 400 `DOMAIN_RULE`;
duplicate `code` → 409 `CONFLICT`; deleting the default warehouse or one still holding stock → 400.
`DELETE` is a soft delete (`IsActive = false`).

## 4. Transfers

| method | path | permission |
|---|---|---|
| GET | `/api/inventory/transfers` | `Inventory.ViewStock` (paged; `status`, `warehouseId`) |
| GET | `/api/inventory/transfers/{id}` | `Inventory.ViewStock` |
| POST | `/api/inventory/transfers` | `Inventory.ManageStock` |
| PUT | `/api/inventory/transfers/{id}/approve` | `Inventory.Approve` |
| PUT | `/api/inventory/transfers/{id}/ship` | `Inventory.ManageStock` |
| PUT | `/api/inventory/transfers/{id}/receive` | `Inventory.ManageStock` |
| **POST** | **`/api/inventory/transfers/{id}/complete`** | **`Inventory.Approve`** |
| PUT | `/api/inventory/transfers/{id}/cancel` | `Inventory.ManageStock` |

Create body: `{ fromWarehouseId, toWarehouseId, items: [{ inventoryItemId, quantity, serialNumbers? }], notes? }`.
`requestedBy`, `productName`, `productSku` in the body are **ignored** — the requester is the JWT
subject, name/SKU are snapshotted from Catalog. Number from `docnum_tr_seq` (`TR-yyyyMM-#####`).
Creation validates both warehouses (destination active), that every line belongs to the source
warehouse, that available quantity covers it, and — for products whose category is
`IsSerialTracked` — that `serialNumbers` lists exactly `quantity` serials that are `InStock` in the
source warehouse and not already on another open (Pending/Approved/Shipped) transfer. Serials on a
non-tracked product → 400.

List rows add `cancelledAt` and `hasDiscrepancy`; `search` matches the transfer number. Detail
returns warehouse names, actor **names** (via `IUserDirectory`), `receiveNote`, and per line
`{ id, inventoryItemId, productId, variantId, productName, productSku, quantity, receivedQuantity,
shortage, serialNumbers }`.

**Ship** (`Approved` only): one `TransferOut` movement per line; the line's serials (chosen at
create, or FIFO for transfers created before serial selection) go to `InTransit` — no warehouse can
sell them — and are recorded on the line. Returns `{ message, status, shippedSerials }`.

**Receive** (`Shipped` only), optional body `{ lines?: [{ itemId, receivedQuantity, receivedSerials? }], note? }`;
no body = everything arrived. `TransferIn` is posted for the received quantity only, at the unit
cost of the `TransferOut` movement (not the source's current average). Received serials → `InStock`
at the destination; missing ones stay `InTransit` with a note naming the transfer. A shortfall
without `note` → 400. Response `{ message, status, hasDiscrepancy }`.

**Cancel** only while `Pending`/`Approved` (409 afterwards — the old build let a shipped transfer be
cancelled, losing the stock). **D09 `/complete`** does approve + ship + receive-all inside one
transaction and returns `{ message, status, movedSerials: [...] }`.

**Concurrency:** `StockTransfers` carries an `xmin` token; two requests acting on the same transfer
at once → the second gets 409 and nothing is posted twice.

## 5. Adjustments

| method | path | permission |
|---|---|---|
| GET | `/api/inventory/adjustments` | `Inventory.ViewStock` (paged; `warehouseId`, `pendingOnly`) |
| GET | `/api/inventory/adjustments/{id}` | `Inventory.ViewStock` |
| POST | `/api/inventory/adjustments` | `Inventory.AdjustStock` |
| POST | `/api/inventory/adjustments/{id}/approve` | `Inventory.Approve` |
| POST | `/api/inventory/adjustments/{id}/reject` | `Inventory.Approve` |

Create body `{ warehouseId, type, reason, items: [{ inventoryItemId, quantityAdjusted, productName?, productSku? }] }`;
`type` ∈ `Damage|Loss|Found|Count|Return|Expiry`. Creating a voucher does **not** change stock.
Approval posts every line through the ledger in one transaction and sets `IsPosted`.

Refusals: missing/short `reason` → 400 `VALIDATION_FAILED`; `quantityAdjusted = 0` → 400; a line
whose warehouse differs from the voucher → 400; a line that would push stock below reserved → 400;
**approver == recorder → 400 `DOMAIN_RULE`** ("Người lập phiếu không được tự duyệt…"); approving
twice → 400. Number from `docnum_adj_seq` (`DC-yyyyMM-#####`).

## 6. Counts

| method | path | permission |
|---|---|---|
| POST | `/api/inventory/count` | `Inventory.ManageStock` |
| GET | `/api/inventory/count` | `Inventory.ViewStock` (paged; `status`) |
| GET | `/api/inventory/count/{id}` | `Inventory.ViewStock` |
| GET | `/api/inventory/count/{id}/variance` | `Inventory.ViewStock` |
| POST | `/api/inventory/count/{id}/record` | `Inventory.ManageStock` |
| POST | `/api/inventory/count/{id}/approve` | `Inventory.Approve` |
| POST | `/api/inventory/count/{id}/cancel` | `Inventory.ManageStock` |

Create body `{ warehouseId?, scope, categoryId?, countDate?, notes? }`. `scope = ByCategory`
**requires** `categoryId` and only enrols products of that category; an empty scope → 400.
Lines pin `inventoryItemId` + `variantId` + `warehouseId`, so approval adjusts exactly the row that
was counted. `record` takes `[{ itemId, countedQuantity, notes? }]`; `countedBy` is the JWT subject.
Detail and variance return `countedLines`, `varianceLines`, `totalVariance`; `/variance` lists only
lines counted with a non-zero variance. Approval requires status `InProgress`/`PendingApproval`,
**refuses the session's own creator (403 `FORBIDDEN`)**, and posts each variance as a
`CountAdjustment` movement. Number from `docnum_cnt_seq` (`KK-yyyyMM-#####`).

## 7. Serials

`GET /api/inventory/serials` (paged; `productId`, `warehouseId`, `status`, `search`),
`GET .../{id}`, `GET .../lookup/{serial}`, `GET .../{serial}/timeline` → `Inventory.ViewStock`.
`POST /api/inventory/serials`, `POST .../batch`, `PUT .../{id}/transfer`, `PUT .../{id}/status` →
`Inventory.ManageStock`.

**D08:** when `warrantyMonths` is absent or ≤ 0 the serial inherits `Product.WarrantyMonths`
(fallback 12) instead of a hardcoded 12, so `SerialNumber.Sell()` and the product agree on the
warranty end date. Serial tracking is decided by `Category.IsSerialTracked`; there is no per-product
flag. Duplicate serial → 409 `CONFLICT`; batch reports duplicates in `errors[]` and imports the rest.
`status` actions: `sell`, `reserve`, `release`, `return`, `defective`, `repair`, `complete-repair`;
an illegal transition → 400 `DOMAIN_RULE`.

`GET /api/inventory/serials/{serial}/timeline` returns
`{ serial, productId, productName, status, warehouseId, warrantyMonths, warrantyEndDate, timeline: [{ at, type, reference, status?, party?, notes? }] }`
with `type` ∈ `Purchased | Received | Sold | Repair | WarrantyClaim | Returned`, ordered by `at`.
Sales/Repair/Warranty are read read-only through `Infrastructure/SerialTimelineQueries.cs`; a
failure there is **logged** and the entry omitted (it used to be swallowed by `catch { }`).

## 8. Movements, delivery notes, barcodes

`GET /api/inventory/movements` → `Inventory.ViewStock`, paged; filters `productId`,
`inventoryItemId`, `warehouseId`, `type`, `reason`, `from`, `to`. Each row:
`{ id, inventoryItemId, productId, variantId, warehouseId, type, reasonCode, reason, quantity, balanceAfter, unitCost, referenceId, referenceType, documentReference, performedBy, movementDate, notes }`.
Rows written before wave 2 have `balanceAfter = 0` (not reconstructable — see the column comment).

`POST /api/inventory/dn` · `POST /api/inventory/dn/{id}/confirm` · `POST /api/inventory/dn/{id}/cancel`
→ `Inventory.ManageStock`; `GET /api/inventory/dn` (paged, `status`) and `GET /api/inventory/dn/{id}`
→ `Inventory.ViewStock`. Number from `docnum_dn_seq`. `deliveredBy` comes from the JWT. Confirm
issues every line through the ledger (reason `DeliveryNote`) in one transaction; insufficient stock
→ 400 and nothing is written.

`GET /api/inventory/barcode/{sku}` and `GET /api/inventory/qrcode/{serial}` return `image/svg+xml`;
`GET /api/inventory/barcode/lookup/{barcode}` returns the inventory row. All three →
`Inventory.ViewStock` (they expose internal SKU/serial).

---

## 9. Schema added by W2-5

Migration `20260918180500_W25InventoryStockLedger`:

- `StockMovements` + `VariantId`, `WarehouseId`, `ReasonCode` (int), `UnitCost` (18,2),
  `BalanceAfter`; indexes on `(WarehouseId, MovementDate)` and `ReasonCode`;
  `CK_StockMovements_UnitCost_NonNegative`. Legacy rows get `WarehouseId`/`VariantId` backfilled
  from their `InventoryItem`.
- `StockAdjustments` + `IsPosted`, `PostedAt`, `RejectionReason`; `Reason` now `NOT NULL(500)`.
  `StockAdjustmentItem` + index + `CK_StockAdjustmentItems_QuantityAfter_NonNegative`.
- `InventoryCountItems` + `InventoryItemId`, `VariantId`, `WarehouseId` + index.
- **For W2-12:** `PurchaseOrderItem.ReceivedQuantity` (shadow property, `>= 0` check),
  `SerialNumbers.GoodsReceivedNoteItemId` + index, and a real FK
  `GoodsReceivedNotes.PurchaseOrderId → PurchaseOrders.Id` (`ON DELETE RESTRICT`).
- Sequences `docnum_cnt_seq`, `docnum_adj_seq` (see integration request W2-5-01).

## 10. Module wiring

`app.MapInventoryEndpoints()` discovers every `IInventorySubmodule` in the Inventory assembly
(`Endpoints/InventorySubmodule.cs`) and maps it. Adding a group — including W2-12's
`Endpoints/Purchasing/**` — needs no change in `ApiGateway/Program.cs`.
`MapWarehouseEndpoints`/`MapInventoryCountEndpoints`/`MapBarcodeEndpoints`/`MapDeliveryNoteEndpoints`
still exist as **empty** methods only so that file keeps compiling (integration request W2-5-02).

The legacy `PUT /api/inventory/po/{id}/receive` is **gone**: it bypassed the ledger, never set a
cost price, never created serials and moved supplier debt with no invoice.
