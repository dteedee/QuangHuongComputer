# Codebase Summary

Quick reference for Quang Hưởng Computer architecture, module inventory, roles, and key files. See `docs/modules-features-roles-matrix.md` for detailed permission matrix; `docs/system-architecture.md` for infrastructure; `docs/hacom-design-reference.md` for design tokens.

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
- **API client library** (module-scoped: catalogApi, salesApi, etc.) with fallback mock

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
11. **Reporting** — Cross-module dashboards, exports (CSV/PDF)
12. **SystemConfig** — Key-value configuration, theme, custom fields, menu, store
13. **Payments** — Payment gateway integration (VNPay, Momo), webhook, reconciliation
14. **Communication** — Email/SMS sending, templates, notification hub
15. **Ai** — Semantic search, recommendations, chatbot

---

## 11 Roles (11 is the canonical count as of 2026-08-19)

**Canonical source**: `backend/BuildingBlocks/Security/Permissions.cs` (Roles static class)

| Role | Primary Domain | Permissions | Notes |
|------|----------------|-----------|-------|
| **Admin** | All | Full RW on all modules | Can delete, audit, configure |
| **Manager** | Sales/Inventory | RW sales/inventory, R accounting, RW HR | Cannot modify config or delete critical records |
| **Sale** | Sales/Customers | RW orders/cart, R catalog, R CRM | Can view customer history, create quotes |
| **InventoryStaff** | Inventory | RW inventory (stock/PO/GRN/barcode/scorecard), R catalog/suppliers | NEW (2026-08-19) |
| **Accountant** | Accounting | RW invoices/AP/AR, R sales/inventory, R tax config | Cannot delete ledger entries |
| **TechnicianInShop** | Repair/Warranty | RW repair scheduling, R warranty claims, limited warranty lookup | Cannot close claims without manager approval |
| **TechnicianOnSite** | Repair | RW repair orders (onsite jobs), R customer address | Cannot access inventory |
| **Marketing** | Content/Campaigns | RW content/coupons/banners, R reporting | No access to customer PII beyond segment |
| **HR** | HR/Payroll | RW HR (attendance/payroll/contracts), R employee directory | NEW (2026-08-19), no access to accounting |
| **Customer** | Self-service | R own orders/warranty, RW cart/checkout, limited RW profile | Highest restriction; orders public API |
| **Supplier** | Self-service | R RFQ/PO for their SKUs, R scorecard metrics | Read-only supplier portal |

**Permission matrix**: See `docs/modules-features-roles-matrix.md` (detailed Role × Module grid, R/RW/—)

---

## Key New Files (2026-08-19)

### Frontend
- `frontend/src/hooks/use-company-info.ts` — Typed company info hook (cached, config fallback). Returns: `{ name, nameEn, shortName, taxCode, address, phone, email, hotline, workingHours, brandText1, brandText2, ... }`
- `frontend/src/components/header/header-top-bar.tsx` — Quang Hưởng brand strip (red bg, tagline, category link)
- `frontend/src/components/header/header-utility-bar.tsx` — Hotline, store finder, support, order lookup, account
- `frontend/src/components/header/header-search-pill.tsx` — Search box with red border, icon
- `frontend/src/components/homepage/category-sidebar-menu.tsx` — Sidebar category navigation (desktop)
- `frontend/src/components/product-section-header.tsx` — Reusable section title + brand pills + "Xem tất cả"
- `frontend/src/components/backoffice/backoffice-sidebar.tsx` — Collapsible sidebar (persist state)
- `frontend/src/components/backoffice/backoffice-sidebar-menu-config.ts` — Menu fallback + icon map
- `frontend/src/components/backoffice/backoffice-topbar.tsx` — Minimal topbar
- `frontend/src/layouts/BackofficeLayout.tsx` — Refactored < 150 lines (was 982)

### Backend
- `backend/Services/SystemConfig/Infrastructure/Data/SystemConfigSeedData*.cs` — Split seeder (company, operations, system) for readability
- `backend/BuildingBlocks/TaxEngine/ITaxSettingsProvider.cs` — Abstraction for config-driven tax constants
- `backend/BuildingBlocks/Validation/ValidationEndpointFilter.cs` — Endpoint middleware for request validation
- `backend/BuildingBlocks/Validation/FluentValidationExtensions.cs` — `AddApplicationValidators()`, `WithValidation<T>()` extension
- `backend/Services/{Module}/Validators/{Request}Validator.cs` — FluentValidation per module (Accounting, CRM, Inventory)
- `backend/Services/Accounting/Templates/InvoiceHtmlTemplate.cs` — Real HTML invoice render (company info from config)
- `backend/Services/Inventory/BarcodeEndpoints.cs` — Code128 + QR generation (base64 PNG)
- `backend/Services/Inventory/Application/Suppliers/SupplierScorecardService.cs` — Added `ExpectedDeliveryDate`, on-time rate calc
- `backend/Tests/UnitTests/SystemConfig/ConfigSeederIdempotentTests.cs` — Seeder test
- `backend/Tests/UnitTests/Security/PermissionsAndRolesTests.cs` — Permission/role validation

### Docs
- `docs/project-changelog.md` — Detailed 2026-08-19 entry (new file)
- `docs/development-roadmap.md` — Phases, backlog, metrics, risks (new file)
- `docs/modules-features-roles-matrix.md` — 15 modules × 11 roles, feature list per module (created Aug 19)
- `docs/hacom-design-reference.md` — Design patterns, tokens (existing, reference for UI)
- `docs/system-architecture.md` — Modular monolith, .NET 8, Vite 6 (updated Aug 19)

---

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
| `docs/modules-features-roles-matrix.md` | Role matrix | After permission change |
| `docs/system-architecture.md` | Tech overview | After infra upgrade |

---

## Testing

- **Unit tests**: `backend/Tests/UnitTests/` (677 tests, all PASS)
- **Test categories**: Config seeding, Tax engine, Permissions, Validation, RFM, Barcode, Invoice HTML
- **Frontend type check**: `cd frontend && npx tsc --noEmit`
- **Frontend build**: `npm run build` (13.15s)

**Run tests**: `dotnet test backend/Tests/UnitTests/UnitTests.csproj`

---

## Deployment Checklist

- [ ] Backend: `dotnet build` PASS, `dotnet test` all PASS
- [ ] Frontend: `tsc --noEmit` 0 errors, `npm run build` success
- [ ] DB: migrations applied (`dotnet ef database update`)
- [ ] Redis: connection OK
- [ ] RabbitMQ: connection OK, queues created
- [ ] Config seeded: grep `0200807633` in DB
- [ ] No hardcoded secrets in code (use env vars)
- [ ] CORS policy set for frontend domain
- [ ] HTTPS enabled (self-signed OK for staging)

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

**Last updated**: 2026-08-19  
**Maintained by**: docs-manager agent  
**See also**: `docs/development-roadmap.md`, `docs/system-architecture.md`, `docs/modules-features-roles-matrix.md`, `docs/hacom-design-reference.md`
