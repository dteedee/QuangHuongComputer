# Integration events (W1-5 contract - read this, not the phase file)

Owner: W1-5 (`backend/BuildingBlocks/Messaging/**`). This document IS the frozen contract 40+
later tracks build on - do not invent a new event shape, extend this file and this file only.

## Broker

One MassTransit bus registration (`ApiGateway/Startup/ServiceRegistration.cs:RegisterMessagingAndBackgroundJobs`),
one config source: `ConnectionStrings:RabbitMQ`, an `amqp(s)://user:pass@host:port/vhost` URI.
`BuildingBlocks/Messaging/MassTransitRegistration.ConfigureHost` parses host/port/vhost/user/pass
from that single URI (`cfg.Host(Uri)`) - there is no second place a broker address can be
configured, and no hardcoded `guest`/`guest` fallback outside Development. The health check
(`ServiceRegistration.cs:RegisterInfrastructure`, `AddRabbitMQ`) reads the exact same key, so a
"healthy" `/health/ready` and the bus actually being reachable can no longer disagree.

**Non-Development environment + missing/placeholder connection string -> startup throws.** A
`${...}` placeholder (nothing in this codebase expands `${...}`) counts as missing.

MassTransit pinned `[8.5.10,9.0.0)` (D05 - Apache-2.0; 9.x is commercial). Brings
`RabbitMQ.Client` 6.8.1 -> 7.2.1. Smoke-tested against `rabbitmq:4.3-management-alpine` in a
throwaway container (not the shared dev broker): bus start, publish, consume all succeeded; broker
log had zero `denied` lines and no `transient_nonexcl_queues`/`global_qos` deprecation hit (the
specific D05 trap). Log kept at `plans/260917-2100-full-system-overhaul/reports/probes/W1-5-rabbitmq43-smoke.log`.

## Outbox

The old hand-rolled outbox (`BuildingBlocks/Messaging/Outbox/**`,
`ConvertDomainEventsToOutboxMessagesInterceptor`) is deleted - it was dead code, nothing published
through it.

**Corrected 2026-09-18 (adversarial verification) - this section previously described a state that
was never actually shipped.** The plan was to replace it with MassTransit's
`AddEntityFrameworkOutbox<TDbContext>` + `UseBusOutbox()` on five publishing contexts (`Sales`,
`InventoryModule`, `Payments`, `HR`, `Warranty`). That registration was written, then **reverted in
full** before this track finished: `MassTransit.EntityFrameworkCore` 8.5.0-8.5.10 (every version
D05 allows) requires `Microsoft.EntityFrameworkCore.Relational >= 9.0.1` even on net8.0, which is
binary-incompatible with this repo's EF Core 8.0.2 pin (`Directory.Build.props`) and crashes
**every** DbContext at startup with `TypeLoadException` on
`NpgsqlHistoryRepository.get_LockReleaseBehavior` - reproduced against the TEST stack. There is
today **no EF outbox code anywhere in this repo** - no package reference
(`BuildingBlocks.csproj` explicitly does NOT reference `MassTransit.EntityFrameworkCore`, with a
comment explaining why), no `AddEntityFrameworkOutbox`/`UseBusOutbox` call in
`ServiceRegistration.cs` (grep confirms zero hits), nothing for W1-11's migrations to activate.

**Practical effect:** publishing an integration event today is fire-and-forget, exactly as it was
before this track (Success Criterion "publishing inside a rolled-back transaction delivers
nothing; committing delivers exactly once" is **not met** - there is no transactional guarantee).
Adding the migrations alone will not fix this; the C# registration must be re-added first, which
needs a plan-level decision (bump the repo to EF Core 9, wait for/find an EF-Core-8-compatible
outbox package, or accept fire-and-forget for another wave) - see `w1-5-report.md` Unresolved #1.

## Event contracts

All records live in `BuildingBlocks/Messaging/IntegrationEvents/*.cs`. A consumer subscribes by
implementing `IConsumer<TEvent>` in a `Consumers/` folder inside its own module and MassTransit
auto-wires it via `x.AddConsumers(typeof(<Module>.DependencyInjection).Assembly)`
(`ServiceRegistration.cs`) - six assemblies are scanned today: Communication, Sales, Accounting,
Warranty, Identity, HR. A module publishing a NEW event type needs its assembly added to that list too
(integration request against `ServiceRegistration.cs`, this track's file).

| Event | File | Status |
|---|---|---|
| `OrderCreatedIntegrationEvent` | `OrderCreatedIntegrationEvent.cs` | Published (Sales), consumed (Communication: `OrderCreatedConsumer`) |
| `PaymentSucceededEvent` | `PaymentEvents.cs` | Published (Payments/Sales), consumed (Sales: `OrderPaidConsumer`) |
| `PaymentFailedEvent` | `PaymentEvents.cs` | Published (Payments), no consumer yet |
| `InvoiceRequestedEvent` | `PaymentEvents.cs` | Published (`OrderPaidConsumer`), consumed (Accounting: `InvoiceRequestedConsumer`). **Legacy shape** - see note below |
| `OrderFulfilledEvent` | `PaymentEvents.cs` | Published (`OrderPaidConsumer`), consumed (Sales: `EmailNotificationConsumers`) |
| `POReceivedEvent` | `PaymentEvents.cs` | Published (Inventory), consumed (Accounting) |
| `PayrollPaidIntegrationEvent` | `PaymentEvents.cs` | Contract only |
| `UserRegisteredIntegrationEvent` | `UserRegisteredIntegrationEvent.cs` | Published (Identity), consumed (Communication: `UserRegisteredConsumer` -> welcome email) |
| `AuditLogIntegrationEvent` | `AuditLogIntegrationEvent.cs` | Existing, unrelated to this track |
| `OrderConfirmedEvent` | `OrderLifecycleEvents.cs` | **Contract only** - wave 2 wires the publish |
| `OrderPaidEvent` | `OrderLifecycleEvents.cs` | **Contract only** (D01+D07 shape, below) |
| `OrderShippedEvent` | `OrderLifecycleEvents.cs` | **Contract only** |
| `OrderDeliveredEvent` | `OrderLifecycleEvents.cs` | **Contract only** (D01+D07 shape) |
| `OrderCompletedEvent` | `OrderLifecycleEvents.cs` | **Contract only** |
| `OrderCancelledEvent` | `OrderLifecycleEvents.cs` | **Contract only** |
| `ReturnCompletedEvent` | `ReturnAndRefundEvents.cs` | **Contract only** |
| `RefundRequestedEvent` | `ReturnAndRefundEvents.cs` | **Contract only** |
| `StockChangedEvent` | `InventoryEvents.cs` | **Contract only** |
| `LowStockEvent` | `InventoryEvents.cs` | **Contract only** |
| `RepairCompletedEvent` | `ServiceOperationsEvents.cs` | **Contract only** |
| `WarrantyClaimUpdatedEvent` | `ServiceOperationsEvents.cs` | **Contract only** |
| `RepairWorkOrderSettlementChangedEvent` | `ServiceOperationsEvents.cs` | Published (Repair: `PUT .../work-orders/{id}/pay`, and `.../cancel` when the order was already paid), consumed (HR: `RepairSettlementCommissionConsumer` -> technician commission). Payload is just the id: HR re-reads the truth through `IRepairCommissionSourceQuery`, and `POST /api/hr/commissions/sync` reconciles a whole period, because there is no outbox (a lost event is repaired by the sync) |

"Contract only" = the record type exists and compiles, no `Publish()`/`IConsumer<T>` wired to it
anywhere yet. Risk Assessment for this track says "leave business logic to wave 2" - wiring these
needs domain data (e.g. `Order.BuyerInvoiceInfo`, `OrderItem.UnitName/VatRate`) that does not exist
on the Sales domain model until W2-3/phase-21 lands. Wave-2 tracks (W2-3/4/5/6) publish/consume
these; **do not invent a different shape** - extend this file if a field is missing.

### D01 + D07 shapes (`OrderPaidEvent`, `OrderDeliveredEvent`)

```csharp
record BuyerInvoiceInfo(string BuyerType, string? BuyerLegalName, string BuyerFullName,
    string? BuyerTaxCode, string? BuyerBudgetUnitCode, string? BuyerAddress,
    string? BuyerEmail, string? BuyerPhone);   // BuyerType: "Individual" | "Company" | "PublicUnit"

record InvoiceLineDto(string Sku, string Name, int Qty, decimal PayableGross, string UnitName,
    decimal VatStatutoryRate, bool VatReductionEligible, decimal DiscountAmount,
    bool IsGift, IReadOnlyList<string> Serials);

record ShippingLineDto(decimal PayableGross, decimal VatStatutoryRate);
```

`PayableGross` is VAT-inclusive, post discount-allocation (D01 - largest-remainder allocation,
`VietnameseTaxEngine.ExtractVat`). A consumer must NEVER query back across modules for invoice
data - everything it needs travels in the event.

### `InvoiceRequestedEvent` - legacy shape, scheduled migration

Today: `InvoiceRequestedEvent(Guid OrderId, Guid CustomerId, List<InvoiceItemDto> Items, decimal TotalAmount)`
with `InvoiceItemDto(Guid ProductId, string ProductName, int Quantity, decimal UnitPrice)` - it predates
D01/D07 and is intentionally **not** changed by this track: `OrderPaidConsumer.cs` (the only
publisher) and `InvoiceRequestedConsumer.cs` (the only consumer) both build/read this exact shape
today with real Sales-domain data, and neither `Order.BuyerInvoiceInfo` nor
`OrderItem.UnitName`/`VatRate` exist yet - changing the contract now would break a working path for
fields nothing can populate. D07 (cross-decision-conflicts) already schedules the real fix at
**phase-21 (W2-3)**: add `BuyerInvoiceInfo` + line fields to `Order`, migrate `InvoiceRequestedEvent`
to the `OrderPaidEvent`/`OrderDeliveredEvent` line shape above, and **remove the
`Publish(InvoiceRequestedEvent)` call from `OrderPaidConsumer.cs`** (ND 254/2026: an invoice may
not be requested on payment, only on delivery - Art.9.1).

## Email

One `IEmailSender` (`BuildingBlocks/Email/IEmailSender.cs`) - enqueue-only, Channel-backed,
retried with backoff (2s/8s/20s, 4 attempts) and logged by `QueuedEmailBackgroundService`. Bound to
`Email:Smtp` (`EmailOptions`): `Host`, `Port`, `EnableSsl`, `Username`, `Password`, `FromEmail`,
`FromName`. Empty or `${...}`-placeholder values mean "not configured" (`EmailOptions.IsConfigured`)
- SmtpEmailSender then logs the email instead of attempting SMTP, same as every Development
request regardless of configuration (Key Insight: never pretend to send in dev).

Both `BuildingBlocks.Email.IEmailService` and `Identity.Services.IEmailService` are thin,
template-rendering facades over the one `IEmailSender` now - see the doc comment on
`Identity/Services/EmailService.cs` for why the Identity wrapper could not be deleted outright
(its interface file + DI registration line sit in files this track does not own).

Templates: `BuildingBlocks/Email/Templates/*.scriban`, rendered by `EmailTemplateRenderer`
(Scriban, embedded resources). Wired to a real call site: `order-confirmed`, `payment-success`,
`warranty-registered` (BuildingBlocks facade), `password-reset`, `welcome` (Identity facade).
Authored but not yet wired to a call site: `order-shipped`, `two-factor`, `campaign-base` - ready
for `OrderShippedEvent`, `TwoFactorEndpoints.cs` and `EmailCampaignService.cs` respectively.

Delivery log: a structured `EmailDeliveryLog` log line (`recipient`, `status`, `attempts` - never
the body, per Security Considerations), not a database table - W1-11 owns migrations this wave and
no delivery-log table was in its fixed list.

## Appendix: the `Section__Key` env-var convention

.NET's environment-variable configuration provider (already registered by
`WebApplication.CreateBuilder`) maps an env var named with double underscores to a nested config
key: `Email__Smtp__Password` -> `IConfiguration["Email:Smtp:Password"]`,
`ConnectionStrings__RabbitMQ` -> `ConnectionStrings:RabbitMQ`. It overrides whatever the matching
`appsettings*.json` key holds, INCLUDING an empty string or a `${...}` placeholder - this is the
one substitution mechanism that actually works in this codebase.

**What does NOT work:** writing `"${SMTP_PASSWORD}"` (or any `${VAR}` string) as a JSON value and
expecting it to be replaced. Nothing parses that syntax except four OAuth keys hand-mapped in
`ServiceRegistration.cs:MapOAuthEnvironmentVariables` (`GOOGLE_CLIENT_ID/SECRET`,
`FACEBOOK_APP_ID/SECRET`, no double underscore). Every other `${...}` value in
`appsettings.Staging.json` is a real gap for whoever deploys that environment - see below.

**Practical rule for every appsettings*.json this track touched:** a secret or environment-specific
value is either a real, safe-to-commit default (Development) or an **empty string** (Production/
base) - never a `${...}` placeholder. Supply the real value at deploy time as an actual
`Section__Key`-named environment variable (docker-compose `environment:` block, `.env.prod`,
CI secret, or `qh-test-env.sh`'s `--Key:Path=value` CLI overrides, which MassTransit-style
`IConfiguration` binding also accepts as command-line args with the same `:`-nested syntax).

`appsettings.Staging.json` still uses the old `"${VAR}"`-as-documentation style throughout
(OAuth, Payment, `ConnectionStrings`) - this track did not rewrite that file wholesale (out of
scope), only added the two new sections (`Storage`, `Seo`) it needed, in the same style for
consistency. Whoever owns Staging deploy config should eventually blank those out the same way.
