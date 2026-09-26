# SEO shell (W2-17 / D11)

Owner: W2-17. Binding source: `decisions/D11-seo-va-kien-truc-render.md`. Scope shipped this track:
**17a only** — head/meta/JSON-LD/status codes/sitemap/robots. **17b (body content snapshot) is NOT
shipped** — it is gated on W3-G measuring CLS with a real build, which cannot happen on this
machine (frontend builds are off-limits per D12). `SeoPage.SnapshotHtml` exists in the contract and
is wired through end-to-end, but every provider in this track always sets it to `null`.

## What it does

`GET|HEAD /_shell/{**path}`, anonymous, in `ApiGateway`, answers every public storefront URL with:
a real HTTP status (200 / 301 / 302 / 404 / 410 — never a client-side-only "soft 200"), `<title>`/description/
canonical/robots/OG tags, and JSON-LD, all spliced into the built SPA `index.html` before it's sent.
The edge (`deploy/Caddyfile`) rewrites everything that isn't a static asset or an excluded prefix
(`/api/*`, `/hubs/*`, `/media/*`, `/uploads/*`, `/health*`, `/sitemap.xml`, `/robots.txt`) to
`/_shell{uri}`. If the shell is unreachable, the edge falls back to the static `index.html` — the
SPA still works with generic meta tags.

## Redirect manager (runs BEFORE providers)

Admin-managed table `content."UrlRedirects"` (backoffice `/backoffice/redirects`, API
`/api/content/admin/redirects`, permissions `Content.ViewRedirects` / `Content.ManageRedirects`).
The shell asks `IUrlRedirectResolver` first — before any provider and before the template is
loaded — so an old URL gets a real **301/302** (absolute `Location` from `Frontend:Url`, incoming
query carried over unless the target has its own) or a **410** page, for crawlers and humans alike.

- Lookup = one dictionary hit on an `IMemoryCache` copy of the ACTIVE rows (10-min safety TTL);
  every write evicts it AND the `seo-shell` output-cache tag. Redirect/410 responses are never
  stored in the output cache (so the hit counter sees every request).
- Hit counter: non-blocking enqueue into a bounded in-memory channel (drops on overflow), flushed
  every 3s as one `UPDATE … HitCount = HitCount + n` per row.
- Save-time rules (`UrlRedirectPath`, `UrlRedirectChainGuard`): source normalised (lowercase,
  decoded, no query/trailing slash, full old-site URLs reduced to their path), unique; rejects `/`,
  `/api`, `/_shell`, `/hubs`, `/media`, `/uploads`, `/health*`, `/assets`, `/backoffice`,
  `/sitemap.xml`, `/robots.txt` and Caddy `@assets` extensions; target = `/path` or http(s) URL
  only; no self-redirect, loop or chain (walk ≤ 10 hops). A chain that still slips in (toggling
  rows) is collapsed to one hop at read time; a loop resolves to "no redirect".
- Bulk: CSV/XLSX import (`dryRun|commit`, all-or-nothing, `onDuplicate=skip|update`) and CSV export
  through the shared `ExcelImportPipeline`.
- Slug renames: `SlugChangeRedirectInterceptor` on `CatalogDbContext` records `/san-pham/{old}` →
  `/san-pham/{new}` (and `/danh-muc/…`) after the save/transaction commits, retargeting rows that
  pointed at the old path so the table stays flat. There is no separate slug-history table.

## Provider contract (`BuildingBlocks/Seo`)

```csharp
interface ISeoPageProvider {
    bool TryMatch(string path);
    Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct);
    IAsyncEnumerable<SitemapEntry> EnumerateAsync(CancellationToken ct);
}
```

- `TryMatch` is a cheap regex/prefix check, no DB.
- `ResolveAsync` does the DB read (module's own `DbContext`, module's own "is this public?"
  predicate — `ProductPublicationPolicy.WherePublished()`, `Post.PublishedPredicate()`, etc.) and
  returns a `SeoPage` (status, title, description, canonical, robots, OG, JSON-LD) or `null`. If the
  provider claimed the path (`TryMatch` true) and `ResolveAsync` returns `null`, the shell treats
  that as a real 404 — it does NOT try the next provider. A provider is the single authority for
  the paths it claims.
- `EnumerateAsync` yields every indexable URL it owns, for `/sitemap.xml`.

Providers register themselves with **zero manual wiring**: `SeoServiceRegistrationExtensions.
AddSeoShell()` scans `AppDomain.CurrentDomain.GetAssemblies()` for every non-abstract
`ISeoPageProvider`, the same convention `AddApplicationValidators()` already uses for
`IValidator<T>`. Add a new provider class anywhere in the solution and it is registered the moment
the assembly exists — no other file needs to change.

## Adding a new page type

1. Add a class implementing `ISeoPageProvider` in your module (or `ApiGateway/Seo` if your data
   lives in a module your module doesn't reference — see "Cross-module providers" below).
2. Read your module's own public-visibility predicate; never invent a new one.
3. Build JSON-LD as `Dictionary<string, object?>` (or reuse `BuildingBlocks.Seo.
   SeoJsonLdBuilders` for Organization/WebSite/BreadcrumbList). Any string value that starts with
   `/` is made absolute automatically by `SeoShellHeadRenderer.AbsolutizeJsonLd` right before
   serialization — build every URL root-relative, never concatenate `Frontend:Url` yourself.
4. If the page has no verified image dimensions, leave `OgImage` `null` — the shell falls back to
   the branded default (`public/brand/og-default.png`, a real 1200x630 PNG) rather than declaring
   `og:image:width/height` for something never measured.
5. If your route is real but has no provider yet (or ever will, e.g. it belongs to a module outside
   this track's scope), add its path to `SeoTemplateOnlyPrefixes.Prefixes` — 200 + bare template +
   `noindex`, never a 404 for a page the SPA actually serves.

## Cache key (`SeoOutputCachePolicy`, `Seo:CacheSeconds` = 120)

`path + page + ONE "filtered" flag`. A known filter/sort query param (`brand`, `min-price`,
`max-price`, `sort`, `specs`, `rating`, `in-stock`) flips `filtered=1`; that is what lets
`/danh-muc/laptop` stay `index,follow` while `/danh-muc/laptop?brand=asus` answers
`noindex,follow` with a canonical back to the clean URL — sharing one cache key for both would make
that impossible. Unknown query params (`utm_*`, `fbclid`, …) neither enter the key nor flip the
flag, so a shared link with tracking params doesn't fragment the cache. A response carrying
`Set-Cookie` is never stored (the shell is anonymous and stateless, so this should never trigger).

## Marker contract (`frontend/index.html`, W1-7)

- `<!-- seo:head --> ... <!-- /seo:head -->` — replaced WHOLESALE with the rendered head block
  (title, meta, canonical, OG, JSON-LD `<script>` tags). If the markers are missing (template
  drifted), the shell injects before `</head>` instead of failing.
- `<!-- seo:body -->` — single marker inside `#root`, where a W2-17b snapshot would be spliced in.
  Unused this track (every `SeoPage.SnapshotHtml` is `null`).

## Template loading (`SeoShellTemplateLoader`)

Revalidates `Seo:ShellTemplateUrl` with `ETag`/`Last-Modified` on **every** request (internal
network hop, ~1ms) instead of a blind TTL — a frontend-only redeploy changes the hashed asset
filenames, and a stale cached template would point at `/assets/index-<old-hash>.js`, a white page,
for however long a TTL lasts. Keeps the last known-good copy in memory; a fetch failure or
non-2xx/304 response serves that stale copy rather than failing outright. No copy ever fetched at
all -> `LoadAsync` returns `null` -> the shell endpoint answers 503 -> the edge's `handle_errors`
falls back to static `index.html`.

## Cross-module providers (deviation from the phase file, documented)

The phase file assigns `/tuyen-dung`, `/tuyen-dung/{id}` and `/he-thong-cua-hang` to "Content/Seo",
but that data is `HR.Domain.JobListing` and `SystemConfig.Domain.Store` — `Content.csproj`
references neither module. Adding those references would be a module-boundary change outside this
track's file ownership. `ApiGateway.csproj` already references every module (it's the host), so
`HrJobListingSeoProvider` and `StoreSeoProvider` live in `ApiGateway/Seo/` instead — same
`ISeoPageProvider` contract, same read-only-DbContext pattern as every other provider. No other
file needed to change for this to work; it is not filed as an integration request.

## Content providers (news / promotions / flash sale)

All in `Services/Content/Seo/` because every row they read is Content's (`Post`, `Promotion`) —
the "ApiGateway/Seo" exception above only applies to data Content does not reference.

| Provider | Paths | Visibility predicate | Sitemap |
|---|---|---|---|
| `ContentPostSeoProvider` | `/tin-tuc`, `/tin-tuc/{slug}` | `Post.PublishedPredicate`, type != `Promotion` (a promotion slug -> 301 `/khuyen-mai/{slug}`) | list + every news post |
| `PromotionSeoProvider` | `/khuyen-mai`, `/khuyen-mai/{slug}` | `Post.PublishedPredicate` + type `Promotion`; code count via `Promotion.RunningPredicate` | list (only when non-empty) + every promotion post |
| `FlashSaleSeoProvider` | `/flash-sale` | `Promotion.RunningPredicate` + `Type = FlashSale` + at least one reward with a real `FlashPrice` | `/flash-sale` only while a sale is running (`hourly`) |
| `ContentPageSeoProvider` | `/chinh-sach/{promotions,khuyen-mai,news,tin-tuc}` | — | never (301 to `/khuyen-mai` / `/tin-tuc`) |

`Promotion.RunningPredicate(utcNow)` (`Status == Active && StartAt <= now && (EndAt == null || EndAt >= now)`)
is the one "running" predicate shared by `GET /api/content/promotions/active`, `GET /api/promotions/available`
and these providers — same D10 reasoning as `Post.PublishedPredicate`. Empty listing pages answer 200
(the SPA has a real empty state) with `noindex,follow`, never a 404. Tests: `Tests/UnitTests/Seo/`.

## Known gap: Repair module pages

`/bao-hanh`, `/sua-chua`, `/sua-chua/:id` are real, "index"-flagged public pages
(`docs/seo-url-contract.md`) served by the `Repair` module, which D11 never assigned to any
provider (only Catalog + Content). Falling them through to the shell's generic 404 default would
regress a page that works today; they are listed in `SeoTemplateOnlyPrefixes` instead (200 + bare
template + `noindex`) until a track that owns `Repair` adds a real provider.
