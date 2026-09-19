# Deployment guide — the database run path

**Owner:** W1-4 (`plans/260917-2100-full-system-overhaul/phase-13-w1-data-platform.md`)
**Status:** frozen contract as of 2026-09-18. Later tracks build on the verbs and the seed
registry described here; change them only with a decision record.

This document covers **getting a database from empty to a usable shop** (§1–§5, §7) and, since
the W4-5 deployment rehearsal, **the container topology that actually runs it on a VPS** (§0, §6).
Everything in §0 and §6 was executed end to end from a clean clone on 2026-09-19 — see
`plans/260917-2100-full-system-overhaul/reports/w4-5-deploy-rehearsal.md` for the transcript and
the defects it found.

---

## 0. Putting it on a VPS (the whole thing, from a clean clone)

Prerequisites on the server: Docker Engine + Compose v2.24 or newer (the prod override uses the
`!reset` merge tag), a DNS A record already pointing at the box, and ports 80/443 free.

```bash
git clone <repo> /opt/quanghuong && cd /opt/quanghuong
cp .env.prod.example .env.prod && chmod 600 .env.prod
scripts/gen-secrets.sh                    # fills POSTGRES/REDIS/RABBITMQ/JWT passwords

# You MUST edit these four by hand — gen-secrets.sh does not touch them:
#   SITE_URL=https://your-domain.vn      ACME_EMAIL=you@your-domain.vn
#   ADMIN_EMAIL=you@your-domain.vn       ADMIN_INITIAL_PASSWORD="$(openssl rand -base64 18)"
# `make deploy` refuses to run while any CHANGE_ME_* value is left (target `check-secrets`).

make prod-build                            # or: make deploy TAG=v1.2.3 to pull from the registry
COMPOSE_PROJECT_NAME=quanghuong scripts/stack-up.sh --prod --env-file .env.prod
make backup-up                             # start the backup sidecar — nothing backs up without it
```

Measured on a 16-core dev box, from a clean clone with a cold Docker cache:

| Step | Time |
|---|---|
| `build api web` (both Dockerfiles, no cache) | **6 min 15 s** |
| infra up + healthy, pre-migrate dump | ~10 s |
| `db migrate` + `db seed --profile reference` on an **empty** database | **~20 s** |
| api + web up and healthy | ~20 s |
| Total cold start after the images exist | **37 s** |

`stack-up.sh` prints `[5/5] up. URL: …` when it is done. **Known wart:** the script's last line is
a bare `[ "$SEED_PROFILE" = "demo" ] && log …`, so under `set -e` it exits **1 on a successful
prod run**. Ignore the exit code; read the `[5/5]` line. (One-line fix: append `|| true`.)

### What "healthy" looks like

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain.vn/health/ready   # 200
curl -s 'https://your-domain.vn/api/catalog/products?page=1&pageSize=1' | head -c 80
#   {"total":68,...
```

`GET /api/catalog/products` must report **68** products. If it reports 0, the catalogue dataset
was not visible to the seeder — see §3, "Catalogue dataset".

### Ports, Caddy and HTTPS

`deploy/Caddyfile` binds **the port written in `SITE_URL`**. `https://your-domain.vn` (no port)
makes Caddy listen on 443 plus the automatic HTTP→HTTPS redirect on 80, which is why
`docker-compose.yml` publishes `${WEB_HTTP_PORT}:${WEB_HTTP_PORT}` and
`${WEB_HTTPS_PORT}:${WEB_HTTPS_PORT}` **1:1** rather than mapping to 80/443. Set
`WEB_HTTP_PORT=80` and `WEB_HTTPS_PORT=443` in `.env.prod`. For a rehearsal on a busy machine,
set `SITE_URL=http://localhost:18080` **and** `WEB_HTTP_PORT=18080` — the two must agree or
nothing answers on the published port.

Caddy obtains and renews the certificate itself; there is no certbot and nothing to schedule.
Certificates live in the `caddy-data` volume — do not delete it casually or you re-issue on every
restart and will hit Let's Encrypt rate limits.

### Running a second stack on the same host

Set `COMPOSE_PROJECT_NAME` (containers, volumes **and the network** are all named from it) and a
different `SITE_URL`/`WEB_HTTP_PORT`. Before the rehearsal the network name was hard-coded, which
put two stacks on one bridge where both `postgres` services answered to the same `postgres` DNS
name and Docker round-robined between them — an api container could silently talk to the wrong
database. Fixed; do not re-hardcode it.

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

**Đã sửa 2026-09-19 — hợp đồng này nay đúng: chạy lại phải ra 0.** Trước đó lần seed thứ hai
báo `catalog.products: 10 change(s)` mãi. Hoá ra **không có dòng nào bị ghi lại**: bộ so sánh
nội suy giá trị vào chuỗi, Postgres trả `VatRate = 0.1000` còn file danh mục cho ra `0.10` —
hai số bằng nhau, EF không đánh dấu thay đổi, chỉ có bộ đếm là sai. Đã chuẩn hoá về định dạng
bất biến. Từ nay **bất kỳ số nào khác 0 ở lần chạy thứ hai đều là dữ liệu lệch thật**, phải điều tra.

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
`media-manifest.json` before writing a row. The dataset is **not embedded in the binary and is not
copied into the api image by `dotnet publish`** — a container that cannot see it logs
`catalog.products: dataset not found … skipping` and the shop comes up with **zero products**.

`docker-compose.yml` therefore bind-mounts the directory into the one-shot `migrate` service from
the checkout that holds the compose file, and sets `QH_IMPORT_DATASET=/app/dataset`. Keep the git
checkout on the server (you need it for the compose files anyway); a deploy that only copies
`docker-compose*.yml` and `.env.prod` will seed an empty catalogue.

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

The `backup` sidecar (`deploy/backup/`, prod stack only) owns this: `pg_dump -Fc` hourly 08–22h and
nightly at 02:30, a tar of the `media-data` volume alongside, optional `age` encryption, optional
`rclone` push offsite, and a GFS retention of 48 hourly / 14 daily / 12 monthly under `./backups`.

**The sidecar is not started by `stack-up.sh`.** Run `make backup-up` after every first deploy, or
the server has no backups at all and `make backup` fails with `service "backup" is not running`.
`make deploy` now does it for you.

```bash
make backup-up                     # start (and build) the sidecar; cron runs inside it
make backup                        # on-demand dump right now
make restore-drill AGE_PRIVATE_KEY="$(cat offsite.age.key)"
```

### Encryption and the offsite copy

Generate a key pair once, on a machine that is **not** the server:

```bash
docker run --rm ghcr.io/quanghuongcomputer/backup age-keygen   # or: age-keygen
```

Put the **public** key in `.env.prod` as `BACKUP_AGE_PUBLIC_KEY` and keep the private key offline.
The server can then encrypt but never decrypt. Leave it blank and the dumps are written in the
clear — acceptable only while they never leave the box. For the offsite copy set
`BACKUP_S3_REMOTE=<rclone remote>:bucket/path` and `BACKUP_S3_RCLONE_CONF_HOST=/absolute/path/to/
rclone.conf` on the host; both blank means local-only, which is a valid state, not an error.

### The restore drill

`make restore-drill` decrypts the newest dump, restores it into a throwaway `qh_restore_test`
database, asserts the schema and the catalogue came back, checks the dump's **own age** (< 26 h),
drops the scratch database and writes `backups/restore-drill.heartbeat.json` for an external
uptime check. It runs monthly from the sidecar's crontab. Verified on 2026-09-19 against an
age-encrypted dump: `PASS … tables=172 products=68 orders=0 dumpAgeHours=0`.

Order count is **reported, not asserted** — a shop that has not sold anything yet, or simply had a
quiet day, is not a backup failure.

### By hand, without the sidecar

```bash
docker exec quanghuong-postgres pg_dump -U postgres -Fc quanghuongdb > qh-$(date +%F).dump
docker exec quanghuong-postgres createdb -U postgres quanghuongdb_restored
docker exec -i quanghuong-postgres pg_restore -U postgres -d quanghuongdb_restored < qh-2026-09-18.dump
```

Restore into a new name and switch the connection string once you have checked it. A restore that
targets the live database has no undo.

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
| `stack-up.sh` exits 1 after printing `[5/5] up.` | its last line is a bare `[ … ] && log …` under `set -e` | cosmetic; check `[5/5]` and `docker compose ps`, not the exit code |
| `service "backup" is not running` | the sidecar is not started by `stack-up.sh` | `make backup-up` |
| `catalog.products: dataset not found` in a container | the dataset is not in the api image | the `migrate` service bind-mounts it; keep the git checkout on the server (§3) |
| stack starts but nothing answers on the published port | `SITE_URL`'s port and `WEB_HTTP_PORT` disagree — Caddy binds the port in `SITE_URL` | make them match (§0) |
| second stack on the host talks to the wrong database | old hard-coded network name | set `COMPOSE_PROJECT_NAME`; the network is named from it (§0) |

---

## 8. Verifying the whole path

`plans/260917-2100-full-system-overhaul/reports/probes/W1-4-fresh-db-seed.sh` builds a throwaway
database from nothing and asserts the full contract — init-db, migrate, two seeds, the second
reporting zero, every Success Criterion, the Production no-demo-accounts rule and both reset
guards. It is hard-coded to `qh_seed_test` and refuses anything else.
