# API contract — CRM

**Owner:** W2-8 (`backend/Services/CRM/**` incl. `Infrastructure/Seed/**`). Out of scope for this
module: `Communication/**` + `Ai/**` (W2-15), `Reporting/**` (W2-16, incl. the recognized-revenue
predicate CRM's RFM uses — see §5 gap). **Status:** written 2026-09-18, core (§1-4, §7) rebuilt this
track; campaigns (§6), automation (§8) and validators/CSV import-export are UNCHANGED stubs — see
Unresolved. Wave 3 (W3-6) rebuilds Customer 360 / campaign editor / pipeline settings from this doc.

Error bodies today: mostly `{ "error": "<Vietnamese message>" }` (not yet RFC 9457, pre-existing
convention — not changed this track). Paging: `?page=&pageSize=` where implemented, response
`{ items, total, page, pageSize }`. Money is VND. `RequireModulePermissions` maps GET→View*,
POST/PUT/DELETE→Manage* per `ModulePermissionSet`/`SegmentPermissions`/`LeadPermissions` in
`CrmEndpoints.cs`.

## 0. What changed this track (W2-8)

- **Customer 360 has real names now.** `/api/crm/customers` (list+detail) call
  `BuildingBlocks.Contracts.IUserDirectory.GetByIdsAsync`/`SearchCustomersAsync` to fill
  `UserName`/`Email`/`Phone` and to search by name/email/phone, not just raw `UserId`. **Blocked at
  runtime** — see Unresolved §A: `IUserDirectory` is not registered in DI anywhere yet.
- **Event-driven RFM**: `CRM/Consumers/CustomerAnalyticsEventConsumers.cs` — `CustomerAnalytics`
  created on `UserRegisteredIntegrationEvent`, recalculated on `OrderCompletedEvent`, instead of
  waiting for the 02:00 UTC batch. **Blocked at runtime** — see Unresolved §B: CRM's assembly isn't
  registered with `x.AddConsumers(...)` in ApiGateway yet.
- **`POST /api/crm/analytics/recalculate`** (permission `ManageCustomers`) — on-demand full RFM +
  segment auto-assignment recalc. `RfmCalculationBackgroundService` also runs once at startup now
  (previously waited up to 24h for the first nightly run).
- **RFM batch is set-based**: `CalculateForAllCustomersAsync` was N SQL round-trips + N
  `SaveChanges` (one per customer with an order); now one `GROUP BY` query + one `SaveChanges`.
- **Lead conversion (`POST /api/crm/leads/{id}/convert`) goes through `IUserDirectory.
  ProvisionCustomerAsync`.** Deleted the raw-SQL `INSERT INTO "AspNetUsers"` (no Identity
  SecurityStamp semantics, no Customer role, and — critically — it used to call `lead.Convert()`
  even when the INSERT failed, silently pointing a "converted" lead at a UserId that doesn't
  exist). Now: aborts (returns null, nothing saved) if provisioning throws or if the lead has
  neither email nor phone; the DB write (CustomerAnalytics + `lead.Convert()` + interaction note)
  is one transaction. **Blocked at runtime** — same DI gap as §A.
- **Segment auto-assignment now removes stale members.** `ProcessAutoAssignmentForSegment` used to
  only add; a customer who dropped below a segment's RFM threshold stayed in it forever. Now also
  removes AUTO-assigned members (`IsAutoAssigned=true`) that no longer match the rule — manual
  assignments are never touched. Add+remove+`UpdateCustomerCount` in one transaction.
- **`POST /api/crm/leads` rejects when no pipeline stage exists** (`422`) instead of creating an
  orphan lead attached to no Kanban column.
- **Seed defaults** (`CRM/Infrastructure/Seed/CrmDefaultsSeeder.cs`, idempotent — only inserts when
  the table is empty): 6 pipeline stages (Mới 5% → Đã liên hệ 15% → Báo giá 40% → Đàm phán 65% →
  Thắng 100%/final-won → Thua 0%/final-lost) and 5 RFM segments (VIP, Trung thành, Có nguy cơ, Ngủ
  đông, Mới) with auto-assign rules matching `RfmCalculationService`'s thresholds. **Not wired up**
  — see Unresolved §C.
- **Click-tracking open redirect**: already fixed in a prior wave (W0-3,
  `TryResolveTrackedRedirect` — relative paths, same-host absolute, or
  `Crm:TrackingRedirectAllowedHosts`/`Cors:AllowedOrigins` allow-list; everything else 404s).
  Verified still correct, unchanged this track.

## 1. Dashboard — `/api/crm/dashboard/*` (permission `ViewCustomers`)

| Method | Path | Notes |
|---|---|---|
| GET | `/overview` | totals: customers/lifecycle buckets/revenue/leads/pipeline/tasks |
| GET | `/rfm-distribution` | recency/frequency/monetary/lifecycle histograms |

## 2. Customers (Customer 360) — `/api/crm/customers` (`PermissionModules.Crm`: View/ManageCustomers)

| Method | Path | Notes |
|---|---|---|
| GET | `` | `?searchText=&lifecycleStage=&segmentId=&minRfmScore=&maxRfmScore=&sortBy=&sortDesc=&page=&pageSize=`. `searchText` now matches name/email/phone via `IUserDirectory.SearchCustomersAsync` (falls back to raw UserId substring match) |
| GET | `/{id}` | full detail incl. segments, last 20 interactions, pending tasks |
| POST | `/{id}/interactions` | `CreateInteractionDto` |
| POST | `/{id}/segments/{segmentId}` | manual assign (`IsAutoAssigned=false`) |
| DELETE | `/{id}/segments/{segmentId}` | |
| POST | `/analytics/recalculate` | **new this track.** No body. `{ processed, autoAssigned }` |

`CustomerAnalyticsDto`/`CustomerDetailDto.UserName/Email/Phone` are populated from
`IUserDirectory` (Identity), never stored redundantly in CRM's own DB — CRM has no customer table,
`CustomerAnalytics.UserId` is the only link to Identity.

## 3. Segments — `/api/crm/segments` (View/ManageSegments)

| Method | Path | Notes |
|---|---|---|
| GET | `` / `/{id}` | |
| POST | `` | `{name, code, description?, color, sortOrder}`, 409 on duplicate code |
| PUT | `/{id}` | |
| DELETE | `/{id}` | soft (`IsActive=false`) |
| POST | `/{id}/rules` | `RuleDefinition` JSON: `{minRfmScore?, maxRfmScore?, lifecycleStages?[], minTotalSpent?, minOrderCount?}` |
| POST | `/run-auto-assignment` | now add+remove (see §0), returns count newly added |

## 4. Leads & pipeline — `/api/crm/leads`, `/api/crm/pipeline-stages` (View/ManageLeads)

| Method | Path | Notes |
|---|---|---|
| GET | `/leads` | search + filters + paging |
| GET | `/leads/pipeline` | grouped by stage, 50/stage cap |
| GET | `/leads/upcoming-followups` | `?days=7&assignedToUserId=` |
| GET / POST / PUT / DELETE | `/leads[/{id}]` | POST now `422`s with no stage configured (§0) |
| POST | `/leads/{id}/assign`, `/move-stage`, `/follow-up`, `/interactions` | |
| POST | `/leads/{id}/convert` | `{notes?}` → customer `Guid` or `404`/`null` — see §0 for the rewrite |
| POST | `/leads/{id}/mark-lost` | `{reason}` |
| GET / POST / PUT / DELETE | `/pipeline-stages[/{id}]` | |

## 5. Revenue predicate (gap, W2-3/W2-16 dependency)

`RfmCalculationService.GetOrderStatsForAllUsersAsync`/`GetOrderStatsForUser` still hardcode the
exclusion list `Status NOT IN (0,7,99)` (Pending/Draft/Cancelled) directly in raw SQL against
`Orders`, not a shared `RecognizedRevenue` helper. Phase file step 1 assigns the shared predicate to
W2-16 and asks CRM to consume it once it exists (step 5). **Not done this track** — no shared
helper existed to call at the time of writing. Filed as integration ask below.

## 6. Campaigns — `/api/crm/campaigns`, `/track/*` (View/ManageCampaigns) — UNCHANGED THIS TRACK

CRUD, schedule/unschedule/send/pause/resume, preview, recipients all exist (`EmailCampaignService`,
576 lines) but per-recipient merge-tag rendering, real consent/unsubscribe filtering at send time,
retries and the `ScheduledAt` scheduler were **not verified or rebuilt this track** — ran out of
budget after Customer 360/leads/segments (see plan's declared order-of-work: those come first).
Click-tracking redirect and the open/click/unsubscribe endpoints (§0) are the only part touched.

## 7. Tasks — `/api/crm/tasks` (`ManageTasks`)

Unchanged this track: CRUD + complete/cancel, `?customerId=`.

## 8. Automation rules — NOT REBUILT THIS TRACK

`CRM.Domain.AutomationRule` + `CRM/BackgroundServices/AutomationJobService.cs` are still the
log-only stub described in the phase file (`ProcessRuleAsync` logs `"Processing ... rule"` and does
nothing else for every trigger type). `SystemConfig.Domain.AutomationRule` is a second, competing
model (`backend/Services/SystemConfig/Domain/AutomationRule.cs`,
`AutomationRuleEndpoints.cs`) outside CRM's ownership. Phase file step 7 requires picking ONE model,
real triggers from integration events, actions, and a per-customer+rule idempotency log — not
attempted this track; flagged red in the report, not fabricated as done.

## 9. `IUserDirectory` contract (consumed, not owned)

CRM depends on `BuildingBlocks.Contracts.IUserDirectory` (`GetByIdsAsync`, `SearchCustomersAsync`,
`ProvisionCustomerAsync(fullName, phoneNumber, email)`) exactly as declared in
`backend/BuildingBlocks/Contracts/IUserDirectory.cs`. CRM's `.csproj` only references
`BuildingBlocks` + `SystemConfig` — it does NOT and must NOT reference `Identity` directly (module
boundary). See Unresolved §A for the missing DI wiring.

## Unresolved

- **§A — `IUserDirectory` unregistered.** `Identity.Services.UserDirectory` implements
  `Identity.Services.IUserDirectory` (Identity's own namespace) and IS registered
  (`Identity/DependencyInjection.cs:117`). `BuildingBlocks.Contracts.IUserDirectory` — the contract
  CRM (and this track) code against — has NO implementation registered anywhere; grep of
  `ApiGateway/Startup/ServiceRegistration.cs` for `IUserDirectory` returns nothing. Every
  `IUserDirectory` injection point added this track (customer list/detail, lead conversion) will
  fail to resolve at runtime until Identity's `UserDirectory` also implements
  `BuildingBlocks.Contracts.IUserDirectory` and ApiGateway registers it. Filed in
  `integration-requests-w2.md`.
- **§B — CRM consumers not wired.** `x.AddConsumers(typeof(CRM.DependencyInjection).Assembly)` is
  missing from `ApiGateway/Startup/ServiceRegistration.cs`'s MassTransit config (only
  Communication/Sales/Accounting/Warranty/Identity are registered there). Filed.
- **§C — CRM seeder not called.** No `ApiGateway/Startup/DatabaseMigrationRunner.cs` call to
  `CrmDefaultsSeeder.SeedAsync`, unlike every other module's seeder. Filed.
- **§D — Revenue predicate.** RFM's order-stats SQL will keep disagreeing with W2-3/Sales and
  W2-16/Reporting numbers until the shared `RecognizedRevenue` helper exists and CRM switches to
  it. Needs write-up coordination per the phase file's own risk note.
- **§E — Campaigns (step 6) and Automation (step 7) not rebuilt.** Time ran out after the
  Customer-360/lead/segment/seed work in the plan's stated order-of-work; both are real gaps, not
  cosmetic.
