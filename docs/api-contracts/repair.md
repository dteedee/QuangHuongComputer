# Repair API contract (W2-13)

Module: `backend/Services/Repair`. Base paths: `/api/repair` (customer/guest), `/api/repair/tech`
(technician), `/api/repair/admin` (staff). Errors follow `docs/api-conventions.md` shape unless
noted. Money in VND, no decimals.

## Bookings (`ServiceBooking`)

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/repair/book` | `Policy.Authenticated` | Customer creates a booking. Body picks `serviceTypeId` from the catalog (legacy `serviceType: InShop/OnSite` still accepted → seed rows `IN_SHOP`/`ON_SITE`). A catalog row with `isOnSite=true` requires `Warranty.OnsiteEnabled=true` (else 400), address + `locationType`, and `OnSiteFee` = `Warranty.OnsiteFeeVnd`. Assigns `bookingNumber` `LH-yyyyMM-#####` (`IDocumentNumberService`, type `lh`). **Slot capacity** checked server-side: 409 `CONFLICT` "Khung giờ này đã kín lịch" when the (day, slot) already holds `capacity` Pending/Approved/Converted bookings. |
| GET | `/api/repair/booking-slots?date=yyyy-MM-dd` | `Policy.Authenticated` | `{date, slots:[{slot, capacity|null, remaining|null, isFull}]}` — `null` = unlimited. Advisory only; POST re-checks. |
| GET | `/api/repair/bookings` | `Policy.Authenticated` | Caller's own bookings (+ `bookingNumber`, `serviceTypeId`, `serviceTypeName`). |
| GET | `/api/repair/bookings/{id}` | `Policy.Authenticated` | Own booking only. |
| GET | `/api/repair/admin/bookings?status=&search=&page=&pageSize=` | `Repair.ViewAll` | `search` matches booking number, phone, name (ILIKE). |
| PUT | `/api/repair/admin/bookings/{id}/approve` | `Repair.UpdateStatus` | Pending → Approved, else 409. |
| PUT | `/api/repair/admin/bookings/{id}/reject` | `Repair.UpdateStatus` | Body `{reason}`. Pending → Rejected, else 409. |
| PUT | `/api/repair/admin/bookings/{id}/no-show` | `Repair.UpdateStatus` | **New.** "Khách không đến": Pending/Approved → `NoShow`, only when the appointment day (VN date) has come; else 409. Sets `noShowAt`, frees the slot. |
| POST | `/api/repair/admin/bookings/{id}/convert` | `Repair.CreateQuote` (POST verb) | Pending/Approved → Converted + `WorkOrder` (carries `serviceTypeId`). Else 409. |
| GET | `/api/repair/onsite-fee` | anonymous | `{enabled, feeVnd}` (IR#54). |

`BookingStatus` (int): `Pending=0, Approved=1, Rejected=2, Converted=3, NoShow=4`.
Transitions: Pending → Approved | Rejected | Converted | NoShow; Approved → Converted | NoShow; the
other three are terminal.

**Slot capacity.** `Repair.BookingSlotCapacity.{Morning|Afternoon|Evening}` → fallback
`Repair.BookingSlotCapacity` → default `5`; `<= 0` = unlimited. Concurrency-safe: the insert runs in
one transaction that first takes `pg_advisory_xact_lock('REPR', yyyyMMdd*10+slot)`, then counts, then
inserts — two requests for the same (day, slot) serialise on the lock (integration test: capacity+2
simultaneous requests ⇒ exactly `capacity` accepted, 2 × 409). `PreferredDate` is stored as the
calendar day (00:00 UTC kind) — the slot is `PreferredTimeSlot`.

## Repair service catalog (`RepairServiceType`)

Replaces the hard-coded `ServiceType` enum as the thing a customer picks. Columns: `code` (unique,
`[A-Z0-9_-]`, upper-cased), `name`, `description`, `basePrice` (VAT-inclusive integer VND — pre-fills a
quote line), `estimatedMinutes`, `isOnSite`, `sortOrder`, `isActive`. Seeded `IN_SHOP`
(`5e7a1c00-…-0001`) and `ON_SITE` (`…-0002`); every existing booking/work order was mapped from its
enum value. The enum column `ServiceType` stays, **derived** from `isOnSite`, for old queries.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/repair/service-types` | anonymous (allow-list) | Active rows, sorted: `{id, code, name, description, basePrice, estimatedMinutes, isOnSite}`. |
| GET | `/api/repair/admin/service-types` | `Repair.ViewAll` | All rows incl. inactive. |
| POST | `/api/repair/admin/service-types` | `Repair.ManageServiceTypes` | 201. Duplicate code → 409 with field error `code`. |
| PUT | `/api/repair/admin/service-types/{id}` | `Repair.ManageServiceTypes` | Full update (same body as POST). |
| DELETE | `/api/repair/admin/service-types/{id}` | `Repair.ManageServiceTypes` | 204; 409 when any booking, work order or quote line references it — deactivate instead. |

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
| PUT | `/api/repair/tech/work-orders/{id}/intake` | `Repair.UpdateStatus` + manager/assigned tech | **New.** Body `{priority, deviceType?, deviceBrand?, deviceModel?, serialNumber?, accessoriesReceived: string[], serviceTypeId?}`. 409 on Cancelled/Delivered. |
| POST | `/api/repair/tech/work-orders/{id}/intake-photos` | same | **New.** multipart `files` (≤10/request, ≤20 per work order). Validated with `FileValidator.ValidateImage` (the media library's validator: extension + MIME + magic bytes, ≤5MB, JPG/PNG/GIF/WebP), all files checked before any is written; stored via `IFileStorage` area `repair`. Returns `{intakePhotoUrls}`. |
| DELETE | `/api/repair/tech/work-orders/{id}/intake-photos?url=` | same | **New.** Only a URL that belongs to this work order (404 otherwise); deletes the file too. |
| POST | `/api/repair/tech/work-orders/{id}/progress-photos` | same | **New.** multipart `files` + `stage` (`Before`/`After`) + `note?` → one `WorkOrderActivityLog` with `photoStage` + `photoUrls`. |

Intake fields on `WorkOrder`: `priority` (`Low=0, Normal=1, High=2, Urgent=3`; existing rows =
Normal), `deviceType`, `deviceBrand`, `deviceModel`, `accessoriesReceived` (text[]),
`intakePhotoUrls` (text[]), `serviceTypeId`. Admin list takes `?priority=`. The tech detail
(`GET /api/repair/tech/work-orders/{id}`) returns them plus `serviceTypeName`, `currentQuoteId`,
`quotes[]` (full quote DTO with lines, newest first), parts with `serialNumber`/`unitCost`/`isBoughtIn`,
and logs with `photoStage`/`photoUrls`. The customer `GET /api/repair/work-orders/{id}` now returns
`currentQuoteId` (it did not, so the customer could never load the quote to approve it).

`WorkOrderStatus` (int): `Requested=0, Assigned=1, Declined=2, Diagnosed=3, Quoted=4,
AwaitingApproval=5, Approved=6, Rejected=7, InProgress=8, OnHold=9, Completed=10, Cancelled=11,
ReadyForPickup=12 (new), Paid=13 (new), Delivered=14 (new, terminal)`.

## Public ticket tracking (guest, no login)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/repair/track/{ticketNumber}?phone=` | **W2-13 new.** Rate-limited (`contact` policy). Matches ticket + normalised phone against the linked `ServiceBooking.CustomerPhone`. Returns `{ticketNumber, deviceModel, status, createdAt/startedAt/finishedAt, quote, timeline[{activity, description, createdAt}]}` where `quote` = current quote `{quoteNumber, status, validUntil, subtotalAmount, discountTotal, netAmount, vatAmount, vatRate, totalCost, lines[{sequence, kind, description, quantity, unitPrice, discount, lineTotal}]}` (no internal ids, no cost prices) - no customer id, no other PII. 404 (same shape) whether the ticket doesn't exist or the phone doesn't match. **Gap:** a walk-in `WorkOrder` with no `ServiceBookingId` cannot be tracked this way yet - Repair does not own a customer-phone field of its own on `WorkOrder`. |

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
| POST | `/api/repair/tech/work-orders/{id}/parts` | Body `{inventoryItemId?, partName, quantity, unitPrice, partNumber?, serialNumber?, unitCost?}`. **Stock part** (`inventoryItemId` set): calls `IStockLedger.ReserveAsync` (via `RepairStockService`) BEFORE persisting; insufficient stock / unknown item → 400, nothing persisted. **Bought-in part** (`inventoryItemId` null): `unitCost` (cost price) required, **never touches the stock ledger** — not reserved here, not committed on `/complete`, not released on remove/cancel. |
| DELETE | `/api/repair/tech/work-orders/{id}/parts/{partId}` | **W2-13**: releases the matching reservation first (skipped if the order is already `Completed` - those parts are a real stock-out, not a reservation). |

`IInventoryService` (dead HTTP client pointed at `localhost:5001`, never reachable) is **deleted**.
`Repair.csproj` now references `Inventory.csproj` directly (one direction only) and calls
`IStockLedger`/`InventoryDbContext` in-process via `Repair.Services.RepairStockService`.

## Quotes (`RepairQuote` + `RepairQuoteLine`)

A quote is a list of lines + an optional quote-level discount. **All money is computed by the
server** (`Repair.Domain.RepairQuoteCalculator`); the SPA shows the preview endpoint's numbers while
editing and never sums anything.

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/repair/work-orders/{id}/quote/preview` | `Authenticated` + `Repair.CreateQuote`; manager or the assigned technician | Same body as create; returns totals + per-line amounts, saves nothing. |
| POST | `/api/repair/work-orders/{id}/quote` | same | Work order must be `Diagnosed`/`Quoted` (else 409). Becomes the work order's current quote; status → `Quoted`. Returns `{quoteId, quoteNumber, totalCost, validUntil, quote}`. |
| PUT | `/api/repair/quotes/{id}` | `Authenticated` + `Repair.UpdateStatus`; manager/assigned tech | Replaces every line + discount + hours/rate/description/notes. Pending quotes only (409). |
| PUT | `/api/repair/quotes/{id}/await-approval` | same | `Quoted` → `AwaitingApproval`. |
| GET | `/api/repair/quotes/{id}` | `Authenticated`; owner customer or repair staff | Full DTO with lines. Marks an overdue Pending quote `Expired`. |
| PUT | `/api/repair/quotes/{id}/approve` | `Authenticated`; **owner customer only** | Only the work order's current quote (409 otherwise, or when not Pending/expired). Work order → `Approved`, `estimatedCost` = quote total. |
| PUT | `/api/repair/quotes/{id}/reject` | same | Body `{reason}` (required). Work order → `Rejected`. |

Request body (create / update / preview):

```json
{
  "lines": [
    { "kind": "Part", "description": "Bản lề (cặp)", "quantity": 2, "unitPrice": 350000, "inventoryItemId": "…" },
    { "kind": "Labor", "description": "Công thay bản lề", "quantity": 1.5, "unitPrice": 200000 },
    { "kind": "Service", "serviceTypeId": "…", "quantity": 1, "lineDiscount": 50000 }
  ],
  "discountAmount": 100000, "estimatedHours": 1.5, "hourlyRate": 200000,
  "description": "…", "notes": "…"
}
```

`kind`: `Part | Labor | Service | Other`. A line with `serviceTypeId` and no `unitPrice` /
`description` takes the catalog `basePrice` / `name`. `inventoryItemId`/`productId` are kept only on
`Part` lines (reference only — a quote never reserves stock). Legacy clients may still send
`{partsCost, laborCost, serviceFee}` without `lines`; they are turned into up to 3 lines.

Math (D01, same rules as sales orders): prices/discounts are integer VND **VAT-inclusive**
(fractional đồng → 400); quantity > 0, ≤ 2 decimals. `gross = round(unitPrice × qty, AwayFromZero)`;
line discount ≤ gross; the quote discount (≤ Σ(gross − lineDiscount)) is allocated pro rata to
`gross − lineDiscount` with `DiscountAllocator` (floor + largest remainder, exact sum); VAT is split
per line with `VietnameseTaxEngine.ExtractVatLine` (net = round(total/(1+r)), vat = remainder, so
Σ(net+vat) = total exactly). One VAT rate per quote (a repair incl. fitted parts is one service):
statutory rate from SystemConfig tax settings, reduced per the NQ 204/2025 window when
`Repair.VatReductionEligible` (default `true`). Validation errors are field errors
(`lines[2].unitPrice`, `discountAmount`, …).

Response (`RepairQuoteDto`): `id, quoteNumber, workOrderId, status, subtotalAmount,
lineDiscountTotal, discountAmount, discountTotal, netAmount, vatAmount, vatRate, partsCost,
laborCost, serviceFee, totalCost, estimatedHours, hourlyRate, description, notes, validUntil,
approvedAt, rejectedAt, rejectionReason, createdAt, isExpired, lines[]` with each line
`{id, sequence, kind, description, inventoryItemId, productId, serviceTypeId, quantity, unitPrice,
lineDiscount, grossAmount, allocatedDiscount, totalDiscount, lineTotal, vatRate, netAmount,
vatAmount}`. `partsCost` = Σ Part line totals, `laborCost` = Σ Labor, `serviceFee` = Σ Service +
Other — all after discounts — so `totalCost = partsCost + laborCost + serviceFee` as before.

Migration `20260927091000_AddRepairQuoteLines` split every existing quote's
PartsCost/LaborCost/ServiceFee into lines (qty 1, rounded to the đồng, treated as VAT-inclusive at 8%
inside the reduction window else 10%); an all-zero quote got one `Other` 0 ₫ line.

**Commission (HR).** `IRepairCommissionSourceQuery` (read contract, merged from the commission track)
bases technician commission on labour + service: when the work order has an **approved current
quote**, `LaborAmount = quote.laborCost`, `ServiceFeeAmount = quote.serviceFee` (after discounts,
VAT-inclusive; Part lines never count); otherwise the work order's `LaborCost`/`ServiceFee` as before.

Printable view: backoffice route `/backoffice/tech/quotes/{id}/print` (A4, customer/technician
signature boxes).

## Config keys (`IAppSettings`)

| Key | Type | Default | Used by |
|---|---|---|---|
| `Warranty.OnsiteEnabled` | bool | `false` | Gates `ServiceType.OnSite` bookings (shared with warranty on-site, D08 §3). |
| `Warranty.OnsiteFeeVnd` | decimal | `0` | `ServiceBooking.OnSiteFee` when on-site is enabled. |
| `Repair.DefaultLaborRateVnd` | decimal | `100000` | `Technician.HourlyRate` when not specified on create. |
| `Repair.BookingSlotCapacity` | int | `5` | Bookings per (day, time slot); `<= 0` = unlimited. |
| `Repair.BookingSlotCapacity.{Morning,Afternoon,Evening}` | int | falls back to the key above | Per-slot override. |
| `Repair.QuoteValidityDays` | int | `7` | `validUntil` of a new quote. |
| `Repair.VatReductionEligible` | bool | `true` | Apply the NQ 204/2025 2-point VAT reduction to repair quotes. |

> **Caveat:** no module registers an `IAppSettingsStore` yet (`AddAppSettings` falls back to
> `EmptyAppSettingsStore`), so every `IAppSettings` key — these included — currently resolves to its
> compile-time default. Editing SystemConfig rows has no effect until a store is registered.

## Known gaps (not built this track - see report Unresolved)

- Dedicated staff walk-in intake screen (customer lookup/create by phone, deposit, printable
  receipt). Device/serial/accessories/photos/priority now exist on the work order (edited from the
  work-order page), but creating a walk-in ticket for a customer is still not built.
- Booking-number lookup on the public tracking page (only work-order tickets are trackable).
- Technician completion via `PUT /tech/work-orders/{id}/status {Completed}` does not commit reserved
  stock parts (only `PUT /admin/work-orders/{id}/complete` does) — pre-existing.
- Public/guest-capable `POST /book` (today requires login) and its `contact` rate limit.
- Endpoint file split to <200 LOC for `RepairEndpoints.cs`, `QuoteEndpoints.cs`,
  `BookingEndpoints.cs` (pre-existing debt, IR#30/W0-11).
- Dead-parts-to-`KHO-LOI` restock flow (D09) - no "mark part defective" action exists yet.
- Technician deactivate/soft-delete as a distinct action from `isAvailable=false`.
- Serial timeline read-only query service (W2-5 dependency).
- `RepairCompletedEvent` publish added; no consumer wired yet (Communication/CRM could notify the
  customer - out of this track's ownership).
