# Warranty API contract (W2-6)

Module: `backend/Services/Warranty`. Base paths: `/api/warranty` (customer), `/api/warranty/admin`
(staff), `/api/warranty/rma`, `/api/warranty/loaner-devices`, `/api/public/warranty` (anonymous).
Errors follow `docs/api-conventions.md` shape unless noted. Money: this module carries no prices
(D08 refund-depreciation config is read but never a computed VND amount here - see Unresolved in
`plans/260917-2100-full-system-overhaul/reports/w2-6-report.md`).

## Coverage (`ProductWarranty`)

D08 (binding): months resolve `Product.WarrantyMonths` -> leaf category policy -> parent category
(recursive) -> DEFAULT policy; 0 months = no warranty record created. Validators: 0-120 months,
`PurchaseDate <= today`.

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/warranty/register` | `Warranty.ReviewClaim` | Staff manual/backfill registration (historical orders - forward path is the consumer below). |
| GET | `/api/warranty/lookup/serial/{serial}` | `Policy.Authenticated` + owner-or-staff | Coverage + claim history for a serial. **Fixed this pass:** previously ANY signed-in customer could read another customer's claim history by guessing a serial (no ownership check) - now 403s like `POST /claims` already did (W0-3). |
| GET | `/api/warranty/lookup/invoice/{orderNumber}` | `Policy.Authenticated` + owner-or-staff | All warranties for an order. Same fix. |
| GET | `/api/warranty/lookup/{serial}` | `Policy.Authenticated` | Legacy minimal shape (status/expiry only, no claim history/PII - left open, lower risk). |
| GET | `/api/warranty/admin/warranties` | `Warranty.ViewAll` | Paged (`?page&pageSize`, total in `X-Total-Count`; body stays an array - FE (`admin-claims.ts`) reads it directly). |
| GET | `/api/warranty/admin/claims/eligible-serials` | module permission | Active, unexpired serials with no open claim - for LoanerDevice assignment (`?q=` filter). |
| GET | `/api/warranty/admin/serial-timeline/{serial}` | module permission | **New.** Every `ProductWarranty` + `WarrantyClaim` + linked `WarrantyRma` for a serial - for W2-5's serial detail page. |

### `OrderFulfilledConsumer` (all channels)

Activates warranty on `OrderFulfilledEvent` for online-paid, COD-delivered and POS, per D08. For
each line item and each provider (Manufacturer, Store): resolves months via
`WarrantyPolicyResolver`; 0 months skips silently; a serialed unit gets one record per serial, an
unserialed unit gets a composite code `QH-{orderNumberFallback}-{line}-{seq}` printed on the
invoice. **Known gap:** `OrderFulfilledEvent` has no `OrderNumber` field yet (IR-1) and only
`Sales.OrderPaidConsumer` publishes it today - COD delivery and POS sale do not (IR-2). Until
those land, every warranty's `OrderNumber` is a truncated `OrderId` fallback and only the
online-paid channel activates warranties at all. See report "Unresolved".

## Policies (`WarrantyPolicy`, `WarrantySlaPolicy`)

Two layers, never mixed (D08 §4): the **published** deadline (printed on the receipt, the legal
trigger for replace-or-refund) vs. the **internal SLA** (ops target, never printed).

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/warranty/policies/effective?productId=` | anonymous | `{Manufacturer:{months,policyId,source}, Store:{...}}` - PDP/claim-wizard read this. No PII. |
| GET | `/api/warranty/policies/public-matrix` | anonymous | All active policies, DEFAULT last. No PII. |
| GET/POST/PUT/DELETE | `/api/warranty/admin/policies[/{id}]` | module permission | **New.** CRUD for `WarrantyPolicy` (coverage duration by category). Unique active `(CategoryId, Provider)` enforced at 409 before the DB constraint. |
| GET/POST/PUT | `/api/warranty/admin/sla-policies[/{id}]` | module permission | Internal SLA target CRUD (hours to warning-percent). Never surfaced to customers. |

D08 category matrix seed (`WarrantyPolicySeeder`): laptop 12mo, PC Gaming/PC Đồ họa 24mo (Store),
linh-kien-may-tinh 24mo (conservative - catalog has no CPU/Mainboard/RAM/PSU/VGA/SSD sub-categories
yet, see seeder doc comment), màn hình/thiết bị mạng/camera 24mo, gaming-gear/loa-mic-webcam 12mo,
phụ kiện 6mo. Runs at API startup via `DatabaseMigrationRunner`; **not yet re-verified against a
fresh TEST clone** - see report "Unresolved" (TEST's `Categories.Slug` values differed from DEV's
when checked, likely other tracks' concurrent probes; matrix slugs match DEV).

## Claims (`WarrantyClaim`)

Lifecycle: `Pending -> Approved -> InProgress -> Resolved`, or `Rejected` from `Pending`/`Approved`.
`Resolve` accepts both `Approved` and `InProgress` (W0-3 fix - `AssignHandling` moves to
`InProgress` and the old guard only accepted `Approved`, so every assigned claim was stuck).

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/warranty/claims` | `Policy.Authenticated` | Owner or staff only (W0-3: 403 if the caller doesn't own the serial). Duplicate-claim guard (same serial+issue, open status) -> 409. |
| GET | `/api/warranty/claims` | `Policy.Authenticated` | Caller's own claims. |
| GET | `/api/warranty/admin/claims` | `Warranty.ViewAll` | Paged, `?status&serialNumber` filters, total in `X-Total-Count`. |
| GET | `/api/warranty/admin/claims/{id}` | `Warranty.ViewAll` | Includes linked `ProductWarranty` snapshot + D08 actor/time fields. |
| GET | `/api/warranty/admin/claims/stats` | `Warranty.ViewAll` | Counts by status + today's new/resolved. |
| POST | `/api/warranty/admin/claims/{id}/approve` | `Warranty.ReviewClaim` | `Pending -> Approved`. Records `ApprovedBy` (caller's user id). |
| POST | `/api/warranty/admin/claims/{id}/reject` | `Warranty.ReviewClaim` | Body `{Reason}`. Any non-terminal status -> `Rejected`. |
| POST | `/api/warranty/admin/claims/{id}/resolve` | `Warranty.ReviewClaim` | Body `{Notes}`. `Approved`/`InProgress` -> `Resolved`. Records `ResolvedBy`; returns `ResolvedClaimCountForSerial` and `EligibleForReplaceOrRefund` (D08 "3 lần" rule - a query, not a stored flag). |
| POST | `/api/warranty/admin/claims/{id}/assign` | `Warranty.ReviewClaim` | Body `{ClaimType, WorkOrderId?, RmaId?, LoanerDeviceId?}`. `Approved -> InProgress`, sets SLA deadline from `WarrantySlaPolicy`, stamps `DeviceReceivedAt`, and now also stamps `CommittedTurnaroundDays` from `ClaimActionEndpoints.PublishedTurnaroundDaysFor` (the legally-printed number - RepairAtShop 15d, SendToManufacturer 30d, ExchangeNew 3d - never the internal SLA hours). |
| GET | `/api/warranty/admin/claims/{id}/receipt` | `Warranty.ReviewClaim` | Printable receipt DTO (JSON; FE renders + prints). |

D08 §4 "hai lớp thời gian": `Claims.DeviceReceivedAt/DeviceReturnedAt` + `CommittedTurnaroundDays`
(the number printed on the receipt - the legal trigger) are on the entity and now set by
`/assign` (fixed this pass - previously always null even though the column existed).

## RMA (`WarrantyRma`) — `/api/warranty/rma`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/warranty/rma` | module permission | Paged, `?status` filter, total in `X-Total-Count`. |
| GET | `/api/warranty/rma/{id}` | module permission | |
| POST | `/api/warranty/rma` | `Warranty.ReviewClaim` | Body `{SupplierId, Items[], RmaNumber?, ExpectedReturnDate?, ExternalRmaCode?, Notes?}`. |
| POST | `/api/warranty/rma/{id}/send` | `Warranty.ReviewClaim` | `Draft -> Sent`. |
| POST | `/api/warranty/rma/{id}/receive` | `Warranty.ReviewClaim` | `Sent -> Received`. Body `{Result, Notes?}`. |
| POST | `/api/warranty/rma/{id}/close` | `Warranty.ApproveClaim` | `Received -> Closed`. **New (Implementation Step 4 "auto-progress ... an RMA closes"):** every `WarrantyClaim` linked via `LinkRma` auto-`Resolve`s, and the RMA's `SentDate..ActualReturnDate` span is added to the matching `ProductWarranty` via `ExtendForServiceTime` (D08 §4 - service time is added back to the warranty, never subtracted). |
| GET | `/api/warranty/rma/overdue` | module permission | Sent, past `ExpectedReturnDate`, not yet returned. |

**Known gap:** RMA items are still `WarrantyRma.ItemsJson` (a JSON blob), not the rows the phase
spec's Todo asks for (`SerialNumberId`, `ClaimId` columns). W0-11 already stops it 500ing the page
(`ParseItems` never throws on malformed/empty JSON) - see report "Unresolved" for why turning this
into a real child table was not attempted in this pass.

## Loaner devices (`LoanerDevice`) — `/api/warranty/loaner-devices`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/warranty/loaner-devices` | module permission | Paged, `?status` filter, total in `X-Total-Count`. |
| GET | `/api/warranty/loaner-devices/{id}` | module permission | |
| POST | `/api/warranty/loaner-devices` | `Warranty.ReviewClaim` | Body `{SerialNumberId, SerialNumber, CustomerId, WarrantyClaimId, ExpectedReturnDate, ConditionAtLoan, Notes?}`. |
| POST | `/api/warranty/loaner-devices/{id}/return` | `Warranty.ReviewClaim` | Body `{ConditionAtReturn, Notes?}`. |
| POST | `/api/warranty/loaner-devices/{id}/lost` | `Warranty.ReviewClaim` | Body `{Notes?}`. |
| GET | `/api/warranty/loaner-devices/overdue` | module permission | `Loaned` past `ExpectedReturnDate`. |

## Public lookup — `/api/public/warranty` (anonymous)

D08 §9 / Implementation Step 10 (binding). PII-free: never returns customer name, address or
phone. Rate limited by the platform limiter (`RateLimitingSetup.LookupPolicy` = `"lookup"`,
registered in `ApiGateway`), keyed on the real client IP as resolved by `UseForwardedHeaders`
(trusted proxies only - not a raw, spoofable `X-Forwarded-For` read).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/public/warranty/lookup?serial=` | `{found, warranties:[{provider,isValid,expiresAt}], activeClaim?}`. `expiresAt` is date-only (no time) to reduce fingerprinting. |
| GET | `/api/public/warranty/lookup-by-phone?phone=&orderNumber=` | `{found, count?}` only - never warranty detail. **Fixed this pass:** now actually verifies `phone` against the order's customer `ApplicationUser.PhoneNumber` (normalized, `84`-prefix collapsed to `0`); the previous version accepted the `phone` parameter but never checked it, so anyone who knew a public order number "matched" regardless of what phone they typed. |

**Removed this pass:** the in-memory per-instance rate counter (`ConcurrentDictionary`, does not
survive multiple API instances, no standard `Retry-After`) and the fake CAPTCHA (`requiresCaptcha`
accepted any non-empty string as proof - no real verification, no provider integrated in the repo).
The phase spec allowed either "a real captcha" or "the captcha claim removed"; no captcha provider
exists in this codebase, so the claim was removed rather than left fake.

## Config keys (`IAppSettings`, D08 §4)

`Warranty.RefundDepreciationPercentPerMonth` (default `0`), `Warranty.RefundDepreciationFreeMonths`
(default `12`) - defined by D08 as an **owner/lawyer decision**, deliberately not read by any
endpoint in this pass (no refund-amount computation exists yet to read them into - see report
"Unresolved"). No warranty-side money default is hardcoded in a domain constructor.

## Permissions

`Warranty.ViewAll` (GET), `Warranty.ReviewClaim` (POST/PUT), `Warranty.ApproveClaim` (DELETE/RMA
close), `Warranty.SubmitClaim`/`Warranty.ViewOwn` (customer branch), `Warranty.Moderate` (not wired
to an endpoint in this module - reserved for claim attachment moderation, unused today).

## Startup authorization audit

`[authz-audit]` (`BuildingBlocks/Security/EndpointAuthorizationAuditor.cs`) only runs against the
live route table at API startup, which this pass could not trigger (D12: only the orchestrator
restarts :5000/:5050). Not independently re-verified against `[authz-audit]` output this pass -
manually confirmed instead that every write endpoint in this module's files carries either an
explicit `.RequireAuthorization(Permissions.Warranty.X)` or sits inside a
`.RequireModulePermissions(PermissionModules.Warranty)` group; nothing relies on a bare role
string. Gate should re-check the `[authz-audit]` log after restart.
