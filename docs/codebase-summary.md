# Codebase Summary

Quick reference for Quang Hưởng Computer architecture, module inventory, roles, and key files. See `docs/permission-matrix.md` and `docs/modules-features-roles-matrix.md` for the permission matrix; `docs/system-architecture.md` for infrastructure; `docs/design-guidelines.md` + `docs/ui-kit-components.md` for the design system and UI kit.

## The numbers (2026-09-19, branch `feat/full-system-overhaul`)

| | |
|---|---|
| Backend modules | 15 |
| HTTP endpoints | 938 — all on a permission policy or the 66-entry public allow-list; startup audit fails closed |
| Roles | 11 |
| Backend unit tests | 1330 |
| Backend integration tests | 63 (real ApiGateway on a throwaway Postgres Testcontainer) |
| Frontend tests | 140 (17 files) |
| E2E specs | 42 (Playwright, TEST stack only) |
| Seeded catalogue | 70 curated records → **68 imported, 2 rejected** (fail-closed image rule, D02) |

Build and test only through the wrapper: `scripts/qh-build.sh be <Module.csproj> | be-test | be-test-integration | be-test-all | fe-tsc | fe-lint | fe-test`.

## Tech Stack

### Backend
- **.NET 8** modular monolith (15 service modules)
- **ApiGateway** composition root (DI setup, middleware registration, message bus setup)
- **EF Core** + **PostgreSQL 16** (multi-DbContext, audit interceptor, migration per module)
- **MassTransit 8.x** + **RabbitMQ** (async events, outbox pattern, saga)
- **Redis** (distributed cache, session store)
- **SignalR** (real-time hubs: notifications, live updates)

### Frontend
- **Vite 6** (dev server, SSR-optional, fast rebuild)
- **React 18** (hooks, suspense, startTransition)
- **TypeScript 5.x** (strict mode)
- **Tailwind CSS 3.x** + custom design tokens (`brand-tokens.ts`)
- **API client library** (module-scoped: catalogApi, salesApi, etc.); no fallback mocks (all dynamic via config)

### Shared
- **BuildingBlocks** (NuGet: shared utilities, validation, security, messaging, db base classes)
- **Design system** (tokens, component patterns, accessibility)

---

## 15 Backend Modules (Services)

All in `backend/Services/{ModuleName}/`, each with:
- `{ModuleName}Endpoints.cs` — REST endpoints
- `Domain/` — entities, value objects, business rules
- `Application/` — services, handlers, DTOs
- `Infrastructure/Data/` — DbContext, migrations, seeders
- (Optional) `Consumers/` for MassTransit event handlers

### Core 6

1. **Identity** (`backend/Services/Identity/`)
   - Auth (JWT, refresh), roles, users, permissions, 2FA
   - `IdentitySeeder.cs` (11 roles, sample users per role)
   - `RolePermissionSeeder.cs` (permission map)
   - `Permissions.cs` (canonical catalog in BuildingBlocks, not here)

2. **Catalog** (`backend/Services/Catalog/`)
   - Products, categories, brands, variants, media, specs
   - PC Builder (CPU/GPU/RAM config, compatibility check)
   - Sentiment analysis (from real reviews, not AI mocks)
   - Bundle management

3. **Sales** (`backend/Services/Sales/`)
   - Cart, checkout, order lifecycle
   - Installment plans, address book
   - Order status tracking, cancellation, refund policies
   - OrderPaidConsumer (publishes fulfillment event)

4. **Inventory** (`backend/Services/Inventory/`)
   - Stock, warehouse management
   - Purchase Order (PO): create, approve, receive (GRN)
   - Delivery notes (to customers)
   - Inventory count (physical stock-take)
   - Landed cost (import duty allocation to SKU)
   - Barcode Code128 + QR generation (QRCoder)
   - Supplier scorecard (on-time delivery %, quality)

5. **Accounting** (`backend/Services/Accounting/`)
   - Invoices (sales, AP), ledger entries
   - Tax reporting (VAT, PIT by employee)
   - E-invoice integration
   - Account/AP payable management
   - VietnameseTaxEngine (reads config: PersonalDeduction, DependentDeduction, BaseSalary)

6. **CRM** (`backend/Services/CRM/`)
   - Customers, leads, segments
   - RFM scoring (Recency/Frequency/Monetary from orders)
   - Campaigns, tasks, automation rules
   - Customer communication history

### Specialized 9

7. **Repair** — Repair scheduling, technician dispatch, SLA tracking
8. **Warranty** — Claims (RMA), loaner device checkout, public serial lookup
9. **HR** — Payroll, attendance, OT, contracts, PIT withholding, self-service
10. **Content** — CMS (pages, blog, banners), coupons, media, promo
11. **Reporting** — Cross-module dashboards, exports (CSV/PDF); system-health real-time metrics (process CPU/memory, DB/Redis/RabbitMQ connectivity)
12. **SystemConfig** — Key-value configuration (CRUD + bulk `POST /api/config/bulk`), theme, custom fields, menu, store
13. **Payments** — Payment gateway integration (VNPay, Momo), webhook, reconciliation
14. **Communication** — Email/SMS sending, templates, notification hub
15. **Ai** — Semantic search, recommendations, chatbot

---

## 11 Roles (canonical count, unchanged through the overhaul)

**Canonical source**: `backend/BuildingBlocks/Security/Permissions.cs` (Roles static class)

| Role | Primary Domain | Permissions | Notes |
|------|----------------|-----------|-------|
| **Admin** | All | Full RW on all modules | Can delete, audit, configure |
| **Manager** | Sales/Inventory | RW sales/inventory, R accounting, RW HR | Cannot modify config or delete critical records |
| **Sale** | Sales/Customers | RW orders/cart, R catalog, R CRM | Can view customer history, create quotes |
| **InventoryStaff** | Inventory | RW inventory (stock/PO/GRN/barcode/scorecard), R catalog/suppliers | |
| **Accountant** | Accounting | RW invoices/AP/AR, R sales/inventory, R tax config | Cannot delete ledger entries |
| **TechnicianInShop** | Repair/Warranty | RW repair scheduling, R warranty claims, limited warranty lookup | Cannot close claims without manager approval |
| **TechnicianOnSite** | Repair | RW repair orders (onsite jobs), R customer address | Cannot access inventory |
| **Marketing** | Content/Campaigns | RW content/coupons/banners, R reporting | No access to customer PII beyond segment |
| **HR** | HR/Payroll | RW HR (attendance/payroll/contracts), R employee directory | no access to accounting |
| **Customer** | Self-service | R own orders/warranty, RW cart/checkout, limited RW profile | Highest restriction; orders public API |
| **Supplier** | Self-service | R RFQ/PO for their SKUs, R scorecard metrics | Read-only supplier portal |

**Permission matrix**: See `docs/modules-features-roles-matrix.md` (detailed Role × Module grid, R/RW/—)

---

## Key files of the 2026-09 overhaul

### Backend
- `backend/ApiGateway/Startup/DatabaseMigrationRunner.cs` - the `db migrate` / `db seed --profile <reference|demo>` CLI, the ordered seed-step registry, and the production admin bootstrap. Every step reports how many rows it changed; a re-run must total **0**.
- `backend/Services/Catalog/Infrastructure/Data/Import/` - the versioned product dataset (`dataset/`, 70 records) and its idempotent importer: deterministic ids, canonicalised jsonb, normalised decimals, media rows upserted by `(SKU, path)`, and the fail-closed rule that refuses any product whose `imageStatus` is not `ok`.
- `backend/BuildingBlocks/Security/EndpointAuthorizationAuditor.cs` + `PublicEndpointAllowList.cs` - the startup audit over the real route table and the 66-entry public allow-list (each entry carries its file:line justification). `Security:EndpointAuthorizationAudit:FailOnViolation` turns a warning into a refusal to start.
- `backend/BuildingBlocks/TaxEngine/` - D01 money kernel: VAT extracted per line from VAT-inclusive prices, discount allocator with clamp / zero-denominator / tie-break rules, totals rounded to the dong (AwayFromZero).
- `backend/BuildingBlocks/Platform/` - `IAppSettings`, `IBusinessClock` (Vietnam time), document numbering, error / validation / paging conventions.
- `backend/ApiGateway/Seo/` - the SEO shell: head + JSON-LD rendering per route, `sitemap.xml`, `robots.txt`, output caching, real status codes (D11).
- `backend/Tests/IntegrationTests/` - the real ApiGateway on a throwaway Postgres Testcontainer: fresh install (every migration applied, every table present, every DbSet queryable, **seed run twice changes 0 rows**), the authorization matrix, session lifecycle, checkout money integrity, SePay webhook signature.

### Frontend
- `frontend/src/design-system/` - semantic light/dark tokens, type scale, motion spec (`motion/`), variants.
- `frontend/src/components/ui/` - the single UI kit (see `docs/ui-kit-components.md`); no parallel primitive sets.
- `frontend/src/routes/*.routes.ts` - typed route manifest per area; guards and the backoffice menu are generated from it.
- `frontend/src/schemas/` + form kit - React Hook Form + Zod (`docs/frontend-form-kit.md`).
- `frontend/src/api/` - one client per module, written against `docs/api-contracts/`.

### Ops
- `scripts/stack-up.sh` - the one bring-up sequence (`make up` and `make deploy` both call it), including the safety stop that refuses a Postgres container owned by a different compose project.
- `scripts/qh-build.sh` - the only sanctioned compile/test entry point (serialised by a lock, capped MSBuild, artifacts kept out of the running tree).
- `deploy/Caddyfile`, `deploy/backup/backup.sh`, `deploy/backup/restore-drill.sh` - TLS edge, tiered (optionally age-encrypted) dumps, and a restore drill that really restores.


## Directory Structure (Backend)

```
backend/
├── ApiGateway/                          # Composition root
│   └── Program.cs                       # DI setup, middleware, MassTransit/Redis config
├── BuildingBlocks/
│   ├── Security/Permissions.cs          # Canonical RBAC catalog (roles + permission strings)
│   ├── TaxEngine/
│   │   ├── ITaxSettingsProvider.cs
│   │   └── VietnameseTaxEngine.cs       # (Config-driven constants, fallback defaults)
│   ├── Validation/
│   │   ├── ValidationEndpointFilter.cs
│   │   ├── FluentValidationExtensions.cs
│   │   └── VietnameseValidationMessages.cs
│   ├── Messaging/
│   │   ├── OutboxProcessorBackgroundService.cs
│   │   └── IntegrationEventHandling.cs
│   └── Data/BaseDbContext.cs            # EF Core base + audit interceptor
├── Services/
│   ├── Identity/
│   ├── Catalog/
│   ├── Sales/
│   ├── Inventory/
│   ├── Accounting/
│   ├── Repair/
│   ├── Warranty/
│   ├── HR/
│   ├── CRM/
│   ├── Content/
│   ├── Reporting/
│   ├── SystemConfig/
│   ├── Payments/
│   ├── Communication/
│   └── Ai/
└── Tests/
    └── UnitTests/
        ├── SystemConfig/
        ├── Security/
        ├── Validation/
        ├── CRM/
        ├── Inventory/
        └── Accounting/
```

## Directory Structure (Frontend)

```
frontend/
├── src/
│   ├── api/
│   │   ├── catalogApi.ts
│   │   ├── salesApi.ts
│   │   ├── crm.ts
│   │   ├── systemConfigApi.ts
│   │   └── ...
│   ├── components/
│   │   ├── header/
│   │   │   ├── header-top-bar.tsx
│   │   │   ├── header-utility-bar.tsx
│   │   │   ├── header-main-bar.tsx
│   │   │   └── ...
│   │   ├── backoffice/
│   │   │   ├── backoffice-sidebar.tsx
│   │   │   ├── backoffice-topbar.tsx
│   │   │   └── ...
│   │   ├── ProductCard.tsx
│   │   ├── Footer.tsx
│   │   └── ...
│   ├── design-system/
│   │   └── brand-tokens.ts              # Color, spacing, radius, shadow tokens
│   ├── hooks/
│   │   ├── use-company-info.ts          # NEW (2026-08-19)
│   │   ├── usePermissions.ts
│   │   └── ...
│   ├── layouts/
│   │   ├── RootLayout.tsx               # Customer layout
│   │   └── BackofficeLayout.tsx         # Admin layout (refactored)
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ProductCatalogPage.tsx
│   │   ├── ContactPage.tsx
│   │   └── ...
│   └── App.tsx
└── public/
```

---

## Key Configuration Points

### Environment Variables (Backend)
- `ASPNETCORE_ENVIRONMENT` (Development/Production)
- `ConnectionStrings__DefaultConnection` (Postgres)
- `Redis__Connection` (Redis)
- `RabbitMQ__Hostname` (Message broker)
- `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`

### ConfigurationEntry (Database)
- Category `Company`: MST, tên, địa chỉ, contact (seed thật)
- Category `Tax`: PersonalDeduction, DependentDeduction, BaseSalary (used by VietnameseTaxEngine)
- Category `Theme`: colors, fonts (CSS var mapping)
- Category `Operations`: working hours, policies

### Feature Flags
- `EnableSignalR` (real-time notifications)
- `EnableEmailSending` (SMTP vs stub)
- `EnableBarcodePrinting` (hardware integration)

---

## Important Files to Know

| File | Purpose | When to edit |
|------|---------|------------|
| `backend/BuildingBlocks/Security/Permissions.cs` | Canonical RBAC | Add new role/permission |
| `backend/ApiGateway/Program.cs` | DI + middleware | Register new validator/service |
| `frontend/src/design-system/brand-tokens.ts` | Colors, spacing | Update brand/theme |
| `frontend/src/hooks/use-company-info.ts` | Company data | Never (config-driven) |
| `backend/BuildingBlocks/Security/PublicEndpointAllowList.cs` | The only way an endpoint may be public | Adding a genuinely public route — with a file:line justification |
| `backend/ApiGateway/Startup/DatabaseMigrationRunner.cs` | Seed steps and their order | Adding reference data (a re-run must still total 0 changes) |
| `docs/modules-features-roles-matrix.md`, `docs/permission-matrix.md` | Role matrix | After permission change |
| `docs/system-architecture.md` | Tech overview | After infra upgrade |
| `docs/development-roadmap.md` | What is done and what is open | After closing or finding a defect |

---

## Testing

Four layers, all run through `scripts/qh-build.sh` (never `dotnet test` directly — the wrapper
holds the lock that keeps parallel work from exhausting the machine):

| Layer | Command | Count |
|---|---|---|
| Backend unit | `scripts/qh-build.sh be-test` | 1330 |
| Backend integration (real ApiGateway + throwaway Postgres container) | `scripts/qh-build.sh be-test-integration` | 63 |
| Both (wave gate) | `scripts/qh-build.sh be-test-all` | — |
| Frontend unit | `scripts/qh-build.sh fe-test` | 140 |
| Frontend typecheck / lint | `scripts/qh-build.sh fe-tsc` / `fe-lint` | 0 errors |
| E2E | `npx playwright test` against the TEST stack (`scripts/qh-test-env.sh`) | 42 |

The integration suite starts from an **empty** database in one command and covers: every migration
applied, every model table present, every DbSet queryable, **`db seed` run twice changing 0 rows**,
the authorization matrix, the session lifecycle (refresh rotation, reuse detection), checkout money
integrity, and the SePay webhook signature. The E2E suite refuses to run unless the base URL is the
TEST stack (:5050), so it cannot write into live data.

---

## Deployment

`docs/deployment-guide.md` is the authority — it was rewritten from an actual rehearsal on a clean
clone (build → empty DB → migrate → seed → HTTPS edge → 68 products → admin login → encrypted
backup → restore drill). In short: `scripts/stack-up.sh` is the one bring-up sequence,
`make check-secrets` blocks a deploy while a `CHANGE_ME` placeholder remains, and `make backup-up`
must be run or there are no backups at all. Do not re-derive the procedure from this file.

---

## JSON Extensibility (2026-08-19)

Two complementary mechanisms let admins extend the data model and admin data-grids without a deploy:

### 1. Freeform `Attributes` (jsonb) on core entities
- `Catalog.Product`, `Sales.Order`, `CRM.Lead` each have an `Attributes` (jsonb, default `'{}'`) column.
- Domain method `SetAttributes(string? json)` on each entity; endpoints accept `attributes` in create/update DTOs (Product, Lead) or via a dedicated `PUT /api/sales/admin/orders/{id}/attributes` (Order, since orders are created via checkout).
- Validation: `SystemConfig.CustomFieldAttributeValidator.ValidateAsync(...)` checks declared `CustomFieldDefinition` rows (by `EntityType`) for type/required — unknown keys always allowed (extensibility-first). Catalog/Sales/CRM projects reference `SystemConfig.csproj` to reuse this validator + `CustomFieldDbContext`.
- Migrations: `AddProductAttributesJson` (Catalog), `AddOrderAttributesJson` (Sales), `AddLeadAttributesJson` (CRM).
- FE: `frontend/src/components/admin/product-attributes-editor.tsx` renders one input per active `CustomFieldDefinition` for an entity type, backed by the `attributes` JSON blob (counterpart of `CustomFieldsManager.tsx`, which only *defines* fields).

### 2. Dynamic admin data-tables (`TableViewDefinition`)
- New `SystemConfig.Domain.TableViewDefinition` entity (mirrors `FormDefinition`): `Key` (e.g. `admin.products`), `Name`, `ColumnsJson` (`[{key,label,type,sortable,visible,width,format}]`), `FiltersJson`, `IsSystem`.
- CRUD: `TableViewEndpoints.cs` → `/api/config/table-views` (admin-only, FluentValidation via `CreateTableViewDtoValidator`).
- Seeded defaults for `admin.products`, `admin.orders`, `admin.leads` via `TableViewDefinitionSeeder` (called from `SystemConfigDbSeeder.SeedAsync`).
- Migration: `AddTableViewDefinitionsAndFreeshipConfig` (SystemConfigDbContext).
- FE: `frontend/src/components/backoffice/dynamic-data-table.tsx` fetches a `TableViewDefinition` by `Key`, renders columns generically (currency/number/date/boolean/badge/text formatters), supports sort. Column show/hide + reorder persisted via `table-view-config-modal.tsx` → `PUT /api/config/table-views/{id}`.
- First consumer: `pages/admin/ProductsPage.tsx` — card/table view toggle, table mode uses `viewKey="admin.products"`.

---

**Last updated**: 2026-09-19 (after wave 4 of the full-system overhaul)  
**See also**: `docs/development-roadmap.md` (what is left), `docs/system-architecture.md`, `docs/permission-matrix.md`, `docs/deployment-guide.md`, `docs/design-guidelines.md`
