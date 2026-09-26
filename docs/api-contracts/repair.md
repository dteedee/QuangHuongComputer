# Repair API contract (W2-13)

Module: `backend/Services/Repair`. Base paths: `/api/repair` (customer/guest), `/api/repair/tech`
(technician), `/api/repair/admin` (staff). Errors follow `docs/api-conventions.md` shape unless
noted. Money in VND, no decimals.

## Bookings (`ServiceBooking`)

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/repair/book` | `Policy.Authenticated` | Customer creates a booking. `OnSite` requires `Warranty.OnsiteEnabled=true` (else 400) and `OnSiteFee` = `Warranty.OnsiteFeeVnd` config value (IR#54 - was hardcoded 50.0m). |
| GET | `/api/repair/bookings` | `Policy.Authenticated` | Caller's own bookings. |
| GET | `/api/repair/bookings/{id}` | `Policy.Authenticated` | Own booking only. |
| GET | `/api/repair/admin/bookings` | `Permissions.Repair.ViewAll` | Paged, `?status=` filter. |
| PUT | `/api/repair/admin/bookings/{id}/approve` | `Permissions.Repair.ViewAll` | Pending -> Approved. |
| PUT | `/api/repair/admin/bookings/{id}/reject` | `Permissions.Repair.ViewAll` | Body: `{reason}`. |
| POST | `/api/repair/admin/bookings/{id}/convert` | `Permissions.Repair.ViewAll` | Creates the `WorkOrder`. |
| GET | `/api/repair/onsite-fee` | anonymous | `{enabled, feeVnd}` - effective on-site config for the storefront (IR#54). |

## Work orders / intake (`WorkOrder`)

Walk-in intake reuses `POST /api/repair/work-orders` (customer-authenticated path) today; a
dedicated staff walk-in intake screen (customer lookup by phone, receipt DTO,
`IDocumentNumberService` ticket numbering) is **not yet built** - see Unresolved in
`plans/260917-2100-full-system-overhaul/reports/w2-13-report.md`. `TicketNumber` is currently
generated inline in the `WorkOrder` constructor (`TKT-yyyyMMdd-XXXXXX`), not via
`IDocumentNumberService`.

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/repair/work-orders` | `Policy.Authenticated` | Customer-initiated. |
| GET | `/api/repair/work-orders`, `/{id}` | `Policy.Authenticated` | Own orders only. |
| GET | `/api/repair/admin/work-orders`, `/{id}` | `Permissions.Repair.ViewAll` | Paged, `?status=`. |
| PUT | `/api/repair/admin/work-orders/{id}/assign` | `Permissions.Repair.AssignTechnician` | Re-assign allowed until `InProgress` (W0-11). |
| PUT | `/api/repair/admin/work-orders/{id}/start` | `Permissions.Repair.UpdateStatus` | Assigned/Approved -> InProgress. |
| PUT | `/api/repair/admin/work-orders/{id}/complete` | `Permissions.Repair.Complete` | **W2-13**: commits every reserved part via `IStockLedger.CommitAsync` (reason `RepairPart`) before flipping to `Completed`; publishes `RepairCompletedEvent`. |
| PUT | `/api/repair/admin/work-orders/{id}/cancel` | `Permissions.Repair.UpdateStatus` | **W2-13**: releases every still-reserved part via `IStockLedger.ReleaseAsync`. No-op on the ledger if the order was already `Completed` (parts already committed). If the order had been paid, it publishes `RepairWorkOrderSettlementChangedEvent`, and HR reverses or claws back the technician commission (`hr-commission.md`). |
| PUT | `/api/repair/admin/work-orders/{id}/ready-for-pickup` | module permission | **W2-13 new.** `Completed` -> `ReadyForPickup`. |
| PUT | `/api/repair/admin/work-orders/{id}/pay` | module permission | **W2-13 new.** Body `{paymentReference?}`. `ReadyForPickup` -> `Paid`. Records money changed hands; not a payment gateway integration. Publishes `RepairWorkOrderSettlementChangedEvent`, and HR accrues the technician commission on `LaborCost + ServiceFee` (`hr-commission.md`). |
| PUT | `/api/repair/admin/work-orders/{id}/handover` | module permission | **W2-13 new.** Body `{receivedByName}`. `Paid` -> `Delivered` (terminal), records receiver name + acting staff id + timestamp. |
| GET | `/api/repair/admin/stats` | module permission | Unchanged. |

`WorkOrderStatus` (int): `Requested=0, Assigned=1, Declined=2, Diagnosed=3, Quoted=4,
AwaitingApproval=5, Approved=6, Rejected=7, InProgress=8, OnHold=9, Completed=10, Cancelled=11,
ReadyForPickup=12 (new), Paid=13 (new), Delivered=14 (new, terminal)`.

## Public ticket tracking (guest, no login)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/repair/track/{ticketNumber}?phone=` | **W2-13 new.** Rate-limited (`contact` policy). Matches ticket + normalised phone against the linked `ServiceBooking.CustomerPhone`. Returns `{ticketNumber, deviceModel, status, createdAt/startedAt/finishedAt, quote summary, timeline}` - no customer id, no other PII. 404 (same shape) whether the ticket doesn't exist or the phone doesn't match. **Gap:** a walk-in `WorkOrder` with no `ServiceBookingId` cannot be tracked this way yet - Repair does not own a customer-phone field of its own on `WorkOrder`. |

## Technicians (`Technician`)

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/repair/admin/technicians` | module permission | Includes `ActiveWorkOrders` count. |
| POST | `/api/repair/admin/technicians` | module permission | `HourlyRate` optional - falls back to `Repair.DefaultLaborRateVnd` config (IR#54-style fix, was hardcoded 50.0m default parameter). |
| PUT | `/api/repair/admin/technicians/{id}` | module permission | **W2-13 new.** Body `{name, specialty, hourlyRate, isAvailable?}`. |
| — | technician deactivate (soft-delete) | — | **Not built** - `IsAvailable=false` via the PUT above is the closest equivalent today. |

`/api/repair/tech/*` (technician's own work orders: accept/decline/status/parts/log) unchanged by
this track except the parts endpoints below.

## Parts (`WorkOrderPart`) - real stock, not the old dead HTTP client

| Method | Path | Notes |
|---|---|---|
| POST | `/api/repair/tech/work-orders/{id}/parts` | **W2-13**: calls `IStockLedger.ReserveAsync` (via `RepairStockService`, resolving `InventoryItemId` -> `(ProductId, VariantId, WarehouseId)`) BEFORE persisting the part. Insufficient available stock or unknown item -> 400, nothing persisted, nothing reserved. |
| DELETE | `/api/repair/tech/work-orders/{id}/parts/{partId}` | **W2-13**: releases the matching reservation first (skipped if the order is already `Completed` - those parts are a real stock-out, not a reservation). |

`IInventoryService` (dead HTTP client pointed at `localhost:5001`, never reachable) is **deleted**.
`Repair.csproj` now references `Inventory.csproj` directly (one direction only) and calls
`IStockLedger`/`InventoryDbContext` in-process via `Repair.Services.RepairStockService`.

## Quotes (`RepairQuote`)

Unchanged endpoints (`/api/repair/tech/work-orders/{id}/quote`, `/quotes/{id}`, `/approve`,
`/reject`, `/quotes/{id}` PUT, `/await-approval`) - fixed in this track: all four
`WorkOrderActivityLog` writes were missing the explicit `db.WorkOrderActivityLogs.Add(log)` stage
(same EF graph-fixup bug as W0-11 documented on `WorkOrder.AddActivityLog`), producing a
`DbUpdateConcurrencyException` on every quote create/approve/reject/send. Fixed at all 4 call
sites (`QuoteEndpoints.cs:71-72,175-176,227-228,322-323`).

## Config keys (`IAppSettings`)

| Key | Type | Default | Used by |
|---|---|---|---|
| `Warranty.OnsiteEnabled` | bool | `false` | Gates `ServiceType.OnSite` bookings (shared with warranty on-site, D08 §3). |
| `Warranty.OnsiteFeeVnd` | decimal | `0` | `ServiceBooking.OnSiteFee` when on-site is enabled. |
| `Repair.DefaultLaborRateVnd` | decimal | `100000` | `Technician.HourlyRate` when not specified on create. |

## Known gaps (not built this track - see report Unresolved)

- Dedicated staff walk-in intake screen (customer lookup/create by phone via `IUserDirectory`,
  device+serial+accessories+condition notes+photos, deposit, `IDocumentNumberService` ticket
  numbering, printable receipt DTO).
- Public/guest-capable `POST /book` (today requires login) and its `contact` rate limit.
- Endpoint file split to <200 LOC for `RepairEndpoints.cs`, `QuoteEndpoints.cs`,
  `BookingEndpoints.cs` (pre-existing debt, IR#30/W0-11).
- Dead-parts-to-`KHO-LOI` restock flow (D09) - no "mark part defective" action exists yet.
- Technician deactivate/soft-delete as a distinct action from `isAvailable=false`.
- Serial timeline read-only query service (W2-5 dependency).
- `RepairCompletedEvent` publish added; no consumer wired yet (Communication/CRM could notify the
  customer - out of this track's ownership).
