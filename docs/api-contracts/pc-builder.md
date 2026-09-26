# API contract — PC Builder (W2-9)

**Owner:** W2-9 (`backend/Services/Catalog/{AiPCBuilderEndpoints,CatalogPCBuilderEndpoints}.cs`,
`Application/PcBuilder/**`, `Endpoints/PcBuilder/**`). Base path `/api/catalog/pc-builder`.
**Status:** written 2026-09-18. W3-9 builds the UI from this document alone; W4-1 unit-tests the
rules.

Rebuilt from scratch: the old engine keyword-matched category **names** and parsed a legacy JSON
blob, so `check` verified nothing and AI-suggest returned empty builds. This engine matches on the
category tree (`Categories.Slug`, an FK, indexed) + `Products.Attributes.subCategory` +
`Attributes.filterAttributes` — the shape W0-6's importer actually writes (see
`Infrastructure/Data/Import/spec-keys.md`). **`ProductSpecificationValues` is not used — it is
empty; no `SpecificationGroups`/`SpecificationAttributes` rows exist for the 68-70 seed products.**
This is a real deviation from phase-47's Key Insights (`cpu_socket`, `mb_socket`, `tdp_w`, ... in
`ProductSpecificationValues`), measured against dev DB 2026-09-18, reported as IR to the phase lead.

## 0. Cross-cutting rules

- **Three-state verdict, always.** Every rule and the overall build resolve to exactly one of
  `compatible | incompatible | cannotVerify`. `cannotVerify` (+ `missingKeys`, the exact
  `filterAttributes` key names that are absent) is returned whenever an attribute needed by a rule
  is missing on one of the components — **never inferred as compatible.** Overall verdict = worst
  of all fired rules (`incompatible` > `cannotVerify` > `compatible`); rules that don't apply
  because a slot is empty simply don't fire (no verdict entry).
- **No fabricated wattage.** `PsuHeadroomRule` needs `tdpW` (CPU) / `powerDrawW` (VGA) and no
  product in the seed dataset carries either key (measured: 122 distinct keys, neither present) —
  so `estimatedWattageW` in `check`/`suggest` responses is **always `null`** today, with a
  `estimatedWattageNote` explaining why. This is the honest answer, not a bug; it flips to a real
  number the moment products carry those keys.
- **Public, read-mostly (Security Considerations).** `slots`, `candidates`, `check`, `suggest`,
  `GET builds/{code}` are anonymous. `POST builds` and `GET builds/my` require a logged-in
  customer (`SecurityPolicies.Authenticated`) — the old anonymous-save was the security hole W1-10
  patched; kept closed here.
- **Only published products are ever resolved.** Every lookup goes through
  `Product.WherePublished()` (D10: `IsActive && publishedAt <= now`) — hidden/unpublished stock
  never appears in slots/candidates/check/builds, matching every other public Catalog endpoint.
- **Component identity is server-resolved, never client-labelled.** The old engine trusted a
  client-supplied `componentType` string; this one derives the slot from
  `(Category.Slug, Attributes.subCategory)` on the server (`PcBuilderSlotDefinitions.ResolveSlot`)
  — a client cannot claim "this is a CPU" for an arbitrary product id to dodge a rule.
- **Slots are config, not name-matching (Implementation Steps #1).** All 9 PC-part slots
  (cpu/mainboard/ram/vga/storage/psu/case/cooler) sit under **one flat category**
  `linh-kien-may-tinh` (measured: Catalog has no real sub-tree for parts yet), disambiguated by
  `Attributes.subCategory` (`"CPU"`, `"Mainboard"`, ... — exact strings the importer wrote).
  `monitor` is a separate slot under `man-hinh-may-tinh`, cosmetic only (not part of any
  compatibility rule).

## 1. `GET /slots`

Public. No params.

```jsonc
{
  "slots": [
    { "id": "cpu", "name": "CPU", "categorySlug": "linh-kien-may-tinh",
      "subCategories": ["CPU"], "required": true, "allowMultiple": false, "maxQuantity": 1,
      "candidateCount": 2, "inStockCandidateCount": 2 },
    // ... mainboard, ram, vga, storage, psu, case, cooler, monitor
  ]
}
```

`candidateCount`/`inStockCandidateCount` are live counts against today's published catalogue (not
cached) — FE can grey out a slot that has zero candidates before the customer even opens it.

## 2. `GET /candidates?slot=<slotId>&build=<id1,id2,...>&page=&pageSize=`

Public. `slot` is required (400 `RequestValidationException` on an unknown id). `build` is an
optional comma-separated list of product ids already picked for **other** slots — used to
prefilter incompatible candidates for the slot being browsed (the slot's own current pick, if any,
is excluded from the comparison set so replacing it isn't compared against itself). Paging follows
`docs/api-conventions.md` §3 (`PagedRequest`/`PagedResult`).

```jsonc
{
  "items": [
    { "productId": "guid", "name": "...", "sku": "...", "slug": "...",
      "price": 3200000, "oldPrice": null, "imageUrl": "/media/...", "inStock": true,
      "filterAttributes": { "socket": "AM5", "chipset": "AMD X870", "ramType": "DDR5", "formFactor": "ATX" },
      "compatibility": "compatible" }   // compatible | cannotVerify — never "incompatible": those rows are filtered out server-side
  ],
  "total": 5, "page": 1, "pageSize": 20, "totalPages": 1, "hasPreviousPage": false, "hasNextPage": false,
  "unresolvedBuildProductIds": []   // ids in `build` that don't resolve to a published product
}
```

Rows already proven incompatible with the current build are dropped server-side (honesty rule:
`cannotVerify` is kept — it is not a "no" — only a proven `incompatible` is hidden). Sorted
in-stock-first, then price ascending.

## 3. `POST /check`

Public, read-only (no DB write). Body:

```jsonc
{ "items": [ { "productId": "guid", "quantity": 1 } ] }
```

Unresolvable/unpublished ids → `400` `RequestValidationException("items", "...")`. Otherwise:

```jsonc
{
  "overallVerdict": "incompatible",  // compatible | incompatible | cannotVerify
  "rules": [
    { "ruleId": "socket-cpu-mainboard", "ruleName": "Socket CPU/Mainboard", "verdict": "incompatible",
      "message": "CPU dùng socket AM5 nhưng Mainboard (MB-TUFZ890PLUSWIFI) chỉ hỗ trợ LGA1851.",
      "missingKeys": null },
    { "ruleId": "psu-headroom", "ruleName": "Công suất nguồn", "verdict": "cannotVerify",
      "message": "Không đủ dữ liệu công suất tiêu thụ (TDP) để tính nhu cầu nguồn.",
      "missingKeys": ["AMD-100100001084WOF: thiếu 'tdpW'", "PSU-xxx: thiếu 'powerDrawW'"] }
  ],
  "totalPrice": 12500000,
  "estimatedWattageW": null,
  "estimatedWattageNote": "Không thể ước tính công suất tiêu thụ: dữ liệu sản phẩm hiện chưa có thông số TDP/công suất.",
  "missingRequiredSlots": ["ram", "storage", "psu", "case"],  // required slots (Implementation Steps) with no item yet
  "cartPayload": [ { "productId": "guid", "quantity": 1 } ]   // for W3-9's "add all to cart"
}
```

**6 rules** (Implementation Steps #2), each pure and independently unit-testable off
`PcBuildEvaluator.Evaluate(IReadOnlyList<PcResolvedComponent>)`:

| Rule id | Fires when both slots present | Keys compared | Measured today |
|---|---|---|---|
| `socket-cpu-mainboard` | cpu + mainboard | `socket` == `socket` (exact) | works: CPU/Mainboard both carry `socket` |
| `socket-cpu-cooler` | cpu + cooler | CPU `socket` ⊆ cooler `socket` (cooler lists several, comma/slash separated) | works |
| `ram-type` | mainboard + ≥1 ram | mainboard `ramType` == ram `type` (**different key names on each side** — measured collision, not a bug) | works |
| `mainboard-case-form-factor` | mainboard + case | mainboard `formFactor` ⊆ case `motherboardSupport` | **half the sample cases only have `formFactor` (their own chassis size), not `motherboardSupport`** → `cannotVerify` for those |
| `case-gpu-length` | case + vga | case `maxGpuLengthMm` (numeric) ≥ vga `lengthMm` (numeric) | **always `cannotVerify` today** — no VGA in the seed data carries a length key |
| `mainboard-m2-slots` | mainboard + ≥1 NVMe storage (`interface` contains "NVMe") | mainboard `m2Slots` (numeric) ≥ NVMe drive count | **always `cannotVerify` today** — no mainboard carries `m2Slots` |
| `psu-headroom` | psu + (cpu or vga) | psu `wattage` ≥ 1.3 × Σ(cpu `tdpW` + vga `powerDrawW`) | **always `cannotVerify` today** — no CPU/VGA carries a draw key |

## 4. `POST /suggest` ("Gợi ý theo ngân sách" — D10, rule-based, replaces the old AI-suggest)

Public. Body: `{ "budget": 20000000, "useCase": "gaming" }` (`useCase` optional, defaults to a
non-gaming ratio table; any value containing "gaming"/"game" switches to the gaming ratio table).
`budget <= 0` → `400`.

Allocates budget across slots via a **configurable** ratio table
(`IAppSettings["PcBuilder:Budget:<useCase>:<slotId>"]`, falls back to a hardcoded default table),
picks the best-value in-budget candidate per slot **that keeps the running build's
`PcBuildEvaluator` verdict ≠ `incompatible`** (progressive constraint, cpu picked first), and only
ever returns a build where every required slot is filled and every choice passed the same
compatibility check `check` uses. Cannot complete → `cannotSuggest`, never a partial/invented
build (D12 "never fabricate"):

```jsonc
// success
{ "status": "ok", "budget": 20000000, "useCase": "gaming", "totalPrice": 19800000, "withinBudget": true,
  "items": [ { "slotId": "cpu", "slotName": "CPU", "productId": "guid", "name": "...", "sku": "...", "price": 3600000 }, /* ... */ ],
  "overallVerdict": "cannotVerify", "rules": [ /* same shape as §3 */ ], "cartPayload": [ /* ... */ ] }

// cannot suggest
{ "status": "cannotSuggest", "budget": 3000000, "useCase": "vanphong",
  "reason": "Ngân sách không đủ để chọn đủ linh kiện bắt buộc: psu, case." }
```

The word "AI" never appears anywhere in this response or its UI label (D10, binding).

## 5. `POST /builds` — save + share by code (auth required)

Body: `{ "name": "Build chơi game 20 triệu", "items": [ { "productId": "guid", "quantity": 1 } ] }`.
Empty `items` → `400`. Unresolved/unpublished product id → `400`. Re-evaluates the build
server-side (never trusts a client-supplied verdict) and persists it to the existing
`SavedPcBuilds`/`SavedPcBuildItems` tables (D03: 0 rows after the pre-live purge, reused as-is —
this track owns no migration). Returns `201`:

```jsonc
{ "id": "guid", "buildCode": "K3F9X2QZ", "name": "...", "totalPrice": 12500000,
  "overallVerdict": "incompatible", "rules": [ /* §3 shape */ ] }
```

`buildCode` is 8 chars from `[A-Z0-9]` (36⁸ ≈ 2.8×10¹² combinations — exceeds the ≥8-char base32
requirement in Security Considerations), unique-indexed (`uq_saved_pc_builds_code`). Collision
probability is negligible at this scale and is not explicitly retried on insert failure — flagged
as a theoretical gap, not fixed this track (outside a migration-free change).

## 6. `GET /builds/{code}` — public lookup by share code

`404` if not found. Returns the saved snapshot (name, total, `isCompatible`, item lines with a
`product` sub-object for display) plus the **stored** rule verdicts from save time (not
re-evaluated against current catalogue state — a shared build reflects prices/compatibility as of
when it was saved).

## 7. `GET /builds/my` — customer's saved builds (auth required)

Summary list (id, buildCode, name, totalPrice, isCompatible, createdAt, itemCount), newest first.

## 8. Removed

`POST /api/catalog/pc-builder/ai-suggest` (ratio-split budget, zero compatibility checking) no
longer exists — replaced in place by `POST /suggest` above (D10). The route path changed
(`ai-suggest` → `suggest`); there is no redirect/410 shim, since the old route was never public per
D10's framing of it as an internal defect, not a contract other tracks depend on.

## 9. Sample builds gallery "Cấu hình mẫu" (`/cau-hinh-mau`)

Built on `SavedPcBuilds`. A gallery entry is a **shop-owned copy** (`CustomerId = null`,
`UseCaseTag` set) that staff create from any saved build by its share code — the customer's
original is never renamed or published. `IsFeatured`/`IsPublic`/`UseCaseTag`/`SortOrder` are
writable ONLY through the admin API; `POST /builds` does not accept them. Public visibility =
`SavedPcBuild.IsPubliclyVisible` (`IsActive && IsPublic && CustomerId == null && UseCaseTag != null`),
shared by the API, the SEO shell provider and the sitemap.

Use-case tags: `gaming` (Gaming), `van-phong` (Văn phòng), `do-hoa` (Đồ họa), `streaming` (Streaming).

| Method & path | Permission | Notes |
|---|---|---|
| `GET /gallery?tag=&minBudget=&maxBudget=` | public | Featured first, then `sortOrder`. Budget filters the **live** total. |
| `GET /admin/gallery` | `Catalog.Manage` | All gallery entries incl. hidden. |
| `POST /admin/gallery` `{buildCode, title, useCaseTag, sortOrder, isFeatured, isPublic}` | `Catalog.Manage` | Copies the build found by `buildCode`; `201 {id, buildCode}`. Unknown code / tag -> `400`. |
| `PUT /admin/gallery/{id}` `{title, useCaseTag, sortOrder, isFeatured, isPublic}` | `Catalog.Manage` | |
| `DELETE /admin/gallery/{id}` | `Catalog.Manage` | Soft delete (`IsActive=false`); `204`. |

`PcGalleryBuildView`: `{id, buildCode, title, useCaseTag, useCaseLabel, isFeatured, isPublic,
sortOrder, liveTotal, savedTotal, overallVerdict, isPurchasable, issues[{ruleId, ruleName, verdict,
message}], items[{productId, name, sku, slug, imageUrl, slotId, slotLabel, quantity, unitPrice,
isAvailable, inStock}]}`. `liveTotal` = Σ current price × qty of still-published parts; the verdict
re-runs `PcBuildEvaluator` (the rule engine behind `POST /check`) on current data. `isPurchasable`
= every part published and in stock.
