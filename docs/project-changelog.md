# Project Changelog

All notable changes to Quang Hưởng Computer project documented here. Format: date | category | summary.

## [2026-08-19] — Company Info + UI Redesign + API Hardening

### Added
- **Real company data**: Công ty TNHH Máy Tính Quang Hưởng (MST 0200807633), full legal info seed in SystemConfig, dynamic fallback hook `use-company-info.ts` (frontend)
- **Dynamic configuration**: Config seeder idempotent (upsert by key, respect admin edits), tax constants `TAX_PERSONAL_DEDUCTION`, `TAX_DEPENDENT_DEDUCTION`, `TAX_BASE_SALARY` moved to config (ConfigurationEntry), `ITaxSettingsProvider` abstraction for consumption
- **Two new roles**: `InventoryStaff` (stock/GRN/scorecard), `HR` (payroll/attendance); total 11 roles (was 9). Roles now in `BuildingBlocks/Security/Permissions.cs` (canonical), spread via reflection-based permission registration
- **Customer UI hacom-style**: 3-tier sticky header (brand strip → utility bar → main nav), sidebar category menu, product card anatomy 7-tier (image→rating→SKU→name→old price gashed + savings %→red price→in-stock badge), footer 4-block + legal (MST/representative). Responsive mobile-first Tailwind breakpoints
- **Admin backoffice refactored**: BackofficeLayout split from 982→142 lines (sidebar collapsible persist localStorage, topbar minimal, breadcrumb, permission-filtered menu), components modularized `< 200 lines` per file
- **8 API mocks replaced**: tax-report (real query), catalog sentiment (real review calc), invoice HTML template (real layout company info), RFM scoring (real D/F/M calc), order fulfillment (real event via MassTransit), email notifications (real SMTP), barcode/QR (Code128 + QRCoder actual generation), supplier scorecard (added `ExpectedDeliveryDate` field, on-time rate calc)
- **FluentValidation + unified endpoint filter**: request validation 400 error payload `{ errors: [{ field, message }] }` Vietnamese messages for critical write endpoints (Accounting, CRM, Inventory)
- **Design tokens expanded**: radius (8/12/14px), shadow (small/medium/large), success green `#2CC067`, savings badge bg `#FEF2F2`, token Tailwind integration
- **75 new unit tests**: test SystemConfig seeder (idempotent, placeholder replacement), tax engine (config-driven, fallback), permissions/roles (11 roles, no duplicates), FluentValidation (Vietnamese messages), RFM, supplier scorecard, barcode generation, invoice HTML template. Test suite 602→677 total, all PASS

### Changed
- **Backend architecture documented**: clarified modular monolith (not microservices), 15 modules, EF Core multi-DbContext, MassTransit/RabbitMQ, Redis cache, SignalR
- **Frontend stack documented**: Vite 6 (not Next.js), React 18, TypeScript, Tailwind (not Prisma)
- **Permissions canonical source**: `BuildingBlocks/Security/Permissions.cs` (removed tricky `Services/Identity/Permissions/SystemPermissions.cs` duplicate)
- **Tax engine**: read config values with sensible fallback defaults, not hardcoded constants
- **Footer/Contact/Stores**: company info from config hook (single source of truth), fallback to seed values
- **POS receipt template**: MST `0400000000` → `0200807633` (real tax code)
- **Product card**: refactored 7-tier layout, calculateSavingsPercent, real in-stock badge

### Fixed
- **CRM lead password hash**: security issue (now proper bcrypt + Salt)
- **Customer UI regression**: ensured ProductCard props stable, no layout shift (skeleton matched)
- **Admin menu permission filter**: applied `usePermissions()` hook, no 403 surprises for valid users

### Deprecated
- Next.js root package.json (deleted, frontend standalone)
- `Services/Identity/Permissions/SystemPermissions.cs` catalog (canonical is BuildingBlocks now)

### Security
- Tax config not public (filtered `isPublic: false` in endpoint)
- Validation messages don't leak system details
- Password field masked on POS receipt (customer UI)

### Quality
- `dotnet build backend/ComputerCompany.sln` ✓
- `cd frontend && npx tsc --noEmit` ✓
- `npm run build` ✓ (13.15s)
- `dotnet test` ✓ 677/677 tests
- Grep zero hardcoded placeholders in prod code
- No file > 200 lines (modularized BackofficeLayout, seeder, validators)

### Backlog / Next Phase
- Manual UI QA (responsive mobile/tablet/desktop, header sticky, card hover effects, POS layout) — **PENDING**
- Stock-adjust DTO for inventory reconciliation + validation — **IN PROGRESS**
- Customer page modularization (reduce ProductCatalogPage/CategoryPage lines) — **IN PROGRESS**
- Remaining endpoint validators (Sales checkout, Payments, Repair, Warranty claims) — backlog
- Frontend test runner setup (Jest/Vitest + mocking) — YAGNI if coverage not required
- SignalR real-time features (chat, live notifications) — backlog, depends on client need
- GraphQL layer (optional, REST stable) — backlog

---

**Metrics**: 
- 15 backend modules, 11 roles, 1 unified permission catalog
- 677 unit tests (↑75), all PASS
- 0 hardcoded company info, 100% from config
- 0 API mock data (8 replaced with real logic)
- 4 docs created/updated (system-architecture, modules-features-roles-matrix, hacom-design-reference, this changelog)
