# Development Roadmap

Status of the Quang Hưởng Computer system. Written 2026-09-19 on branch
`feat/full-system-overhaul`, after the four overhaul waves and the closing security review.

**This document does not say "production ready".** Everything below is either verified by a command
that was run, or listed as open. The open list is in *What is left*.

---

## Done — the full-system overhaul (2026-09-18 → 2026-09-19)

| Wave | Commit | What it did | Verified by |
|---|---|---|---|
| 0 — stop the bleeding | `387bc39` | Money and authorization holes closed, 500s eliminated, real product data loaded, isolated TEST environment and the `qh-*` tooling | solution 0 errors, `tsc` 0, 881/881 unit tests, 13 runtime probes |
| 1 — freeze the platform | `8b081ad` | Permission catalog + fail-closed audit, kernels (errors, paging, clock, tax/payroll), identity, messaging, storage, schema integrity, `db migrate`/`db seed`; design system, UI kit, app shell, form kit; Caddy-based deploy stack (D05) | solution 0 errors, `tsc` 0, 1163/1163 unit tests, health endpoints 200 |
| 2 — rewrite each backend module | `1178c6d` | 25 items; every business flow closes end to end; each module published an API contract in `docs/api-contracts/`; SEO shell (D11) | solution 0 errors, `tsc` 0, 1323/1323, 938 endpoints, 68 products served |
| 3 — rebuild the frontend | `bc8a553` | 19 items; every screen on the design system and the wave-2 contracts; storefront, admin, back-office | `tsc` 0, lint 0, 1323/1323, real-browser sweep of storefront + 9 back-office pages |
| — route sweep fixes | `d5d6f64` | Two blocking runtime defects found by driving every route in a real browser (shipping provinces 500 → no address at checkout; CRM 400) | 33 routes swept, 0 console errors, 1323/1323 |
| 4 — the test suite | `3b06f72` | 4 test layers (unit / integration / frontend / E2E) + the SePay webhook idempotency fix + the `be-test` gate hole | 1329 unit + 48 integration + 140 frontend, E2E on the TEST stack |
| — security close-out | `2f79ce5` | 39/938 endpoints off-standard → 0, fail-closed startup audit switched on, 4 serious holes closed, 2 deployment defects fixed | 1330 unit + 63 integration, authz audit 938/938 |

Alongside those: a **deployment rehearsal from a clean clone** (`reports/w4-5-deploy-rehearsal.md`)
proved build → empty DB → migrate → seed → HTTPS edge → 68 products → admin login → encrypted
backup → **restore drill PASS**, and produced 6 fixes plus the rewritten `docs/deployment-guide.md`.

### Where the system stands, in numbers

| | |
|---|---|
| Backend modules | 15 |
| Endpoints | 938, all on a permission policy or the 66-entry public allow-list |
| Startup behaviour | an endpoint without a policy **stops the API from starting** |
| Roles | 11 |
| Tests | 1330 unit · 63 integration · 140 frontend · 42 E2E |
| Catalogue | 70 curated records → 68 live, 2 rejected |
| Restore drill | passed against an age-encrypted dump (172 tables, 68 products) |

---

## What is left

### 1. Open findings from the final security review

`plans/260917-2100-full-system-overhaul/reports/w4-5-security-review.md` is the live list — a
money-path fix track was still landing changes in `Sales`/`Accounting`/`Payments` while this was
written, so check that report before acting on any line here.

**Closed already**: C1 (unlimited credit notes) and H5 (secret config values readable in clear) in
`2f79ce5`; H1 (second return completion inflating stock forever) in the review track itself.

**Open, high:**
- **H2** — refund vouchers can be created and approved without limit: `AmountRefunded` only rises at
  completion, so N vouchers each worth the full amount all pass. Refunds are manual bank transfers,
  so real money can leave before the 409. *(fix in progress on the money-path track)*
- **H3** — the tax report aggregates Draft and Cancelled invoices and ignores credit notes: the
  01/GTGT declaration and the CIT revenue figure are overstated. **A tax-filing error, not just a
  bug.** *(fix in progress)*
- **H4** — `apply-payment` subtracts the same payments twice, so an instalment invoice can never be
  settled (one-line fix). *(fix in progress)*

**Open, medium (11):** non-unique payment idempotency index (M1); a coupon that exists in both
`Promotions` and `Coupons` is discounted twice (M2); `Tiered` promotions do not cap percent at 100
(M3); percentage discounts rounded to 2 decimals instead of to the đồng, so
`Subtotal − Discount + Ship ≠ Total` by up to 0.99 đ (M4); quoted and charged shipping fees read two
different configuration sources (M5); 54 `catch (InvalidOperationException) → return ex.Message`
sites leak schema detail in Production (M6); opening-balance seeding never sets the intended average
cost (M7); landed-cost allocation inflates average cost on a partly sold batch (M8); rejected goods
are received at full price and never written off (M9); input VAT on goods receipts is always 0 (M10);
a hard-coded JWT fallback key survives as dead code with no startup guard on `Jwt:Key` (M11).

**Open, low (6):** hard-coded attendance TOTP secret (L1); webhook succeeds without an amount
comparison when the gateway sends none (L2); variant price lookup not scoped by product (L3); a dead
`CreatePaymentIntentCommand` that trusts a client amount (L4); warranty-by-serial lookup without an
ownership check (L5); reCAPTCHA silently falls back to Google's always-pass test key when the env var
is missing (L6).

Five questions in that report need the owner's answer before some of the fixes can be finished
(credit notes on invoices with no order; reuse of payment `Reference`; which period a credit note
belongs to; the single source for shipping fees; per-line tax rates on returns).

### 2. Two products ship without images

The importer is fail-closed on images (D02): a record whose `imageStatus` is not exactly `ok` is
reported and skipped, never padded with a substitute picture. Two of the 70 curated records are
therefore **not** in the storefront:

| Product | SKU | Status |
|---|---|---|
| Màn Hình Gaming AOC 24G4E/74 23.8" FHD Fast IPS 180Hz | `AOC24G4E74` | `partial` — not enough compliant manufacturer photographs |
| CPU Intel Core i5-12400F Box Chính Hãng | `INT-BX8071512400F` | `failed` — no compliant manufacturer photographs found |

To ship them, add compliant images to the media manifest and flip `imageStatus` to `ok`; re-running
`db seed` then imports them. Until then the storefront has **68** products, not 70.

### 3. Go-live blocker — the e-commerce platform notification (D09)

Under the framework in force since 2026-07-01 (Luật TMĐT 2025 no. 122/2025/QH15 + NĐ
248/2026/NĐ-CP, which repealed NĐ 52/2013 and NĐ 85/2021), this website is an e-commerce platform
selling directly with online ordering. **NĐ 248/2026 Đ.23.1: the notification must be confirmed
*before* the platform is operated**; the dossier goes to the provincial People's Committee (Đ.24,
Đ.51.1), and Đ.23.3 requires an amendment within 20 working days after a change of domain, of the
person responsible for operations, of the business-registration details, or of the published
operating/transaction terms.

This is paperwork, not code, and **nothing in the repository can satisfy it**. It must be on the
go-live checklist. Related, also from D09 and still unresolved:

- `COMPANY_REGISTRATION_PLACE` is deliberately seeded **empty** — no source verified where the
  business-registration certificate was issued, and NĐ 248 Đ.4.2 requires it in the footer.
- Opening hours could not be verified from any public source; the seeded value is the owner's own
  earlier entry (07:00–17:15, Mon–Sat).
- The two public registries disagree on the company's status ("temporarily suspended" vs "active")
  and on the date operations began.
- The complaints block required by NĐ 248 Đ.7 (at least one online channel, the procedure, an
  initial response deadline and an expected resolution deadline) must carry real deadlines.

### 4. Deployment items the rehearsal could not prove

From `reports/w4-5-deploy-rehearsal.md` (all of them are "unproven", not "broken"):

- `make deploy TAG=…` has never run against a real registry — `ghcr.io/quanghuongcomputer/*` does
  not exist, so the CI publish path in `.github/workflows/deploy.yml` is untested. Only the local
  `make prod-build` path was rehearsed.
- Real HTTPS/ACME was never exercised (no public domain in the rehearsal). The Caddyfile adapts to
  `:443` correctly, but the first certificate issue on the real VPS is unproven.
- The off-site backup push (`rclone`) is untested — no bucket credentials. Local encrypted backups
  and the restore drill are proven.
- The catalogue dataset is bind-mounted into the one-shot `migrate` container, which keeps the git
  checkout as a runtime dependency of `make deploy`. Copying it into the API image would be cleaner;
  the owner has to choose.
- `media-data` is empty on a fresh install (seed images are baked into the API image; the volume only
  holds runtime uploads) — expected, but worth knowing before reading a backup warning.

**Fixed since that report:** D-8, the broken `db seed` idempotency contract. A second and third run
now report `0 change(s)`; see below.

### 5. Deferred by decision, not forgotten

`plans/260917-2100-full-system-overhaul/backlog.md` lists everything deliberately left out (YAGNI)
with the condition that pulls it back: MoMo / SePay cards / payOS / VNPay instalments (all blocked on
owner paperwork), bulk specification import, per-product serial flags, per-customer credit limits,
carrier label APIs, S3/R2 storage, PITR and a monitoring stack, storefront SSR,
`timestamp → timestamptz` for the remaining columns, per-module database schemas.

---

## Recently closed

### `db seed` idempotency (D-8 from the deployment rehearsal) — fixed 2026-09-19

A second `db seed --profile reference` reported `catalog.products: 10 change(s)` on every run,
forever. Cause: `CatalogReferenceImporter.Snapshot(Category)` compared rows by interpolating them
into a string, and `Category.VatRate` is `numeric(5,4)` — Postgres returns `0.1000` while the
taxonomy file's `0.10` deserialises as `0.10`. The two decimals are *equal*, so EF marked nothing
modified and **no row was ever written**; only the counter lied. The product importer had already
learned this lesson (`ProductDatasetImporter.Snapshot` normalises money through an invariant format);
the category path had not. The same invariant formatting is now applied, which also removes a latent
culture dependency.

The integration suite could not catch it because the dataset directory is found by walking up from
the test assembly, and `qh-build.sh` builds to an artifacts path outside the repository — so the
`catalog.products` step was skipped with a warning and the existing "seed twice" test was vacuous.
The fixture now sets `QH_IMPORT_DATASET` explicitly, the test asserts that the catalogue really
loaded before asserting idempotency, and it seeds a third time as well.

Measured: with the old comparison the test fails with `found 10`; with the fix, second and third runs
report **0**.

---

## Risks

| Risk | Mitigation |
|---|---|
| Open accounting findings (H3, M9, M10) distort tax and supplier figures | They are listed above with file:line evidence; fix before the first VAT declaration, not before launch traffic |
| The go-live notification is paperwork with an external turnaround | Start the dossier now; it blocks operating the platform, not developing it |
| The publish/ACME/off-site-backup paths are unproven | Rehearse them once on the real VPS before switching DNS over |
| A future endpoint ships without a permission policy | Already mitigated: the startup audit fails closed |
| A future seeder writes on every run and hides real drift | Already mitigated: the integration suite seeds twice (and a third time) and asserts 0 changes |

---

**Last updated**: 2026-09-19
**Sources**: `plans/260917-2100-full-system-overhaul/reports/w4-5-*.md`, `decisions/D01–D12`,
`backlog.md`, and the git history of this branch.
