# Inventory — index

The inventory module is documented in two files, split along track ownership:

- **`inventory-stock.md`** (W2-5) — the `IStockLedger` in-process contract, stock queries and
  reservations, warehouses, transfers, counts, adjustments, serials, movements, delivery notes,
  barcodes, and the schema W2-5 added.
- **`inventory-purchasing.md`** (W2-12, pending) — purchase requisitions, RFQ, purchase orders and
  approvals, goods received notes, landed cost, purchase returns, supplier scorecard.

## The two items D09 asks to be documented here

1. **`SellableWarehouseTypes`** (`Inventory/Domain/SellableWarehouseTypes.cs`) = `Main`, `Branch`,
   `Showroom`. The `StockChangedEvent` the ledger publishes carries the on-hand total **across
   sellable warehouses only**, so stock sitting in `Defective`, `Returns` or `Transit` is never
   advertised as available. The public storefront stock endpoints
   (`/api/inventory/products/{id}/stock`, `…/variants/{variantId}/stock`) apply the same filter, and
   every warehouse response carries `isSellable`.

2. **`POST /api/inventory/transfers/{id}/complete`** — permission `Inventory.Approve`. Approves,
   ships and receives a transfer inside a single transaction: two `StockMovement` rows per line
   (`TransferOut` then `TransferIn`, carrying the source `AverageCost`) plus the serials moved to
   the destination warehouse. Returns `{ message, status, movedSerials }`. It exists because a
   four-step transfer between two rooms of the same building is friction staff will skip — and a
   skipped transfer is stock the system believes is in the wrong place.

Full request/response shapes, error codes and permissions: `inventory-stock.md`.
