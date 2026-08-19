# System Architecture

Quang Huong Computer uses a **modular monolith pattern** with .NET 8 backend (composition root via ApiGateway) and Vite 6/React 18 SPA frontend. All business logic segregated into 15 service modules using domain-driven design, coordinated via MassTransit event bus over RabbitMQ, with PostgreSQL 16 data stores and Redis distributed caching.

## Architecture Pattern

**Modular Monolith**: Single deployable unit housing 15 loosely-coupled business modules. Each module owns its domain logic, API endpoints, and database (multi-DbContext pattern). Communication via: (a) HTTP/REST within same process, (b) async events via message bus (eventual consistency), (c) SignalR for real-time features.

## High-Level Topology

```
┌─────────────────────────────────────────────┐
│         Web Clients (Browser/App)           │
└────────────┬────────────────────────────────┘
             │ HTTPS / REST
    ┌────────▼────────────────────┐
    │   Frontend (Vite 6 SPA)      │
    │  React 18 / TypeScript       │
    │  Tailwind CSS / design-sys   │
    └────────┬───────────────────┘
             │ API calls
    ┌────────▼──────────────────────────────────┐
    │    ApiGateway (Composition Root)          │
    │  - Routes to 15 service modules           │
    │  - Global middleware (auth, CORS, etc)    │
    │  - DI container setup                     │
    └────────┬──────────────────────────────────┘
             │
    ┌────────▼────────────────────────────────────────────┐
    │  Backend (.NET 8) — 15 Service Modules              │
    │                                                      │
    │  Identity, Catalog, Sales, Inventory, Accounting,   │
    │  Repair, Warranty, HR, CRM, Content, Reporting,     │
    │  SystemConfig, Payments, Communication, Ai          │
    │                                                      │
    │  ┌──────────────────────────────────────────────┐   │
    │  │ BuildingBlocks (Shared Infrastructure)       │   │
    │  │ - BaseDbContext, EF Core, migrations         │   │
    │  │ - FluentValidation, endpoints framework      │   │
    │  │ - Permission/Role RBAC                       │   │
    │  │ - Tax engine (PIT/VAT), crypto, utilities    │   │
    │  └──────────────────────────────────────────────┘   │
    │                                                      │
    └────┬─────────────┬──────────────┬──────────────┘
         │             │              │
    ┌────▼──┐   ┌─────▼────┐   ┌────▼───────┐
    │   DB  │   │  Cache   │   │ Message    │
    │ PG 16 │   │  Redis   │   │ Broker/    │
    │       │   │  (multi) │   │ RabbitMQ   │
    └───────┘   └──────────┘   └────────────┘
```

## 15 Backend Modules

| # | Module | Purpose | Key Features |
|---|--------|---------|--------------|
| 1 | **Identity** | Auth, roles, users, JWT, 2FA, permissions | OAuth-ready, claim-based auth, session management |
| 2 | **Catalog** | Products, categories, variants, PC builder | SEO, specs, media, bundle management |
| 3 | **Sales** | Cart, checkout, orders, installments | Address book, order lifecycle, refund policies |
| 4 | **Inventory** | Stock, warehouses, PO, GRN, barcode, scorecard | Landed cost, RFQ, supplier rating, Code128/QR |
| 5 | **Accounting** | Invoices, AP/AR, tax reports, e-invoice | PIT calculation, VAT, expense tracking, ledger |
| 6 | **Repair** | Repair scheduling, quotations, technician dispatch | Status tracking, SLA, parts management |
| 7 | **Warranty** | Claims, RMA, loaner devices, public lookup | Serial-based tracking, claim workflow |
| 8 | **HR** | Employees, payroll, attendance, contracts | Overtime calc, tax withholding, self-service |
| 9 | **CRM** | Customers, leads, segments, campaigns, tasks | RFM scoring, automation, email/SMS |
| 10 | **Content** | Pages, blog, coupons, banners, media, promo | CMS, schedule publish, link management |
| 11 | **Reporting** | Cross-module analytics, exports (sales/inventory/HR) | Trend analysis, dashboards, audit trail |
| 12 | **SystemConfig** | Key-value config, custom fields, menu, store | Dynamic config, theme overrides, backup |
| 13 | **Payments** | Payment gateways (VNPay, Momo), webhook handling | Transaction logging, reconciliation |
| 14 | **Communication** | Email/SMS/notifications, templates, queuing | SMTP integration, retry logic, audit |
| 15 | **Ai** | Semantic search, recommendations, chatbot | Embedding search, ranking, NLP |

## Data & Infrastructure

### Databases
- **PostgreSQL 16** multi-DbContext: each module owns schema (or shared schema with partition). EF Core migrations per module. Audit interceptor auto-timestamps, tracks user.
- **No Prisma** — ORM is EF Core with DbContext base classes in BuildingBlocks.

### Caching
- **Redis** distributed cache (multi-level: app-local + distributed). Keys prefixed by module (e.g., `catalog:product:{id}`). TTL strategy per entity type. SystemConfig keys cached aggressively (public config endpoint).

### Messaging
- **MassTransit** 8.x over **RabbitMQ**: async events for order-paid → fulfillment, invoice-created → accounting, etc. Outbox pattern for transaction-safety. Saga orchestration for complex workflows (multi-step order, repair claim).

### Real-Time
- **SignalR** hubs: notifications (order status, chat), live inventory updates (stock count). Broadcast to role-based groups.

## Frontend (Vite 6 SPA)

- **React 18**, TypeScript, Tailwind CSS
- **Design system**: tokens (`brand-tokens.ts`) for colors (Quang Hưởng red `#D22B2B`), spacing, radius, shadow
- **Hacom-style layout**: 3-tier sticky header, sidebar category menu, product cards (7 tiers: image, rating, sku, name, old price, new price red, stock badge)
- **Layouts**: RootLayout (customer), BackofficeLayout (admin), modular components
- **API client**: systemConfigApi, contentApi, catalogApi, etc. (one per module)
- **Hooks**: usePermissions, useCompanyInfo (cached, config-driven), useAuth
- **Component split**: no file > 200 lines; component folders per feature

## Security & Compliance

- **RBAC**: 11 roles (Admin, Manager, Sale, TechnicianInShop, TechnicianOnSite, Accountant, Marketing, Customer, Supplier, InventoryStaff, HR). Permission matrix in `docs/modules-features-roles-matrix.md`.
- **PII**: Password hashing (bcrypt), SecureString for sensitive fields, no plaintext logs
- **Audit**: all writes logged (user, timestamp, old/new values) via EF Core interceptor
- **Data**: Vietnamese tax compliance (PIT/VAT per law), invoice e-signature support

## Deployment

- Backend: single .NET 8 ASP.NET Core app (ApiGateway) + 15 modules in same assembly
- Frontend: static Vite build → CDN or web server
- Database: Postgres connection string, migration run on startup
- Message broker: RabbitMQ (Docker or managed service)
- Cache: Redis (Docker or managed service)
- Config: appsettings.json + environment overrides

**Note**: Root `package.json` was removed; frontend has its own `package.json` in `/frontend`.
