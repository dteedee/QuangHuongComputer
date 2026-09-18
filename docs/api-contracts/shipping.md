# API contract — Shipping (W2-11)

**Owner:** W2-11 (`backend/Services/Sales/Infrastructure/Shipping/**`). Registered directly from
`backend/ApiGateway/Program.cs` (`app.MapShippingEndpoints()`), not via `ISalesSubmodule` (that
type does not exist in the codebase as of this session — the phase file's step 1 note is stale;
flagged as Unresolved below).
**Status:** written 2026-09-18. W3-2 builds the checkout shipping quote + province/ward selects
from this document; W3-10 builds the shipment/manual-tracking admin screen.

## 0. Cross-cutting rules

- **The client never sends a shipping fee.** Every quote is computed server-side from
  `netSubtotal` (post-discount goods total, already computed server-side by checkout).
- Money is VND, integer where GHN's API requires it (`cod_amount`, `insurance_value`, `weight`).
- Error shape: `docs/api-conventions.md` §1 (RFC 9457 problem+json, `code` field, Vietnamese
  `error`/`message`).

## 1. `POST /api/sales/shipping/quote`

Public (no auth — used before login at cart). Body:

```json
{ "netSubtotal": 450000, "isPickup": false, "provinceCode": "01", "wardCode": "10105001", "weightGrams": 1200 }
```

Response `200`:
```json
{ "fee": 30000, "isFreeShipping": false, "source": "flat", "estimatedDeliveryDays": null }
```

`source` ∈ `pickup` | `free_threshold` | `flat` | `ghn_live` (the last is not yet reachable — see
§4). Fee rule: `IShippingFeeCalculator` — free at/above `Shipping:FreeThreshold` (admin-editable via
`IAppSettings`/`SystemConfig`, default 500.000đ), else flat `Shipping:FlatFee` (default 30.000đ).
**This is the same policy `CheckoutOrchestrator` (W2-3) enforces at checkout** — see §5 for why they
are not (yet) the literal same code path.

## 2. `GET /api/sales/shipping/provinces`

Public, `Cache-Control: public, max-age=3600` (2025 two-tier administrative data, static per build).

```json
{ "version": "2025-07-01", "provinces": [{ "code": "01", "name": "Thành phố Hà Nội" }, ...] }
```
34 provinces, source: `phucanhle/vn-xaphuong-2025` (Nghị quyết 1211/2025, hiệu lực 01/07/2025).

## 3. `GET /api/sales/shipping/provinces/{code}/wards`

Public, same cache header. `404 NOT_FOUND` if `code` does not exist.

```json
{ "version": "2025-07-01", "provinceCode": "01", "wards": [{ "code": "10105001", "name": "Phường Hoàn Kiếm", "provinceCode": "01" }, ...] }
```
3.321 wards total across all provinces (verified: every province/ward code unique).

## 4. `POST /api/shipping/create-shipment/{orderId}`

Permission `Sales.UpdateStatus`. Body: `{ receiverName, receiverPhone, toDistrictId, toWardCode, weight? }`.

- **`Shipping:GHN:Token` / `Shipping:GHN:ShopId` not configured (the default locally)** → `200
  { "mode": "manual", message, orderStatus }`. No GHN call is made, order is **not** modified. Staff
  then calls §5.
- Configured → calls GHN `v2/shipping-order/create` with:
  - `weight` = Σ(product weight in Catalog, kg → g, default 500g when unset) × quantity.
  - `cod_amount` = 0 if `PaymentStatus = Paid`, else `order.TotalAmount` (outstanding balance —
    there is no partial-payment/deposit amount tracked on `Order` today, so "outstanding" is binary).
  - `insurance_value` = `order.TotalAmount - order.ShippingAmount` (goods value, VAT-inclusive per D01).
  - `payment_type_id` = 1 (shop pays GHN) when the order qualifies for free shipping and is not
    pickup, else 2 (receiver pays GHN on delivery) — this is who pays **GHN's** fee, unrelated to
    `cod_amount`. The old code conflated this with `PaymentStatus`; that was a bug.
  - On success: `order.MarkAsShipped` + `SetShippingTracking`, `200 { mode: "ghn", trackingCode, expectedDelivery, orderStatus }`.
  - GHN reachable but returns no order code: order is **left unchanged**, `200 { mode: "ghn", trackingCode: null, message }` — never a fake success.

## 5. `POST /api/shipping/manual-shipment/{orderId}`

Permission `Sales.UpdateStatus`. Body: `{ carrier, trackingNumber }`. Same order-status precondition
as §4; marks the order shipped with the staff-entered carrier/tracking. This is the **only** shipment
path when GHN is not configured — never a mock GHN success.

## 6. `GET /api/shipping/tracking/{orderId}`

Auth required. **IDOR closed (W1-10 handoff):** 403 unless caller is the order's customer or has
`Sales.ViewAll`. Guest (no account) tracking is a *different, already-existing* endpoint, untouched
by this track: `GET /api/sales/public/orders/track?orderNumber=&phone=`
(`Sales.Endpoints.Checkout.GuestOrderTrackingEndpoints`, W2-3) — requires both order number AND
phone, same-message-on-mismatch anti-enumeration.

## 7. `POST /api/shipping/webhook`

Anonymous, token header `Token` checked against `Shipping:GHN:WebhookToken`. Unconfigured token →
`503 SHIPPING_WEBHOOK_NOT_CONFIGURED` (fail-closed, W0-10 — unchanged by this track).

## 8. Deprecated

`POST /api/shipping/calculate-fee` (three-tier `toDistrictId`/`toWardCode`, no subtotal in the
request) is **removed**. It could not be adapted to the free/flat policy without a subtotal in its
request shape. `frontend/src/api/sales/cart-checkout.ts:215` still calls it — flagged in
integration requests; W3-2 must switch to §1 when it rebuilds the checkout UI.

## Unresolved / known gaps

1. `IShippingFeeCalculator` and `ShippingFeeCalculator` are constructed **inline per request** from
   `IAppSettings`/`IConfiguration` (both already globally DI-registered), not registered in the DI
   container — `Sales/DependencyInjection.cs` is outside this track's ownership glob. Same for
   `VnAddressReferenceService`. Functionally correct (verified: `qh-build.sh be Sales.csproj` — 0
   errors) but not the idiomatic shape; whoever next touches `DependencyInjection.cs` should register
   both as singletons and switch these endpoints to normal DI parameters.
2. **`CheckoutOrchestrator` (W2-3, `Application/Checkout/**`, not owned by this track) still calls
   `Sales.Application.Pricing.ShippingFeePolicy.Calculate(...)` directly**, which reads
   `IConfiguration` (static `appsettings.json`), not `IAppSettings` (the DB-backed, admin-editable
   table). Same free/flat numbers today, but an admin editing the threshold in the back office
   changes nothing at checkout — only `/api/sales/shipping/quote` (this track) honours a live admin
   edit. Filed as an integration request for W2-3's owner to switch the call site.
3. GHN live fee lookup (`source: "ghn_live"`) is a stub that always returns null: GHN's fee API takes
   their own `to_district_id`, and there is no verified mapping from the 2025 government ward code to
   GHN's district id, and no GHN sandbox credentials in dev to test one. Never fabricated; `flat`/
   `free_threshold` is the real, deterministic answer served today.
4. "Fallback weight per category" (phase file step 3) — `Catalog.Domain.Category` has no weight
   field. Implemented as a single global fallback (`Shipping` default 500g) instead; a per-category
   fallback needs a schema change outside this track's glob.
5. `ISalesSubmodule` (mentioned in the phase file's step 1) does not exist anywhere in the codebase —
   `MapShippingEndpoints()` is still called directly from `Program.cs`, unchanged from before this
   track.
