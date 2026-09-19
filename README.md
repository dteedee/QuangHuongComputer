# Quang Hương Computer — E-commerce & Management System

.NET 8 · React 18 / Vite 6 · PostgreSQL 16 · Redis 7 · RabbitMQ · Caddy

A single system for one computer shop in Vĩnh Bảo, Hải Phòng: the public storefront, the
in-store POS, inventory and purchasing, repair and warranty, HR and accounting, CRM and
reporting — all in one deployable application.

> **Status (2026-09-19, branch `feat/full-system-overhaul`).** The four overhaul waves are done
> and a deployment rehearsal from a clean clone succeeded end to end. It is **not** "100 %
> production ready": open defects, the two products that ship without images, and one legal
> blocker are listed honestly in `docs/development-roadmap.md` → *What is left*.

---

## Architecture in one paragraph

**Modular monolith, not microservices.** One ASP.NET Core application (`backend/ApiGateway`) is
the composition root; 15 business modules live under `backend/Services/<Module>/`, each owning its
own domain, endpoints, `DbContext` and migrations. Modules talk to each other in-process, or
asynchronously through MassTransit over RabbitMQ (outbox pattern). PostgreSQL 16 is the only
data store, Redis the cache, SignalR the real-time channel. The frontend is a Vite 6 SPA;
crawlers and link previews are served by a server-rendered **SEO shell** (`/_shell/**`,
`/sitemap.xml`, `/robots.txt`) that emits the real `<title>`, meta and JSON-LD from the database.
Caddy terminates TLS and serves the built SPA. See `docs/system-architecture.md`.

### The 15 modules

Identity · Catalog · Sales · Inventory · Accounting · Repair · Warranty · HR · CRM · Content ·
Reporting · SystemConfig · Payments · Communication · Ai

### Authorization

All **938 endpoints** carry either a named permission policy or an entry in the public allow-list
(66 documented entries, each with a file:line justification). A startup audit walks the live
route table and, with `Security:EndpointAuthorizationAudit:FailOnViolation` enabled (the default
on this branch), **refuses to start the API** if a single endpoint is missing one. Roles: 11.
See `docs/permission-matrix.md` and `docs/endpoint-authorization-map.md`.

---

## Repository layout

```
backend/
  ApiGateway/        composition root: DI, middleware, route table, db migrate/seed CLI, SEO shell
  BuildingBlocks/    shared kernel: RBAC catalog, tax engine (VAT/PIT), validation, messaging, EF base
  Services/          the 15 modules
  Tests/UnitTests/   1330 tests
  Tests/IntegrationTests/  63 tests — real ApiGateway on a throwaway Postgres Testcontainer
frontend/            Vite 6 SPA (design system + one UI kit + app shell + pages)
e2e/                 Playwright specs (TEST stack only, hard-fails if the base URL is not :5050)
deploy/              Caddyfile, backup + restore-drill sidecar
scripts/             stack-up.sh, gen-secrets.sh, qh-build.sh, qh-test-env.sh, qh-invariants.sh
docs/                the documentation that is kept current
plans/               overhaul plan, decision records (D01..D12), wave reports
```

---

## Quick start

### Local, Docker only

```bash
make up          # generates .env.docker if missing → scripts/stack-up.sh → migrate + seed (demo)
```

`scripts/stack-up.sh` is the one sequence both `make up` and `make deploy` run: infra up → safety
stop (refuses a Postgres container belonging to another compose project) → pre-migrate dump →
one-shot `db migrate` + `db seed` → api + web. It prints the URL when it is done.

### Local, hacking on the code

```bash
make dev         # infra in Docker, API on :5000 and Vite on :5174 in the foreground
```

### A real server

```bash
cp .env.prod.example .env.prod
scripts/gen-secrets.sh                     # fills the generated secrets
# then set SITE_URL, ACME_EMAIL, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD by hand
make prod-build                            # or `make deploy TAG=vX` to pull published images
scripts/stack-up.sh --prod --env-file .env.prod
make backup-up                             # cron backups only run while the sidecar is up
```

Measured in the rehearsal: first image build 6 min 15 s from a cold cache; infra + migrate + seed +
healthy api/web 37 s after that.
`make check-secrets` (a dependency of `make deploy`) refuses to deploy while any
`CHANGE_ME` placeholder remains. **The full, rehearsed procedure is
`docs/deployment-guide.md`** — it was written from an actual rehearsal, including the restore
drill, and it supersedes anything summarised here.

### Seed data

`db seed --profile reference` loads the real reference data: 10 categories, the brands, and the
curated product dataset under `backend/Services/Catalog/.../Import/dataset/` — **70 records, 68
imported, 2 rejected** because their manufacturer photographs did not pass the fail-closed image
rule (D02). Seeding is idempotent: a second run must report `0 change(s)`.

---

## Tests

One wrapper serialises every build and test so parallel work cannot exhaust the machine:

```bash
scripts/qh-build.sh be <path/to/Module.csproj>   # compile one module
scripts/qh-build.sh be-test                      # 1330 backend unit tests
scripts/qh-build.sh be-test-integration          # 63 integration tests (needs Docker, ~2 min)
scripts/qh-build.sh be-test-all                  # both — the wave-gate command
scripts/qh-build.sh fe-tsc / fe-lint / fe-test   # 140 frontend tests, tsc, eslint
```

E2E: `npx playwright test` against the TEST stack (`scripts/qh-test-env.sh`, ports :5050/:5174) —
42 specs. The suite throws if the base URL is not the TEST stack, so it cannot write into the
owner's live data.

---

## Documentation

| Document | What it holds |
|---|---|
| `docs/system-architecture.md` | topology, modules, data/messaging/caching, security model |
| `docs/codebase-summary.md` | module inventory, roles, key files, where to change what |
| `docs/deployment-guide.md` | the rehearsed VPS procedure, backups, restore drill, troubleshooting |
| `docs/development-roadmap.md` | what is done, and an honest list of what is left |
| `docs/project-changelog.md` | one entry per wave |
| `docs/permission-matrix.md`, `docs/endpoint-authorization-map.md` | who may call what |
| `docs/api-contracts/` | per-module API contracts the frontend is built against |
| `docs/design-guidelines.md`, `docs/ui-kit-components.md` | the single design system and UI kit |
| `docs/seo-shell.md`, `docs/seo-url-contract.md` | the SEO shell and URL contract (D11) |
| `docs/database-enums.md` | generated enum dictionary (golden-file test) |
| `plans/260917-2100-full-system-overhaul/decisions/` | decision records D01–D12 |

---

## Conventions

- Conventional commits, no AI references.
- Never commit `.env*`; only `.env.*.example` is tracked.
- Files under 200 lines where practical; kebab-case, descriptive names.
- Do not ignore a failing test to make a build green.
