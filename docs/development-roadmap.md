# Development Roadmap

Quang Hưởng Computer project phases, milestones, and status. Updated continuously as features complete and priorities shift.

## Current Phase: 2026 Q3 — Core Platform Hardening

**Goal**: Transition from MVP to production-ready system. Real data, proper validation, hardened APIs, compliance (tax, audit).

### Phase 1: Company Info + Dynamic Config ✓ COMPLETED (Aug 19)
- [x] Real company data (MST 0200807633) seeded, multi-key config idempotent seeder
- [x] Tax constants → config (PersonalDeduction, DependentDeduction, BaseSalary)
- [x] Frontend hook `use-company-info.ts` (cached, typed, fallback)
- [x] Tests: seeder idempotent, tax engine config-driven, fallback defaults
- [x] Backend build PASS, frontend tsc PASS

**Impact**: All modules now use real company info; tax calculations parameterized; config-first mindset.

### Phase 2: Roles, Permissions & Module Matrix ✓ COMPLETED (Aug 19)
- [x] Unified permission catalog `BuildingBlocks/Security/Permissions.cs` (removed duplicate)
- [x] Two new roles: `InventoryStaff`, `HR` (total 11)
- [x] 5 Inventory endpoints use hằng số role instead of strings
- [x] Permission matrix doc: 15 modules × 11 roles (R/RW/—)
- [x] Seeder idempotent (no duplicate roles/claims)
- [x] Tests: no permission duplicates, 11 roles seed correctly

**Impact**: Single source of truth for auth; menu filtering by role works correctly; backoffice UI can filter per user.

### Phase 3: Customer UI Hacom-Style ✓ COMPLETED (Aug 19)
- [x] 3-tier sticky header (brand strip → utility bar → main nav + sticky compact)
- [x] Sidebar category menu (desktop only, mobile dropdown)
- [x] Product card refactored: 7-tier anatomy, savings %, in-stock badge
- [x] Footer 4-block (newsletter → showroom → links → legal with MST/representative)
- [x] Responsive Tailwind (mobile-first, sm/md/lg/xl breakpoints)
- [x] Design tokens expanded (radius, shadow, success green, savings bg)
- [x] `ContactPage`/`StoresPage`/`AboutPage` use config hook (real company info)
- [x] No hardcoded hex colors in customer components (only in brand-tokens.ts)
- [x] Tests: tsc PASS, npm run build PASS

**Impact**: Customer-facing UI production-ready, brand-aligned, mobile-responsive, info always current.

### Phase 4: Admin Backoffice Redesign ✓ COMPLETED (Aug 19)
- [x] BackofficeLayout refactored: 982 → 142 lines (split sidebar/topbar/breadcrumb)
- [x] Sidebar collapsible (compact icon-only mode, tooltip, persist localStorage)
- [x] Topbar minimal (breadcrumb, search, notifications, avatar menu)
- [x] Menu lọc theo permission (`usePermissions` hook)
- [x] All backoffice components < 200 lines (no mega-components)
- [x] POS receipt template: real company info (MST 0200807633)
- [x] No layout regressions; spacing/token consistency
- [x] Tests: tsc PASS, npm run build PASS

**Impact**: Admin UX cleaner, less cognitive load, permission-aware menu prevents 403 errors, collapsible sidebar saves space on small screens.

### Phase 5: API Fixes + FluentValidation ✓ COMPLETED (Aug 19)
- [x] 8 mock APIs replaced: tax-report, sentiment, invoice HTML, RFM, fulfillment, email, barcode, scorecard
- [x] FluentValidation unified (+ endpoint filter, Vietnamese messages)
- [x] Validator for critical endpoints (Accounting, CRM, Inventory writes)
- [x] Barcode Code128 + QRCoder (actual image generation, not strings)
- [x] SupplierScorecard: `ExpectedDeliveryDate` field added (EF migration)
- [x] Tests: smoke API, validation rejection checks, barcode decoding

**Impact**: APIs return real data from DB; validation consistent, actionable error messages; barcode/QR actually scannable.

### Phase 6: Tests & Verification ✓ COMPLETED (Aug 19)
- [x] Unit tests: config seeder, tax engine, permissions/roles, validation, RFM, scorecard, barcode, invoice HTML
- [x] 75 new tests added (602 → 677 total, all PASS)
- [x] Smoke tests on fixed endpoints (200 responses, real data)
- [x] Frontend: tsc PASS, build PASS
- [x] Grep checks: no hardcoded company info, roles, mocks in prod code
- [x] Updated docs: system-architecture, modules-features-roles-matrix, this roadmap

**Impact**: Regression prevention; documentation synchronized with code; confidence in deployability.

---

## Next Phase: 2026 Q3 Late — UI Refinement & Stock Management

### Phase 7: Manual UI QA + Polish (PENDING)
- **Scope**: Responsive spot-check (mobile/tablet/desktop), header sticky behavior, card hover effects, POS layout print
- **Owner**: QA team + frontend
- **Blockers**: All phase 1-6 PASS (done)
- **Success**: No console errors, screenshots match Figma hacom reference

### Phase 8: Stock Adjust DTO + Validation (IN PROGRESS)
- **Scope**: New DTO for inventory reconciliation (bin count → system count adjustment), validation (qty > 0, warehouse valid)
- **Owner**: Inventory + SystemConfig module
- **Blockers**: None
- **Success**: Endpoint `POST /api/inventory/adjust` returns 400 on invalid qty, 200 on success with audit log

### Phase 9: Customer Page Modularization (IN PROGRESS)
- **Scope**: Split `ProductCatalogPage` / `CategoryPage` (reduce lines, extract filters, sorting, pagination into sub-components)
- **Owner**: Frontend
- **Blockers**: None
- **Success**: Each component < 200 lines, performance (no N+1, memoization on cards)

---

## Backlog (Post Q3)

### High Priority
- [ ] **Remaining endpoint validators** (Sales checkout, Payments, Repair, Warranty claims) — FluentValidation rollout phase 2
- [ ] **SignalR real-time features** (order status push, live inventory, chat) — depends on client need + concurrent user load
- [ ] **Email template engine** (dynamic fields from config, localization) — communication module enhancement

### Medium Priority
- [ ] **Frontend test runner** (Jest/Vitest + API mocking) — YAGNI if no coverage requirement
- [ ] **GraphQL layer** (optional overlay on REST, read-only initially) — consider if complex queries needed
- [ ] **Admin permission matrix UI** (visualize role ↔ permission mappings) — admin convenience, not blocking
- [ ] **Multi-currency support** (price override per market, tax variation) — future expansion

### Low Priority (Wishlist)
- [ ] AI product recommendations (semantic search enrichment)
- [ ] Mobile app (React Native, reuse API client)
- [ ] Third-party integrations (Shopify sync, SAP connector)

---

## Key Metrics

| Metric | Status | Target |
|--------|--------|--------|
| Test coverage | 677 tests, all PASS ✓ | ≥ 650 |
| API mock data | 0 (was 8) ✓ | 0 |
| Component file size | max 198 lines ✓ | < 200 |
| System build time | ~ 30s ✓ | < 60s |
| Frontend build time | 13.15s ✓ | < 30s |
| Hardcoded config | 0 prod occurrences ✓ | 0 |
| Permission catalog consistency | 1 source (BuildingBlocks) ✓ | 1 source |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Manual QA incomplete → regressions in prod | Automated smoke tests + checklist; QA rotation |
| Stock-adjust DTO impacts other inventory flows | Feature flag toggle, DB rollback plan |
| Page modularization intro regressions | Snapshot tests per component, perf monitoring |
| Backlog priorities shift (client demand) | Monthly roadmap sync, sprint planning |

---

## Dependencies

- Phase 7 (UI QA) depends on phase 1-6 COMPLETE ✓
- Phase 8 (stock adjust) independent of phases 1-7
- Phase 9 (page modulization) independent, only cosmetic (no breaking API changes)
- Backlog items mostly independent unless marked otherwise

---

**Last updated**: 2026-08-19  
**Next review**: 2026-09-02
