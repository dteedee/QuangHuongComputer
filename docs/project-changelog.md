# Project Changelog

All notable changes to Quang Hưởng Computer project documented here. Format: date | category | summary.

---

# Hợp nhất về một hệ thống (2026-09-26)

Chọn repo .NET này làm hệ thống duy nhất; các ý tưởng đáng giá của bản dựng thử Go/Nuxt (QHC)
được làm lại ở đây theo chuẩn của repo (không chép code). Mỗi đợt merge đều qua: build solution,
unit, integration (Postgres thật), frontend test, tsc, eslint.

## [2026-09-26] — Đợt 2: tính năng lấy từ QHC
- **Sửa chữa**: báo giá theo dòng (linh kiện/công/dịch vụ) có chiết khấu + VAT tính ở server;
  danh mục dịch vụ sửa chữa chỉnh được; ảnh nhận máy / trước-sau; ưu tiên, hãng/model máy; serial
  linh kiện thay, linh kiện mua ngoài; lịch hẹn có số `LH-…`, trạng thái "khách không đến", sức chứa
  mỗi khung giờ khoá ở Postgres.
- **Hoa hồng kỹ thuật viên**: tính trên tiền công + dịch vụ, duyệt, vào bảng lương (chịu thuế TNCN).
- **Combo sản phẩm** end-to-end (giá combo do server tính, không cộng dồn với coupon); admin trả
  lời đánh giá; khách tải ảnh đánh giá (xoá EXIF/GPS); trang **Cấu hình mẫu** `/cau-hinh-mau`.
- **"Thường được mua cùng"** từ lịch sử đơn 180 ngày; **giao diện chuyển kho** + 5 lỗi chuyển kho
  (huỷ sau khi xuất làm mất hàng, xuất kho đồng thời trừ 2 lần, serial bán được khi đang đi đường,
  giá vốn nhận sai, tên hàng lấy từ client).
- **SEO shell** trả thêm phần thân trang (H1, giá, thông số, link danh mục) cho crawler; route CMS
  `/{slug}`; thanh điều hướng dưới trên mobile; `GET /api/promotions/{id}` công khai không còn lộ
  khuyến mãi nháp/tạm dừng.
- **Cấu hình admin không có hiệu lực (lỗi có sẵn)**: không module nào đăng ký `IAppSettingsStore`,
  nên mọi `IAppSettings` đọc hằng số trong code — admin đổi phí ship, % hoa hồng, sức chứa khung giờ
  đều vô tác dụng. SystemConfig nay cấp store từ bảng `Configurations`; endpoint ghi cấu hình xoá
  snapshot ngay; nhật ký audit không còn ghi rõ giá trị `Secret`.

## [2026-09-26] — Đợt 1: bảo mật + trang còn thiếu
- Refresh token chuyển sang cookie `HttpOnly; Secure; SameSite=Strict`, access token chỉ nằm trong
  bộ nhớ; CSP bỏ `'unsafe-inline'` cho script (API và Caddy dùng chung một chuỗi); mọi HTML nhúng
  qua `SafeHtml`.
- "Đã mua hàng" của đánh giá do server tra đơn; bỏ khoá TOTP chấm công viết cứng; reCAPTCHA được
  server xác minh thật (trước đó token bị bỏ qua) và không còn rơi về khoá test ở production;
  112 chỗ trả `ex.Message` ra client đi qua `ClientSafeError`.
- Trang `/tin-tuc`, `/khuyen-mai`, `/khuyen-mai/:slug`, `/flash-sale`; trình quản lý chuyển hướng
  URL (301/302/410, nhập CSV, tự tạo 301 khi đổi slug sản phẩm/danh mục).

---

# Full-system overhaul (branch `feat/full-system-overhaul`, 2026-09-18 → 2026-09-19)

Waves 0-4, seven commits (two of them are fix commits between waves). Numbers below are the ones
the wave itself verified.

## [2026-09-19] — Security close-out (`2f79ce5`)

### Security
- **Authorization: 39 of 938 endpoints off-standard → 0.** Five were real holes, not just missing
  metadata: `/coupons/apply` and `/promotions/evaluate` distinguished valid from invalid codes at a
  300 req/min limit (a coupon oracle — tightened to 30/min); `GET /recruitment/{id}` used
  `FindAsync` and served Draft/Closed/expired postings to anyone with the guid;
  `POST /content/contact` wrote to the database with no limit; guest order tracking had two factors
  but no rate limit; `POST /ai/search` was an anonymous POST running up to five ILIKE clauses.
  Six endpoints with correct behaviour but missing metadata were declared explicitly
  (`revoke-all-tokens` moved from an empty `RequireAuthorization()` to the named `Authenticated`
  policy). 28 legitimately public endpoints were written into the allow-list with file:line
  evidence (28 → 66 entries).
- **`Security:EndpointAuthorizationAudit:FailOnViolation` turned on**: from now on an endpoint
  without a permission policy stops the API from starting. A trap had to be removed first — the
  hosted-service form of the auditor always saw an empty DI container, so enabling the flag would
  have blocked startup even with a clean route table.
- **CRITICAL — unlimited credit notes.** A manually created invoice has no `OrderId`, so the
  endpoint passed `Guid.Empty`, the service looked the invoice up by `OrderId`, found nothing, and
  the entire cumulative cap sat inside `if (invoice is not null)`. Result: N credit notes each
  worth the full invoice, output VAT never reversed (the derived rate was 0), and no link back to
  the original invoice. Now looked up by invoice id, accumulated over both `OrderId` and
  `OriginalInvoiceId`, and **refused** rather than issued blind when no invoice is found.
- **Secret config values were returned in clear** to any role that can read configuration (measured:
  a Manager could read the SMTP password) and cached in Redis for an hour — the admin read path was
  more open than the public `/public` route, which already filtered `Secret`. Now masked to the last
  four characters, and masked *before* it is cached.
- **Guest cart stored the client-supplied `ProductName`** (the logged-in cart reads it from Catalog)
  — a stored-XSS path and a way to fabricate product names. Name now comes from Catalog, unknown
  `productId` is rejected, quantity is capped.

### Fixed
- `scripts/stack-up.sh` ended with `[ "$SEED_PROFILE" = demo ] && log …` under `set -e`, so every
  **successful** production run exited 1 and `make deploy` always looked like a failure.
- `scripts/gen-secrets.sh` did not generate `ADMIN_INITIAL_PASSWORD`, so an internet-facing server
  was created with the password published in `.env.prod.example`.

### Verification
1330 unit + 63 integration tests green, `tsc` 0 errors, authz audit 938/938, secret masking tried
against the real API (`hunter2-SuperSecret` → `****cret`).

---

## [2026-09-19] — Wave 4: the automated test suite (`3b06f72`)

### Added
- **1329 backend unit tests** (adds PO-approval role guards, review route coverage).
- **48 integration tests**: the *real* ApiGateway on a single-use Postgres Testcontainer, starting
  from an empty database in one command. Covers fresh install (every migration applied, every table
  present, `db seed` run twice changing nothing), the authorization matrix over 13 endpoints, the
  session lifecycle (refresh rotation, reuse detection), checkout money integrity and the SePay
  webhook signature. (63 after the parallel authorization track added its 15 matrix tests.)
- **140 frontend tests** (17 files): guest-cart merge, VAT display, list-page URL state, permission
  guards, VND formatting.
- **42 Playwright E2E specs**, TEST stack only, with a safety stop that throws if the base URL is
  not :5050 — they cannot write into the owner's system.

### Fixed
- **SePay webhook retries were not idempotent.** On a retry the intent was already `Succeeded` and
  therefore no longer in the pending list, so the endpoint wrote a second reconciliation row with a
  false "could not match an order" warning, and the real duplicate guard was never reached.
  Duplicates are now blocked by the `ProcessedWebhooks` table itself (`Provider` + `TransactionId`)
  before anything is written.
- **Process hole**: `qh-build.sh be-test` only ran `UnitTests.csproj`, so the 48 integration tests
  never ran — a wave gate calling `be-test` would have believed they were covered. Split into
  `be-test-integration`, added `be-test-all` for the gate, added IntegrationTests to the solution.

---

## [2026-09-19] — Two blocking runtime defects found by sweeping every route in a browser (`d5d6f64`)

### Fixed
- **2025 administrative-division data**: 25 of 34 provinces had unquoted numeric codes (10–34);
  only 01–09 were quoted because of the leading zero. The C# model declares `string`, so
  `System.Text.Json` threw and `GET /api/sales/shipping/provinces` returned 500 — **no address
  could be chosen at checkout**. 25 codes re-quoted; invariants (34 provinces / 3321 wards) unchanged.
- **CRM**: four `GroupBy` queries projected straight into a record constructor; EF Core 8 cannot
  translate that, so `/backoffice/crm` returned 400. Projected to an anonymous type and mapped after.

### Verification
14 public + 19 admin routes swept in a real Chrome session while logged in as admin: 0 console
errors, 0 failing requests, 0 crashed pages, no horizontal overflow. 1323/1323 tests.

---

## [2026-09-19] — Wave 3: the whole frontend rebuilt on the design system (`bc8a553`)

19 parallel work items, each independently reviewed. Every screen was built against the wave-2 API
contracts in `docs/api-contracts/`, using the agreed tokens and motion spec, reusing the UI kit.

### Changed
- `ProductCatalogPage` and `CategoryPage` merged into **one URL-driven listing page** serving
  `/san-pham`, `/danh-muc/:slug` and `/tim-kiem`; an unknown slug now renders "not found" instead of
  dumping the whole catalogue.
- Header: mega menu from the real category tree, search suggestions with image/price/stock, and a
  mobile search overlay (the magnifier used to open a page with no input field).
- Homepage blocks filter **server-side** instead of filtering a 50-product page in the client.
- Product detail requests `include=media,specs,variants` correctly (the old code sent an invalid
  parameter, so every array came back null and specs were inferred from a string).
- Rebuilt: cart, checkout, VietQR payment, account area, PC builder; admin products/orders/CMS/
  promotions/system, contact inbox; POS, warehouse operations, bulk import and printing; HR,
  accounting, CRM, repair intake and warranty.

### Fixed
- 27 dead files deleted (tracks could not delete them themselves — sandbox blocked `rm`), with
  `tsc` as the arbiter that nothing still imported them.
- SEO: filter/search pages emitted `noindex, nofollow`; `nofollow` also cuts the crawl path to the
  product pages, de-indexing the PDPs themselves. Now `noindex, follow` (D11).
- Missing `BACKOFFICE` route constants added.

### Verification
`tsc` 0 errors, lint 0 errors, 1323/1323 unit tests; home/list/detail/cart driven in a real browser
with 0 console errors, 0 broken requests, 0 broken images; 9 back-office pages opened as admin, none
crashed.

---

## [2026-09-18] — Wave 2: every backend module rewritten so the business flows close (`1178c6d`)

25 parallel work items, each independently reviewed. Every module published an API contract under
`docs/api-contracts/` for wave 3 to build against.

### Changed — money and accounting
- Deleted the demo invoice consumer (it computed in USD, **added** 10 % VAT, ignored discounts and
  shipping, and produced duplicates on re-run). Replaced with VAT **extracted** from VAT-inclusive
  prices (D01), so the invoice total matches the order total to the đồng; two layers of duplicate
  protection.
- Credit notes became a real aggregate with a cap against the original invoice total; the duplicate
  issue path through `RefundRequested` was removed.
- Real cashier-shift reconciliation (expected cash, variance, second approver) and a cash book.
- E-invoice: a neutral adapter with three modes (D07); the MISA provider that called an invented API
  was deleted; running simulation mode in Production now blocks startup.
- VNPay: full provider plus tests; the v2 IPN/return routes now answer 503/302 instead of 404.

### Changed — sales and inventory
- One checkout path, a real order state machine, time-boxed stock reservation.
- A separate POS backend, returns, loyalty points, admin-side order management.
- One inventory ledger; GRN is the only way stock comes in; PR/RFQ/PO closed end to end.
- B2B quotations, installments as leads, shipping fees computed server-side from the 2025 division codes.

### Changed — the rest
- Catalog: media/specs/variants/facets, review statistics and view counts computed for real.
- Warranty activated per order, full claim lifecycle, RMA.
- Repair: counter intake, quotation, parts actually deducted from stock, payment, handover.
- HR: employees linked to accounts, attendance in Vietnam time, payroll from statutory parameters (D06).
- CRM customer 360; reporting on a **single** revenue definition.
- SEO shell: server-rendered head + JSON-LD, `sitemap.xml`, real status codes (D11).
- Bulk Excel import for products and stock.

### Fixed at the wave gate (cross-item integration defects)
- The host never called `AddPlatformKernel()`, so `IAppSettings`/`IBusinessClock` were absent from DI
  and the API could not even build its route table.
- `AddSeoShell()` was never called although `Program.cs` already called `MapSeoShell()`.
- Two `IUserDirectory` interfaces with the same name; the shared one was unregistered, so CRM could
  not start.
- `ReturnOrchestrator`: a tracking query projected an owned entity outside its owner — **every**
  refund calculation threw at runtime.
- Registered the VNPay v2 routes and the reconciliation job; HttpClient timeout 15 s instead of the
  100 s default.
- Golden-file test for the enum dictionary: `docs/database-enums.md` regenerated.

### Verification
Solution build 0 errors, `tsc` 0 errors, 1323/1323 unit tests, dev API healthy (`health/ready` 200),
938 endpoints, 68 products served.

---

## [2026-09-18] — Wave 1: the platform frozen for every later wave (`8b081ad`)

15 parallel work items. The main deliverable of each was a document in `docs/`, because 40+ later
items build on it.

### Added — authorization (fail-closed)
- Catalog of permissions 90 → 120; the role matrix is versioned, so an admin's manual revocation is
  not overwritten by the next startup.
- `RequireModulePermissions` convention plus a public allow-list of 28 routes, each with evidence.
- The startup audit learned to read the real route table: it reported 22/780 endpoints off-standard,
  and a configuration flag turns the warning into a refusal to start.
- Anonymous requests now get 401, not 403.

### Added — backend platform
- Kernel: error contract, validation, paging, document numbering, `IBusinessClock` in Vietnam time.
- Tax/payroll kernel: D01 VAT arithmetic, statutory parameters with effective dates (D06).
- Identity: real 2FA, real sessions, token revocation.
- Messaging: one broker configuration, a working outbox, one queued email path.
- Storage: one abstraction, correct image URLs in every environment (D02).
- Schema: concurrency tokens, constraints, indexes, money precision (11 migrations).
- Runtime: `db migrate` / `db seed` commands, seed profiles per environment.

### Added — frontend platform
- Design system: semantic light/dark tokens, type scale, motion to spec (8 durations, 4 easings,
  3 springs, 40/50 ms stagger capped after 6 items).
- One UI kit; the parallel primitive sets were removed.
- App shell: typed route manifest, permission guards, generated menu.
- Form kit (RHF + Zod) and an API layer split by consumer.

### Changed — deployment (D05)
- Caddy replaces nginx (automatic HTTPS), compose slimmed down, encrypted off-site backups.
- MinIO removed, the monitoring stack removed, the old deployment scripts removed.

### Fixed at the wave gate
- RabbitMQ health check: package 8.0.1 called `IModel`, removed in client 7.x, so `/health` returned
  503 while the system was fine (Docker and Caddy would have declared the app dead). Replaced with a
  small health check on client 7, dropping the conflicting dependency.
- The authorization audit was wired into `Program.cs` after every `app.Map*` has run.
- Tripwire baselines rebased after D03 deleted test users (30 → 9) and the 68 SKUs were loaded.

### Verification
Solution build 0 errors, `tsc` 0 errors, 1163/1163 unit tests (+282), `/health`, `/health/live`,
`/health/ready` all 200.

---

## [2026-09-18] — Wave 0: stop the bleeding (`387bc39`)

13 parallel work items. What was broken and exploitable **today**.

### Security
- Checkout no longer trusts `manualDiscount` / `customerId` / `shippingFee` from the client
  (customers could buy at 0 đ and place orders under someone else's name).
- CRM (52 endpoints) and the purchasing / PO-approval endpoints now require the right role.
- Password reset: CSPRNG code, stored hashed and bound to the email, 5 attempts, refresh tokens revoked.
- Payment webhooks fail closed; the amount comes from the order, never from the client.
- Every "fake successful payment" path deleted.
- 11 system roles cannot be deleted or renamed; the last admin cannot be demoted.
- Audit log no longer records `PasswordHash`/`SecurityStamp`/tokens; two SMTP-password leaks closed.
- Policy-based rate limits attached to the public endpoints.

### Fixed — unusable
- Added the `payments.PaymentIntents` table (missing migration → every payment returned 500).
- Cart no longer 400s when a product has several stock rows; search is case- and accent-insensitive.
- Payroll no longer throws; 5 reporting endpoints no longer 400; chat can store messages again.
- Back-office reopened for HR / warehouse / marketing.
- The admin product page no longer loses data when switching tabs.
- COD checkout ends on the thank-you page and survives a reload.
- Two crashing pages fixed (purchase requisition, menu management).

### Changed — business rules
- VAT extracted per line instead of adding 8 % on top (D01).
- No more phantom stock: Inventory is the single source of stock.
- Categories and brands have slugs; warranty columns per product (D08).
- The repair booking page is in Vietnamese and the invented USD fee is gone.

### Added — data and tooling
- 70 verified product records (manufacturer photographs and specifications from the vendors' own
  pages) with an idempotent importer and a guarded cleanup script (D03) — 68 import, 2 are rejected.
- An isolated TEST environment (own DB / vhost / Redis / webroot / SMTP) plus 5 isolation probes.
- The `qh-*` scripts: locked builds, probes that refuse to write to the wrong target, a data
  tripwire, checkpoints.

### Verification
Solution build 0 errors, `tsc` 0 errors, 881/881 unit tests, 4 new migrations, all 13 items' runtime
probes passing.

---

## [2026-08-24] — Admin Workflow Completion, CRUD & System Config

### Added
- **BE Endpoints**: DELETE `/admin/cms-pages/{id}`, POST `/api/auth/users` (user creation), PUT `/api/auth/roles/{id}` (role update), GET `/api/catalog/categories/{id}`, `/api/catalog/brands/{id}`, PUT/DELETE `/api/catalog/bundles/{id}`, POST `/api/config/bulk` (batch config update)
- **ConfigPortal enhancements**: Dynamic category selection, add/delete config keys UI, bulk save via POST `/api/config/bulk`, removed hardcoded DEFAULT_CONFIGS (now seeded in BE)
- **FE UI**: Delete product button (inventory), Cancel order button (sales), Role create/delete buttons (admin), CMS page delete button, route guards for Admin/Manager-only pages

### Changed
- **FE API wiring fixes** (HIGH): Promotions/Store endpoints had double `/api` prefix + wrong base URL, fixed all 6 API client modules (`promotions-api.ts`, `stores-api.ts`, `2fa-api.ts`, `sessions-api.ts`, `inventory-api.ts`, `hr-api.ts`)
- **Authorization hardening** (HIGH): Fixed claim case inconsistency (`permission` → `Permission`) in `PermissionAuthorizationHandler`; removed redundant 401 interceptor from `client.ts` (kept `auth.ts` DRY); seed/webhook-mock endpoints gated with `IsDevelopment()` check; tightened role requirements for Inventory/Communication modules
- **Media upload cleanup**: Removed duplicate unauthed upload endpoint from ApiGateway, kept `MediaEndpoints.cs` version with `RequireRole + FileValidator`
- **System-health metrics** (IMPROVED): Replaced mock `Random()` data with real measurements: process CPU time, working set, DB connectivity check, Redis/RabbitMQ ping; returns `null` when metric unavailable

### Fixed
- **Dead code removal** (SECURITY): Removed 4 unused MVC controllers (`OrdersController`, `CartController`, `AccountingController`, `RepairController`); verified FE not calling them via grep
- **CRM AutomationRuleEndpoints**: Confirmed dead code (namespace resolution issue), deleted file instead of adding policy
- **FE cleanup**: Removed 3 orphan files (`admin/AdminDashboard.tsx`, `admin/RolesPage.tsx`, `admin/UsersPage.tsx`); redirected `/backoffice/admin/dynamic-permissions` → `/backoffice/roles`

### Security
- **HIGH**: Authorization policy gap closed (claim case mismatch prevented valid admin access in edge cases)
- **HIGH**: Media upload enforces auth + file validation (was public endpoint in Gateway)
- **HIGH**: Seed/development endpoints gated by `IsDevelopment()` to prevent accidental exposure
- **MEDIUM**: Removed 4 dead MVC controllers (attack surface reduction)

### Quality
- `dotnet build` ✓
- `npm run build` ✓
- Full endpoint audit completed; no orphan routes
- Config seeder idempotent (admin edits preserved)

---

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
