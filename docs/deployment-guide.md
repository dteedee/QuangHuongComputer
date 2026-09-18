# Deployment guide — the database run path

**Owner:** W1-4 (`plans/260917-2100-full-system-overhaul/phase-13-w1-data-platform.md`)
**Status:** frozen contract as of 2026-09-18. Later tracks build on the verbs and the seed
registry described here; change them only with a decision record.

This document covers **getting a database from empty to a usable shop**. The container topology,
compose files, reverse proxy, CI/CD and backup schedule are owned by **W1-14**
(`phase-64-w1-deploy-stack.md`, decision D05) and land in this file later. If you came here
looking for `make up`, that is W1-14.

---

## 1. The verbs

The API binary doubles as the maintenance CLI. Passing `db` as the first argument runs the verb
and exits with its status code **without starting the HTTP server** — a fresh machine has to be
able to build its database before anything can listen on a port.

```bash
dotnet ApiGateway.dll db migrate                    # apply every module's EF Core migrations
dotnet ApiGateway.dll db seed --profile reference   # reference data — every environment
dotnet ApiGateway.dll db seed --profile demo        # reference + demo accounts (Development only)
dotnet ApiGateway.dll db reset --demo               # wipe transactional rows, then re-seed
```

Exit codes: **0** success · **1** a step failed · **2** bad usage.

Each verb prints one line per step with the number of rows it changed:

```
info: db[0] seed inventory.warehouses: 2 change(s)
info: db[0] seed systemconfig.stores: 2 change(s)
info: db[0] db seed --profile reference: 252 row(s) changed
```

**A second `db seed` on an unchanged database must print `0 row(s) changed`.** That single number
is the contract: every seeder is an upsert by natural key, so running it again is a no-op. If a
run reports a non-zero total on a database nobody touched, a seeder is rewriting a row it should
have left alone — find it by the per-step lines, do not "fix" it by ignoring the total.

### Running the verbs without the API binary

`scripts/qh-build.sh` refuses `ApiGateway.csproj` for everyone but the gate, so during the
overhaul use the operator CLI, which links the *same source file* and runs the *same* code:

```bash
scripts/qh-build.sh be backend/Tools/DbCli/DbCli.csproj
dotnet <artifacts>/bin/DbCli/debug/DbCli.dll \
  --connection "Host=localhost;Port=5432;Database=qh_seed_test;Username=…;Password=…" \
  db seed --profile reference
```

`DbCli` refuses any database whose name is not `*_test`, `*_demo` or `qh_*`. That outer guard — and
only that one — can be lifted with `--i-know-this-is-the-real-database`, which exists so the gate
can migrate the live database; `db reset`'s own name guard is *not* affected by it and still has no
override.

**Overriding the connection string:** prefer the environment variable
`ConnectionStrings__DefaultConnection=…`. The command-line form
`--ConnectionStrings:DefaultConnection=…` also works, but only because `DatabaseMigrationRunner.
ConfigurationArgs` now hides the verb's valueless flags (`--demo`) from the configuration binder —
without that, `db reset --demo --ConnectionStrings:DefaultConnection=X` had `--demo` swallow the
override and the verb silently resolved to the database in `appsettings`.

---

## 2. First boot on a clean server

```bash
# 1. extensions the migrations and the search queries need (compose mounts this into the
#    postgres image's docker-entrypoint-initdb.d, so on a new volume it runs by itself)
psql -U postgres -d quanghuongdb -f scripts/init-db.sql

# 2. schema
ASPNETCORE_ENVIRONMENT=Production dotnet ApiGateway.dll db migrate

# 3. data — one administrator plus everything the shop needs to trade
ADMIN_EMAIL=owner@example.com \
ADMIN_INITIAL_PASSWORD='<a strong one-time password>' \
ASPNETCORE_ENVIRONMENT=Production dotnet ApiGateway.dll db seed --profile reference

# 4. start the API normally (no `db` argument)
ASPNETCORE_ENVIRONMENT=Production dotnet ApiGateway.dll
```

After step 3 the shop can trade: roles and permissions, system configuration, the backoffice
menu, report definitions, one store, two warehouses, a return policy, a warranty policy, three
SLA rows, purchase-approval rules, the CMS pages, and the product catalogue with its opening
stock.

### The administrator

`db seed` creates an administrator **only when no account holds the `Admin` role**, from
`ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`, with `ForcePasswordChange = true`. It never touches
an existing account and it can never re-grant a privilege someone removed. If no admin exists and
the variables are unset, the seed logs a warning telling you exactly that and continues.

### Demo accounts

The `demo` profile adds the nine documented accounts (`admin@quanghuong.com` and friends) and is
**Development only**. Asking for it anywhere else logs a warning and silently downgrades to
`reference`, so a staging database can never grow accounts whose passwords are in a README.

---

## 3. Configuration

Every setting is an ASP.NET configuration key, so in a container it is an environment variable
with `__` for `:`:

| Key | Env var | Default | Meaning |
|---|---|---|---|
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` | — | the one PostgreSQL database; all 15 contexts share it |
| `Database:AutoMigrate` | `Database__AutoMigrate` | `true` in Development, else `false` | run migrations on API start |
| `Database:AutoSeed` | `Database__AutoSeed` | `true` in Development, else `false` | run seeders on API start |
| `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | same | unset | one-time administrator bootstrap |
| `QH_IMPORT_DATASET` | same | walk up from the binary | where the product dataset lives |

`AutoMigrate` and `AutoSeed` are **separate** keys. Until this track they were one, and because
the single key is unset outside Development, no environment other than the original developer's
machine had ever been seeded. In production leave both `false` and run the verbs explicitly, so a
schema change is a deliberate step in a deploy rather than a side effect of a restart.

### Catalogue dataset

`db seed` imports the 70-record product dataset from
`backend/Services/Catalog/Infrastructure/Data/Import/dataset/`, verifying every image against
`media-manifest.json` before writing a row. The dataset is **not embedded in the binary**: a
published deployment must either ship the directory or set `QH_IMPORT_DATASET`. When neither is
present the step logs a warning and is skipped — the rest of the seed still completes, and the
shop comes up with no products rather than not at all.

Two of the 70 records are rejected on purpose by the fail-closed image rule
(`aoc-24g4e-24-fhd-fast-ips-180hz` has partial images, `cpu-intel-core-i5-12400f` has failed
ones), so a clean seed yields **68 active products**, not 70.

---

## 4. `db reset --demo`

Deletes every transactional row — orders, carts, reservations, stock movements, purchase orders,
claims, work orders, leads, conversations — and then re-seeds. Reference data (roles, config,
menus, pages, categories, brands, products, policies) is **not** touched: this gives a demo a
clean set of orders, it does not rebuild the shop.

**It refuses any database whose name does not end in `_test` or `_demo`. There is no override
flag.** The guard is on the name rather than on a confirmation flag because the mistake it
prevents — pointing a reset at the live database — is exactly the mistake where a flag gets typed
by habit.

```
db reset REFUSED: database 'quanghuongdb' is not a throwaway database.
Only a name ending in _test or _demo may be reset. There is no override flag.
```

---

## 5. Adding a seeder (for later tracks)

1. Put the seeder in **your own module**, at `backend/Services/<Module>/Infrastructure/Seed/`.
2. Give it `public static Task<int> SeedAsync(<YourDbContext> db, CancellationToken ct = default)`
   returning **the number of rows it created, changed or deleted**.
3. Make it an upsert by natural key (code, slug, name), never `if (!await table.AnyAsync())` —
   a table-level guard means a row added later never reaches a database that was seeded once.
4. Force a deterministic id on insert so the same row has the same id on every machine:
   `db.Entry(x).Property("Id").CurrentValue = DeterministicGuid.Create(DeterministicGuid.UrlNamespace, "<kind>:<key>")`.
   Domain constructors hard-assign `Guid.NewGuid()` and `Entity<T>.Id` is init-only, so this is
   the only way in.
5. Register one line in `DatabaseMigrationRunner.AllSteps` with a name, a profile and an order.

Ordering that already matters, and must not be broken:

| Order | Step | Why |
|---|---|---|
| 10 | `identity.roles` | everything else may reference a role name |
| 20–22 | `systemconfig.*` | the store seeder reads `COMPANY_HOTLINE` / `COMPANY_EMAIL` |
| **30** | `inventory.warehouses` | **before** stores — the store's primary-warehouse link needs it |
| 31 | `systemconfig.stores` | |
| 32–34 | policies and approval rules | |
| 39–40 | `catalog.*` | opening balances are written into `KHO-CHINH` |
| 90 | `identity.admin-bootstrap` | last, so it sees the final role state |
| 95 | `identity.demo-users` | `demo` profile only |

### Pitfalls this track already hit — do not rediscover them

* **`jsonb` columns are re-serialised by PostgreSQL.** Comparing the stored string to your
  literal never matches, so the seeder "changes" a row on every run. Compare parsed values
  (`StoreSeeder.SameOpeningHours`).
* **Counters that report rows *touched* are not rows *changed*.** The catalogue importer's
  `MediaWritten` is the same on every run; counting it made a clean re-run report 205 changes.
* **`EnableRetryOnFailure` forbids user-initiated transactions.** Every module registers its
  context with retries, so a seeder that opens a transaction must run inside
  `db.Database.CreateExecutionStrategy().ExecuteAsync(...)`.
* **A seeder must not delete by rewriting `GetEntries()`.** Dropping a config key from the seed
  list only affects empty databases. Retiring a key means listing it in
  `SystemConfigRetiredKeys`, which deletes it *only* when its value is still one the seeder wrote.

---

## 6. Backup and restore

```bash
# backup (custom format, compressed, restorable selectively)
docker exec quanghuong-postgres pg_dump -U postgres -Fc quanghuongdb > qh-$(date +%F).dump

# restore into a NEW database, never over a live one
docker exec quanghuong-postgres createdb -U postgres quanghuongdb_restored
docker exec -i quanghuong-postgres pg_restore -U postgres -d quanghuongdb_restored < qh-2026-09-18.dump
```

Restore into a new name and switch the connection string once you have checked it. A restore that
targets the live database has no undo. Scheduling, retention and the restore drill are W1-14's.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `TypeLoadException: Method 'get_LockReleaseBehavior' … NpgsqlHistoryRepository … does not have an implementation` | `Microsoft.EntityFrameworkCore.Relational` 9.x resolved against the Npgsql provider 8.0.2 | pin `Microsoft.EntityFrameworkCore.Relational` 8.0.2 in the entry-point csproj, or move the whole solution to EF 9 |
| `db migrate` exits 1, log names one context | that module's migrations are broken | fix the migration; the other contexts already applied, re-running is safe |
| second `db seed` reports non-zero | a seeder is not an upsert | find it in the per-step lines; see §5 pitfalls |
| `catalog.products: dataset not found` | dataset not shipped | set `QH_IMPORT_DATASET`, see §3 |
| storefront has 0 products after a successful seed | dataset skipped, or images failed the manifest check | read the `catalog.products` summary line |
| `db reset REFUSED` | database name is not `*_test` / `*_demo` | intended; see §4 |

---

## 8. Verifying the whole path

`plans/260917-2100-full-system-overhaul/reports/probes/W1-4-fresh-db-seed.sh` builds a throwaway
database from nothing and asserts the full contract — init-db, migrate, two seeds, the second
reporting zero, every Success Criterion, the Production no-demo-accounts rule and both reset
guards. It is hard-coded to `qh_seed_test` and refuses anything else.
