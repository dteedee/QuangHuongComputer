# API contract — Inventory / Purchasing (W2-12)

Owner: W2-12. Scope: purchase requisition (PR) → RFQ → purchase order (PO) → approval → goods
received note (GRN) → purchase return, landed cost, supplier scorecard.
Wave 3 builds the UI from this document alone.

Base conventions: `docs/api-conventions.md` — error body (RFC 9457 + `code` + `errors[]`), paging
(`?page&pageSize&search`, envelope `{items,total,page,pageSize,totalPages,hasPreviousPage,hasNextPage}`),
document numbers `PREFIX-yyyyMM-#####`, UTC stored / VN local business date.
Permissions: `docs/permission-matrix.md`. Every group carries a permission policy; no role strings.

**One invariant above everything: a GRN is the only way supplier stock enters the warehouse.**
The old `PUT /api/inventory/po/{id}/receive` is deleted and does not come back. The only other way
to add stock is opening balance (D10) and quick receive below — which is itself a GRN.

## Money

Purchase prices and costs are **excluding VAT** (D01 item 7); input VAT is deductible and is carried
on the AP invoice, not on the PO line.

---

## 1. Purchase orders — `/api/inventory/po`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/inventory/po` | `Inventory.ViewPurchaseOrder` | paged; `?status=`, `?supplierId=`, `?search=` (PO number) |
| GET | `/api/inventory/po/{id}` | `Inventory.ViewPurchaseOrder` | detail + lines with `receivedQuantity`, `outstandingQuantity` |
| POST | `/api/inventory/po` | `Inventory.CreatePurchaseOrder` | validated; creator from the JWT |
| PUT | `/api/inventory/po/{id}/send` | `Inventory.CreatePurchaseOrder` | `Approved → Sent` |
| PUT | `/api/inventory/po/{id}/cancel` | `Inventory.CreatePurchaseOrder` | refused once `Received` |

`POST` body: `{ supplierId, items:[{productId, quantity, unitPrice}], isUrgent?, expectedDeliveryDate? }`
→ **201** `{ id, poNumber, status, totalAmount }`.

Errors: `quantity <= 0`, `unitPrice < 0`, empty `items`, missing `supplierId` → **400**
`VALIDATION_FAILED` with `errors[]`. Unknown/inactive supplier, unknown product → **400**
`VALIDATION_FAILED` on `supplierId` / `items`.

`poNumber` comes from `IDocumentNumberService` (`PO-202609-00042`). The line's `productName` is a
snapshot taken at creation time — renaming the product later never rewrites an old order.

Statuses: `Draft(0) Sent(1) PartialReceived(2) Received(3) Cancelled(4) PendingApproval(5) Approved(6) Rejected(7)`.

## 2. Approval — `/api/inventory/po/{id}/…`, `/api/inventory/po-approvals`, `/api/inventory/po-approval-rules`

| Method | Path | Permission |
|---|---|---|
| POST | `/api/inventory/po/{id}/submit` | `Inventory.CreatePurchaseOrder` |
| POST | `/api/inventory/po/{id}/approve` | `Inventory.ApprovePurchaseOrder` |
| POST | `/api/inventory/po/{id}/reject` (`{reason}`) | `Inventory.ApprovePurchaseOrder` |
| GET | `/api/inventory/po-approvals/pending` | `Inventory.ViewPurchaseOrder` |
| GET/POST/PUT/DELETE | `/api/inventory/po-approval-rules` | `System.ManageConfig` (Admin) |

Server-side rules, not advisory: the amount band picks the rule (`POApprovalRule`, seeded on every
boot by `PoApprovalRuleSeeder` — 0–20tr / 20–100tr Manager, ≥100tr Admin), the approver must hold
the rule's role (Admin bypasses), and neither the creator nor the submitter may approve
(**403** `FORBIDDEN` / **400** `DOMAIN_RULE`).

`pending` returns `{approvalRequestId, poId, poNumber, supplierId, supplierName, totalAmount,
requiredRole, submittedBy, submittedByName, createdByName, submittedAt, isUrgent}` —
`submittedByName` resolves the submitter GUID against Identity (wave-0 IR #50).

## 3. Goods received note — `/api/inventory/grn`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/inventory/grn` | `Inventory.ViewStock` | paged; `?status=&supplierId=&purchaseOrderId=&search=` |
| GET | `/api/inventory/grn/defective` | `Inventory.ViewStock` | GRNs with rejected lines — source list for purchase returns |
| GET | `/api/inventory/grn/{id}` | `Inventory.ViewStock` | header + lines (`itemId`, accepted/rejected, serials) |
| POST | `/api/inventory/grn` | `Inventory.ManageStock` | create draft |
| POST | `/api/inventory/grn/{id}/items/{itemId}/inspect` | `Inventory.ManageStock` | one line |
| POST | `/api/inventory/grn/{id}/inspect` | `Inventory.ManageStock` | whole note, `{items:[{itemId,acceptedQty,rejectedQty,reason?,targetWarehouseId?}]}` |
| POST | `/api/inventory/grn/{id}/confirm` | `Inventory.ReceivePurchaseOrder` | the receiving act |
| POST | `/api/inventory/grn/{id}/cancel` | `Inventory.ManageStock` | draft only |

`POST` body: `{supplierId?, warehouseId?, purchaseOrderId?, documentDate?, notes?,
items:[{productId, productName, quantity, unitCost, serialNumbers?}]}` → **201**
`{id, documentNumber, status}`. `receivedBy` is always the JWT identity; a value in the body is
ignored. Inspection requires `accepted + rejected == quantity` (**400** `DOMAIN_RULE` otherwise) and
a reason whenever `rejected > 0`.

### `confirm` — what it does, in one transaction

1. refuses a `Purchase`-source note without a `purchaseOrderId` (**400** — use quick receive);
2. per line, `IStockLedger.ReceiveAsync(accepted, unitCost)` → weighted-average `AverageCost`, one
   `StockMovements` row `In` carrying the unit cost and the JWT actor;
3. creates `SerialNumbers` linked to the GRN line (`GoodsReceivedNoteItemId`), warranty months from
   `Product.WarrantyMonths` (D08). A product in a serial-tracked category must declare exactly as
   many serials as accepted units (**400**); a serial already in stock → **409**;
4. rejected units go to the `Defective` warehouse and become an auto-created purchase return;
5. adds `accepted` to `PurchaseOrderItem.ReceivedQuantity` and moves the PO to
   `PartialReceived`/`Received`;
6. publishes `POReceivedEvent` (supplier payable + AP invoice are W2-14's consumer).

Response: `{grnId, documentNumber, purchaseOrderId, poStatus, acceptedTotal, rejectedTotal,
serialsCreated, purchaseReturnId, lines:[{productId, productName, acceptedQty, rejectedQty,
unitCost, averageCostAfter, warehouseId}]}`.

Uninspected lines (`accepted == rejected == 0`) are treated as fully accepted, so the
"skip inspection" flow still works.

## 4. Quick receive (D10) — `POST /api/inventory/receipts/quick`

Permission `Inventory.QuickReceive`. For stock bought over the counter with no purchase order.
Body: `{supplierId? | newSupplier:{name, code?, contactPerson?, phone?, email?, address?},
warehouseId?, notes?, items:[{productId, productName?, quantity, unitCost, serialNumbers?}]}`.

One transaction creates an already-approved PO (`Sent`, approver = the receiver) plus a confirmed
GRN against it and then follows §3 exactly — cost, serials, PO status and `POReceivedEvent` all
still happen. A supplier is mandatory, `unitCost > 0` is mandatory on every line (**400**).
→ **201** `{purchaseOrderId, purchaseOrderNumber, receipt:{…§3 response…}}`.

## 5. Purchase requisition — `/api/inventory/purchase-requisitions`

GET (paged, `?status=`) · GET `{id}` · POST · POST `{id}/submit|approve|reject|cancel` ·
POST `{id}/convert-to-po`. Group permission set `PurchaseOrders` (GET → `ViewPurchaseOrder`,
POST → `CreatePurchaseOrder`).

POST body `{items:[{productId, productName, quantity, notes?}], urgency, reason?}`.
`urgency` ∈ `Low | Medium | High | Urgent` (**there is no `Normal`**). Status ∈
`Draft | Submitted | Approved | Rejected | ConvertedToPO | Cancelled`. Requester comes from the JWT;
the requester may not approve their own requisition (**403**). Number `PR-yyyyMM-#####`.
`convert-to-po` validates the supplier and stamps a real PO number.

## 6. RFQ — `/api/inventory/rfq`

GET (paged) · GET `{id}` (rfq + quotations) · POST · POST `{id}/send-to-suppliers` ·
POST `{id}/quotations` · GET `{id}/comparison` · POST `{id}/award/{quotationId}` · POST `{id}/cancel`.
Group permission set `PurchaseOrders`. Number `RFQ-yyyyMM-#####`. Awarding creates a PO with a real
PO number and links the quotation.

## 7. Purchase return — `/api/inventory/purchase-returns`

GET (paged, `?status=&supplierId=`, joined supplier + GRN number) · GET `{id}` · POST ·
POST `{id}/confirm|accept|accept-refund|cancel`. Group permission set `PurchaseOrders`.
Lifecycle `Draft → Sent → Accepted → Refunded | Cancelled`. Number `RET-yyyyMM-#####`.
`accept-refund` accepts `{refundAmount}` or `{amount}` (the SPA sends the latter).

## 8. Landed cost — `/api/inventory/grn/{grnId}/landed-costs`

GET · POST `{type, description?, amount, method}` · POST `allocate`. Permission set `Inventory`.
Allocation (`ByValue | ByWeight | ByQuantity`) resolves the stock row by
`(product, variant, warehouse)` — the same key the ledger uses — and adjusts `AverageCost` without
touching quantity. Idempotent: an already-allocated cost is skipped.

## 9. Supplier scorecard — `/api/inventory/suppliers/{id}/scorecard`

`GET /api/inventory/suppliers/scorecards` (all, `?from=&to=`) and `GET /api/inventory/suppliers/{id}/scorecard`.
Read-only aggregation over PO/GRN history (on-time delivery, reject rate). Permission set `Suppliers`.
