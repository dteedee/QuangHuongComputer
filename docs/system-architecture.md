# System Architecture

Quang Huong Computer uses a **modular monolith pattern** with .NET 8 backend (composition root via ApiGateway) and Vite 6/React 18 SPA frontend. All business logic segregated into 15 service modules using domain-driven design, coordinated via MassTransit event bus over RabbitMQ, with PostgreSQL 16 data stores and Redis distributed caching.

**Current shape (2026-09-19, branch `feat/full-system-overhaul`).** 15 modules · **938 endpoints**, every one of them behind a named permission policy or the documented public allow-list, enforced by a **fail-closed startup audit** · one frontend design system and one UI kit · a server-rendered SEO shell in front of the SPA · 1330 backend unit tests + 63 integration tests + 140 frontend tests + 42 Playwright specs.

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

## SEO shell (D11)

The SPA alone gives a crawler an empty `<div id="root">`. `backend/ApiGateway/Seo/` renders a
server-side shell for the routes that must be indexable:

- `GET /_shell/{**path}` — real `<title>`, meta description, canonical, Open Graph and JSON-LD
  built from the database for the requested slug; Caddy routes bots and link-preview agents here.
- `GET /sitemap.xml`, `GET /robots.txt` — generated from the live catalogue and CMS pages.
- **Real status codes**: an unknown slug is a 404, not a 200 with an empty shell.
- Filter/search result pages emit `noindex, follow` — `nofollow` would cut the crawl path to the
  product pages themselves.

Contract: `docs/seo-shell.md`, `docs/seo-url-contract.md`.

## Frontend (Vite 6 SPA)

- **React 18**, TypeScript (strict), Tailwind CSS.
- **One design system** (`frontend/src/design-system/`): semantic light/dark tokens, type scale and
  a specified motion system (8 durations, 4 easings, 3 springs, 40/50 ms stagger capped after 6
  items). Parallel primitive sets were removed during wave 1 — see `docs/design-guidelines.md`.
- **One UI kit** (`frontend/src/components/ui/`, documented in `docs/ui-kit-components.md`);
  screens compose it instead of re-inventing components.
- **App shell**: typed route manifest, permission guards, menu generated from the manifest.
- **Form kit**: React Hook Form + Zod (`docs/frontend-form-kit.md`).
- **API layer**: one client per module, built against the contracts in `docs/api-contracts/`.
- **Layouts**: RootLayout (storefront), BackofficeLayout (staff/admin).
- Storefront listing is a single URL-driven page serving `/san-pham`, `/danh-muc/:slug` and
  `/tim-kiem`.

## Security & Compliance

- **Endpoint authorization**: all 938 endpoints resolve to a named permission policy or an entry in
  the public allow-list (66 entries, each justified with file:line). A hosted startup audit walks
  the real route table; `Security:EndpointAuthorizationAudit:FailOnViolation` is **on**, so an
  endpoint without a policy stops the API from starting rather than shipping open.
  See `docs/permission-matrix.md`, `docs/endpoint-authorization-map.md`.
- **RBAC**: 11 roles (Admin, Manager, Sale, TechnicianInShop, TechnicianOnSite, Accountant,
  Marketing, Customer, Supplier, InventoryStaff, HR); versioned role-permission matrix so an
  admin's manual revocation is not overwritten by the next seeder run.
- **Identity**: JWT (HS256, validated issuer/audience/lifetime/key), 60-minute access tokens,
  refresh tokens hashed at rest with rotation and reuse detection, real revocation (security
  stamp checked per request), 2FA.
- **Money paths fail closed**: prices, quantities and shipping fees are rebuilt server-side at
  checkout; payment webhooks verify HMAC on the raw body with constant-time comparison, refuse to
  run at all when the secret is empty or a placeholder (503), compare the amount before succeeding,
  and are idempotent through a unique `(Provider, TransactionId)` index in the same transaction.
- **Rate limiting** by policy on public endpoints (auth, contact, lookup, AI) on top of a global cap.
- **Audit**: writes logged via an EF Core interceptor; secrets scrubbed at both write points, and
  `ValueType = Secret` config values are masked before they are cached or returned.
- **Data**: Vietnamese tax rules (VAT extracted from VAT-inclusive prices per D01, statutory
  payroll parameters per D06), neutral e-invoice adapter with three modes (D07).

## Deployment

- One image for the backend (ApiGateway + the 15 modules), one for the built SPA served by **Caddy**
  (which also terminates TLS via ACME). No nginx, no Kubernetes, no Prometheus/Grafana, no MinIO —
  all removed in wave 1 (D05).
- `scripts/stack-up.sh` is the single bring-up sequence for both `make up` and `make deploy`:
  infra → safety stop → pre-migrate dump → one-shot `db migrate` + `db seed --profile <profile>` →
  api + web. Migrations run as a job, not on API start.
- Backups: a sidecar takes tiered dumps, optionally age-encrypted, with a restore drill that
  actually restores and asserts on the restored database.
- Config: `appsettings.json` + environment overrides; every secret comes from the env file.
- The rehearsed procedure is `docs/deployment-guide.md`.

**Note**: Root `package.json` was removed; frontend has its own `package.json` in `/frontend`.
