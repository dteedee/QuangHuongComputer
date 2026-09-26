# Content/Promotions API contract (W2-2, 2026-09-18)

Base paths `/api/content`, `/api/promotions`, `/api/admin/stores`. This is the contract W2-3
(pricing/checkout), W3-1 (storefront flash sales/banners) and W3-4/W3-11 (CMS admin) build
against - read this, not the source. `Content/Seo/**` belongs to W2-17, not documented here.

## 0. Cross-cutting rules

- **One discount engine (binding decision).** `Promotion` (`Content.Domain.Promotion`) is the
  single source of truth for coupons, automatic promos and flash sales. `Coupon` and `FlashSale`
  domain classes are `[Obsolete]`, kept read-only for one wave for back-compat
  (`/api/content/coupons/*`, `/api/content/flash-sales/*`) - **do not build new features on them.**
- **Money.** All discount amounts VND, VAT-inclusive per D01 (this module does not compute VAT).
- **Scheduling predicate (D10, binding).** Posts/pages use ONE predicate,
  `Post.PublishedPredicate(now)` = `Status == Published && PublishedAt != null && PublishedAt <= now`,
  shared by the public list, detail-by-slug and (future) W2-17 sitemap/SEO provider. Never filter
  only the list - the detail-by-slug route used to skip the filter entirely, leaking scheduled/draft
  posts through direct URL. Fixed 2026-09-18 (`ContentEndpoints.cs:39-45,25-31`).
- **Public content cache**: `GET /api/content/posts` sends `Cache-Control: public, max-age=300`
  (5 min TTL per D10 - "no background job"). `GET /api/content/pages/{slug}` uses `ICacheService`,
  1h TTL, key `cache:page:{slug}`, **invalidated on every admin write** (create/update/delete) -
  fixed 2026-09-18, was previously a silent no-op (edits invisible up to 1h).

## 1. Promotion (the discount engine)

`Promotion` aggregate: `Code` (nullable = automatic), `Type` (`Code=1|Automatic=2|FlashSale=3`),
`Status` (`Draft=1|Active=2|Paused=3|Expired=4`), `DiscountType`
(`Percent=1|Fixed=2|FreeShip=3|BuyXGetY=4|Tiered=5|FixedPrice=6`), `StartAt`/`EndAt`, `Priority`,
`IsExclusive`, `IsAutomatic`, `MaxTotalUsage`/`MaxUsagePerCustomer`/`CurrentUsage`, `StoreId`,
`AudienceTag`, `Conditions[]`, `Rewards[]`.

### FlashSale contract (binding - phase-20 §Risk Assessment)

`Type = FlashSale` + reward `DiscountType = FixedPrice`. Each `PromotionReward` row is one
product's flash-sale terms:

| Field | Type | Meaning |
|---|---|---|
| `ProductId` / `VariantId` | `Guid?` | target of the flash price |
| `FlashPrice` | `decimal?` | fixed VND price during the sale window (required when `Promotion.Type == FlashSale`, enforced in `Promotion.AddReward`) |
| `QuantityLimit` | `int?` | total units sellable at flash price, null = unlimited |
| `SoldCount` | `int` | running counter, starts at 0 |

`StartsAt`/`EndsAt` are the **Promotion's** `StartAt`/`EndAt` (shared across all rewards in the
sale). `PromotionReward.IncrementSold(count)` throws `InvalidOperationException` past
`QuantityLimit` (same concurrency-guard pattern as `Promotion.IncrementUsage`).

**Integration point for W2-3 (not yet wired - explicit gap, see report):** `PricingEngine` must
call `PromotionReward.IncrementSold()` and `Promotion.IncrementUsage()` inside the same
transaction as order Paid/Confirmed, symmetric to how Coupon usage is tracked today via
`PromotionUsage`. No outbox consumer exists for this yet.

### `GET /api/content/promotions/active` (public, anonymous)

Storefront flash-sale feed. Returns only `Type=FlashSale`, `Status=Active`, within schedule.

```json
[{
  "id": "guid", "name": "string", "description": "string|null", "endAt": "iso8601|null",
  "products": [{
    "productId": "guid", "variantId": "guid|null", "flashPrice": 12345000,
    "quantityLimit": 50, "soldCount": 12, "remaining": 38, "isSoldOut": false
  }]
}]
```

### Admin `/api/promotions/admin` (permission `Content.ManageCoupons`)

- `GET /` - paged list, filters `status`, `type`.
- `POST /` - create; `Rewards[].flashPrice`/`quantityLimit` required when `Type=FlashSale`.
- `PUT /{id}` - **fixed 2026-09-18**, was a no-op stub. Now updates `Name`/`Description`/
  `Priority`/`EndAt` only (fields that don't retroactively affect past orders). Changing
  conditions/rewards/discount core requires a new promotion - protects audit trail of orders
  already priced against the old terms.
- `POST /{id}/archive` - **new**. Soft-archives (`Status=Expired`, `IsActive=false`). 400 if
  `CurrentUsage > 0` (use `Pause` instead - reversible; `Archive` is terminal).
- `DELETE /{id}` - **new**. Hard-delete, 400 if `CurrentUsage > 0`.
- `POST /{id}/activate`, `POST /{id}/pause` - unchanged.

### Public `GET /api/promotions/available` / `GET /api/promotions/{id}`

Unchanged - code-lookup suggestion feed + single-promotion read, both pre-existing.
`/available` is also the source of the coupon cards on `/khuyen-mai` (called anonymously, no
`customerId`). Real row shape (note: no `startAt`):

```json
[{ "id": "guid", "code": "QH500K", "name": "string", "description": "string|null",
   "discountType": "Percent|Fixed|FreeShip|BuyXGetY|Tiered|FixedPrice", "discountValue": 500000,
   "maxDiscountAmount": null, "endAt": "iso8601|null", "usageRemaining": 12 }]
```

Both `/available` and `/api/content/promotions/active` filter with `Promotion.RunningPredicate(now)`
(one predicate, also used by the SEO providers — `docs/seo-shell.md`).

## 2. CMS content (posts/pages/banners/menus/homepage/contact)

Unchanged shapes except: draft-post leak fixed (§0), page cache invalidation fixed (§0),
`GET /api/content/posts` gained `tag`/`category` query filters (D10 scope-in). Banner
image field, HTML sanitization, endpoint-file split, homepage slug references, menu reseed
from route manifest, contact throttling and `CouponUsage` per-customer limits are **NOT done
in this pass** - see `plans/.../reports/w2-2-report.md` §Unresolved for the exact gap list.

## 3. SystemConfig / Stores (D09)

`POST /api/admin/stores`, `PUT /api/admin/stores/{id}` accept `primaryWarehouseId: Guid?`
(must be a member of `warehouseIds`/already-assigned warehouses, else 400). Calls
`Store.MarkPrimaryWarehouse()` in the same transaction, which clears `IsPrimary` on every
other assigned warehouse first. `StoreAdminDto` now returns `primaryWarehouseId: Guid?`
(the first `Warehouses` row with `IsPrimary == true`, or `null`). No new endpoint was added
(D09 explicitly forbids `PUT /warehouses` as a separate route - the existing `WarehouseIds`
field on create/update already covers assignment).
