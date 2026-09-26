# Catalog API contract (W2-1, 2026-09-18)

Base path `/api/catalog`. This is the contract W3-1 (storefront), W3-7 (PDP/search) and W3-4
(admin catalogue) build against - read this, not the source. Bundle/PC-builder endpoints
(`CatalogBundleEndpoints.cs`, `CatalogPCBuilderEndpoints.cs`, `AiPCBuilderEndpoints.cs`) belong to
**W2-9** and are not documented here.

## 0. Cross-cutting rules

- **One `ProductDto` projection** (`Catalog.Application.Products.ProductDtoProjection`) is used by
  list/detail/search/related/admin create/update - one JSON shape everywhere, see §1.
- **Publication vs activation (D10).** `IsActive=false` = "ngừng kinh doanh" - removes the product
  from EVERY channel (storefront, POS, quotations, stock), it is a global EF query filter. Publish
  status (`publishedAt`) is a SEPARATE, narrower flag: `publishedAt == null` only hides the product
  from the public storefront (list/detail/search/related); it still sells at POS/quotations/stock.
  All public read endpoints below filter `IsActive == true AND publishedAt <= now`; staff
  (`includeInactive=true`, see §0.1) bypass both.
  - `POST /products/{id}/publish` (`Catalog.Edit`) sets `publishedAt = now`. **409-style 400** if
    the product has no image (no `ProductMedias` row of type Image and no legacy `imageUrl`).
  - `POST /products/{id}/unpublish` (`Catalog.Edit`) clears `publishedAt`.
- **0.1 `includeInactive=true`** is honoured ONLY for authenticated staff (Admin/Manager/Sale/
  InventoryStaff/Marketing) - `CatalogStaffAccess.WantsInactive`. Anonymous/customer requests with
  that flag are silently treated as `false` (never reveals whether a hidden row exists).
- **Money & VAT (D01).** `price`/`oldPrice`/`costPrice` are VAT-inclusive VND integers per D01;
  this track does not compute tax - that is Sales/Accounting. Category `vatRate` (statutory
  fraction) and `vatReductionEligible` are returned for those modules to resolve the effective rate.
- **Media paths are RELATIVE (D02).** `imageUrl`/`thumbnailUrl`/`medias[].url` are like
  `/media/seed/products/<slug>/01.webp` or `/media/u/...` - resolve with the FE's
  `resolveMediaUrl()`/BE's `IMediaUrlResolver`, never string-concat a host.
- **Caching.** List (10 min), detail (30 min, **only the bare `GET /products/{id}` with no
  `include=`** - an `include=`-bearing request is always computed fresh, see note below), search
  (5 min), related (30 min), categories/brands (1h) via `ICacheService` with typed payloads
  (`ProductDto`, not `dynamic`) - camelCase both ways. Admin writes invalidate via
  `CatalogProductHelpers.InvalidateProductCachesAsync` / `CacheKeys.*Pattern`.
  `includeInactive=true` NEVER reads or writes the public cache.
  - **Adversarial-verify fix (2026-09-18):** the detail cache key used to embed the raw `include`
    query string, which `InvalidateProductCachesAsync`'s key-based removal never matched - every
    write (media, publish/unpublish, review approve/reject, admin update) called invalidation but
    it silently did nothing, so the public detail endpoint kept serving a stale `averageRating`/
    `publishedAt`/etc. for up to the full 30-min TTL. Confirmed live against :5050. Fixed by
    dropping the `include` segment from the cache key and only caching the bare (no `include=`)
    shape; `include=`-bearing PDP reads are no longer cached (correctness over hit rate on that
    rarer, richer call). **`RemoveByPatternAsync` (`BuildingBlocks/Caching/CacheService.cs`) is
    still a documented no-op** ("placeholder for when using Redis directly") - the `/products` LIST
    and `/products/search` caches are NOT reliably invalidated on any write, module-wide, not just
    Catalog. Out of this track's ownership; see `integration-requests-w2.md`.
- **Errors.** `404` body `{ "Error"|"error": "..." }` (mixed casing - legacy, not worth a breaking
  fix this wave), `400`/`409` body `{ "error": "..." }`, FluentValidation failures follow the
  standard `docs/api-conventions.md` validation-error shape (per-field messages, Vietnamese).

## 1. `ProductDto` shape (list/detail/search/related/admin)

```jsonc
{
  "id": "guid", "name": "...", "sku": "...", "slug": "...",
  "price": 0, "oldPrice": null, "description": "...",
  "specifications": "<legacy JSON string, still populated>",
  "warrantyInfo": null, "warrantyMonths": null, "isReturnExcluded": false,
  "unitName": "Chiếc",                         // D07 - "Chiếc" default, "Lần" for services
  "stockLocations": null, "stockQuantity": 0, "status": "InStock",
  "viewCount": 0, "soldCount": 0, "averageRating": 0, "reviewCount": 0,
  "imageUrl": "/media/...", "thumbnailUrl": "/media/...",  // D02: thumbnailUrl from primary media
  "lowStockThreshold": 5, "isActive": true, "publishedAt": "2026-09-18T00:00:00Z",
  "createdAt": "...", "updatedAt": null, "createdBy": null, "updatedBy": null,
  "categoryId": "guid", "categoryName": "...", "categorySlug": "...",
  "brandId": "guid", "brandName": "...", "brandSlug": "...",
  "galleryImages": null, "attributes": "{}",
  "metaTitle": null, "metaDescription": null, "metaKeywords": null, "canonicalUrl": null,
  "medias": null,      // array only when detail was requested with ?include=media
  "specGroups": null,  // array only when ?include=specs
  "variants": null      // array only when ?include=variants
}
```

`medias[i]` = `{ id, url, thumbnailUrl, alt, isPrimary, sortOrder, type }` (`type`:
`Image`|`Video`|`YoutubeEmbed`), ordered by `sortOrder`.

`specGroups[i]` = `{ groupId, groupName, sortOrder, values: [{ attributeId, key, name, unit,
dataType, value }] }`. **Known data gap**: `ProductSpecificationValues` (the structured table) is
0 rows on DEV as of this track - bulk-loading it is deferred to backlog (D10). Until it is
populated, this endpoint parses the REAL data W0-6 already imported (`Products.Specifications`
jsonb, `[{group,label,value,source}]`) into the same shape, with `attributeId = "00000000-..."` and
`dataType = "Text"` for every legacy-sourced value. Once bulk-ops loads the structured table for a
product, that product automatically switches to the real, typed source (higher `attributeId`
fidelity) - no endpoint change needed.

`variants[i]` = `{ id, sku, name, price, oldPrice, costPrice, stockQuantity, status, isDefault,
sortOrder, options: [{ optionTypeId, optionTypeName, optionValueId, optionValueDisplay, colorHex }] }`.

## 2. Products - read

| Method & path | Permission | Notes |
|---|---|---|
| `GET /products?page&pageSize&categoryId&brandId&search\|q&includeInactive` | public (staff-only `includeInactive`) | Paged: `{ total,page,pageSize,totalPages,hasNextPage,hasPreviousPage,rangeFrom,rangeTo,products:[ProductDto],facets:null }`. `products[].medias/specGroups/variants` are always `null` here (no include support on list - use detail). |
| `GET /products/{id:guid}?include=media,specs,variants&includeInactive` | public / staff | **Increments `viewCount` by 1 on every call** (even cache hits) via one `ExecuteUpdate`. 404 if not found, or (non-staff) if not published. |
| `GET /products/by-slug/{slug}?include=...&includeInactive` | public / staff | Same as above, looked up by slug; also increments `viewCount`. **This is the PDP route.** |
| `GET /products/search?query&categoryId&brandId&minPrice&maxPrice&inStock&sortBy&spec[<key>]=<value>&page&pageSize` | public | See §3. |
| `GET /products/{productId}/related?limit=8` | public | Same-category first, then same-brand; published only. |
| `GET /products/{productId}/bought-together?limit=6&selected=` | public (allow-list) | "Thường được mua cùng": products sharing delivered/completed web orders or handed-over POS sales with the anchor in the last 180 days (cancelled never counted, gifts ignored), ranked by shared order count, min 2 orders. Only published, in-stock, variant-free products. Fewer than 2 such items → falls back to related (`source: "related"`, `orderCount: 0`). Response `{ source, anchor, items: [{ product, orderCount }], total }`; `total` = anchor + `selected` items (csv of ids; absent = all). Cached 3 h per product (`ICoPurchaseQuery` in Sales, one GROUP BY). 404 when the anchor is not published. |

`include` values (comma-separated, any order): `media`, `specs`, `variants`. Omit for the cheap
shape (no medias/specGroups/variants arrays, but `thumbnailUrl` is still populated).

## 3. Search + facets (spec filters)

`spec[<key>]=<value>` wires `Catalog.Application.Specifications.SpecificationFilterBuilder`
(pre-existing, unit-tested - **kept as-is, not redesigned**). Value syntax it actually supports:
- `AM5` -> equals
- `i5,i7` -> IN list
- `16-32` -> numeric BETWEEN (both sides must parse as decimal)
- `true`/`false` -> boolean equals

There is **no** `gte:`/`lte:` prefix operator - use the `min-max` range form for "at least N" via
`N-999999` (or ask for the operator to be added as an integration request; out of scope to avoid
touching the shared, tested filter builder).

Response adds `facets` (array, `null` on `/products` list): for every `IsFilterable` attribute
relevant to `categoryId` (or all filterable attributes if `categoryId` omitted), value+count
computed over the FULL filtered result set (before paging) - `{ attributeId, attributeKey,
attributeName, unit, dataType, values: [{ value, count }] }`.

Example: `GET /products/search?categoryId=<CPU-category-guid>&spec[cpu_socket]=AM5` returns only
AM5 CPUs plus facet counts for every filterable CPU attribute over that same AM5-filtered set
**once `ProductSpecificationValues` is populated for those products.**

**Adversarial-verify: confirmed non-functional on current data (2026-09-18).**
`ProductSpecificationValues` is 0 rows on both DEV and TEST (see §1's spec-gap note) - live-tested
against :5050:
- A `spec[key]=value` filter for a key that HAS a `SpecificationAttribute` row (e.g. `ram_gb`)
  matches **zero** products, always (no rows to match against) - narrows a real 3-product category
  result down to 0.
- A `spec[key]=value` filter for a key with **no** matching `SpecificationAttribute` (e.g. the
  phase file's own `cpu_socket` example - the 20 seeded attributes use `cpu_model`, not
  `cpu_socket`) is **silently ignored** by `SpecificationFilterBuilder` and returns the UNFILTERED
  set (3/3), not "only AM5 CPUs".
- `facets[].values` is `[]` for every attribute, always (facet counts are computed over the same
  empty table).

The code is correctly wired and unit-tested against the schema; it produces no useful result until
`ProductSpecificationValues` is bulk-loaded (tracked as D10 backlog, not this track's scope).
Callers relying on this endpoint for real filtering/facets should treat it as inert until that
backfill lands.

## 4. Products - admin (write)

| Method & path | Permission | Body | Notes |
|---|---|---|---|
| `POST /products` | `Catalog.Create` | `CreateProductDto` | Validated (FluentValidation). Slug auto-generated + de-duplicated. `publishedAt` set only if `imageUrl` was given (D10) - otherwise create unpublished, then `POST .../publish` once a photo is attached. |
| `PUT /products/{id}` | `Catalog.Edit` | `UpdateProductDto` (all fields optional/partial) | Validated. `clearOldPrice`/`clearWarrantyMonths` flags for explicit null. Any `price`/`costPrice` change is captured into `ProductPriceChanges` automatically (see §7) - no separate call needed. |
| `DELETE /products/{id}` | `Catalog.Delete` | - | Soft: `IsActive=false` (global filter - removes from every channel). |
| `POST /products/{id}/activate` | `Catalog.Edit` | - | Reverses the above. |
| `POST /products/{id}/toggle-status` | `Catalog.Edit` | - | Flips `IsActive`. |
| `POST /products/{id}/publish` | `Catalog.Edit` | - | 400 if no image. |
| `POST /products/{id}/unpublish` | `Catalog.Edit` | - | Always allowed. |

`CreateProductDto`/`UpdateProductDto` gained `unitName` (D07, default `"Chiếc"` server-side if omitted).

## 5. Categories & brands

`GET /categories` returns a **flat list with `parentId`** (FE builds the tree - unchanged from
before this track). Payload per row: `{ id,name,description,slug,parentId,imageUrl,icon,
displayOrder,metaTitle,metaDescription,vatRate,vatReductionEligible,isSerialTracked,isActive,
createdAt,updatedAt,productCount }` - **`vatRate`/`vatReductionEligible` already present (D01)**,
migrated in wave 0/1, this track only verified/consumed them, did not add them.

`GET /brands` -> `{ id,name,description,slug,logoUrl,website,displayOrder,isActive,createdAt,
updatedAt,productCount }`.

Both: `GET /{resource}/by-slug/{slug}`, `GET /{resource}/{id}`, `POST` (`Catalog.Create`,
validated), `PUT /{id}` (`Catalog.Edit`, validated), `DELETE /{id}` (`Catalog.Delete`, soft,
blocked 409 if products still reference it), `POST /{id}/activate` (`Catalog.Edit`).

## 6. Media

Base: `Content.ManageMedia` permission (Admin/Manager/Marketing) on every route below.

| Method & path | Notes |
|---|---|
| `POST /media/upload` (multipart, `productId`, `kind=image\|video`) | Validates magic bytes, per-user hourly quota, uploads via `IFileStorage`. Returns `{ url, thumbnailUrl, fileSize, mimeType }` - NOT yet attached to the product (call the endpoint below next). |
| `POST /products/{id}/media` `AddMediaRequest{type,url,thumbnailUrl,altText,sortOrder,isPrimary,fileSize,durationSeconds,variantId}` | Validated. **Fixed this track**: previously silently dropped (never persisted) or threw on `isPrimary` - see Unresolved-turned-fixed in the track report. Setting `isPrimary=true` unsets any other primary and syncs `Products.ImageUrl` (D02). |
| `PUT /products/{id}/media/{mid}` `UpdateMediaRequest{altText?,sortOrder?,isPrimary?}` | Same primary/ImageUrl sync. |
| `DELETE /products/{id}/media/{mid}` | Deleting the primary image clears `Products.ImageUrl` (does not auto-promote another image). |
| `POST /products/{id}/media/reorder` `{ids:[...]}` | Position = array index. |

One primary per product is enforced by a **filtered UNIQUE index** (`ix_product_medias_primary`,
this track's migration) - previously a plain index, "enforced at the app tier" only.

## 7. Variants, price history

Variants: unchanged surface, see source (`CatalogVariantEndpoints.cs`) -
`GET/POST /products/{id}/variants`, `POST /products/{id}/variants/single`,
`PUT|DELETE /products/{id}/variants/{vid}`, `GET/POST /option-types`,
`GET/POST /option-types/{id}/values`. All admin routes need `Catalog.Create|Edit|Delete`.

**Price history (D10, new this track).** Every `Product.Price`/`CostPrice` change made through
`PUT /products/{id}` is captured into `ProductPriceChanges(ProductId,OldPrice,NewPrice,
OldCostPrice,NewCostPrice,Source,ActorId,At)` by a `SaveChanges` hook on `CatalogDbContext` - this
is the ONLY writer of that table. No read endpoint is exposed yet (W3-4's "Lịch sử giá" tab needs
one - file an integration request or add it there; the table and hook exist and are populated).

## 8. Specification schema (group/attribute CRUD - new this track)

All require `Catalog.Manage`.

| Method & path | Body |
|---|---|
| `POST /specifications/groups` | `{name, categoryId?, sortOrder}` |
| `PUT /specifications/groups/{id}` | `{name, categoryId?, sortOrder}` |
| `DELETE /specifications/groups/{id}` | 409 if it still has attributes |
| `POST /specifications/groups/reorder` | `{ids:[...]}` (index = new sortOrder) |
| `POST /specifications/groups/{groupId}/attributes` | `{key, name, dataType, unit?, enumValuesJson?, isFilterable, isComparable, sortOrder}` - 409 if `key` already used in that group |
| `PUT /specifications/attributes/{id}` | same fields minus `key` (immutable) - **409 if changing `dataType` and `ProductSpecificationValues` already has rows for it** (step 6: "datatype immutable once values exist") |
| `DELETE /specifications/attributes/{id}` | 409 if any product still has a value |
| `POST /specifications/groups/{groupId}/attributes/reorder` | `{ids:[...]}` |

Read side (unchanged): `GET /specifications/groups`, `GET /categories/{id}/spec-groups`,
`GET /categories/{id}/filters` (facets scoped to one category - the older, category-only sibling
of the search facets in §3).

## 9. Reviews

| Method & path | Permission | Notes |
|---|---|---|
| `GET /products/{id}/reviews?approvedOnly=true` | public / staff | `approvedOnly=false` is honoured ONLY for authenticated staff (`CatalogStaffAccess.IsStaff`) - anonymous/customer requests always get approved-only, regardless of the query param (fixed this track - previously anyone could pass `approvedOnly=false`). |
| `POST /products/{id}/reviews` `CreateProductReviewDto{rating,comment,title?,imageUrls?,videoUrl?}` | authenticated | Validated. One review per (product, customer). Starts `isApproved=false`. |
| `POST /reviews/{id}/helpful` | **authenticated (changed this track - was anonymous)** | One vote per (review, user) - `ProductReviewHelpfulVotes` unique index; second attempt -> `409`. |
| `GET /products/{id}/reviews/stats` | public | Approved-only aggregate. |
| `POST /reviews/admin/{id}/approve` | `Catalog.Manage` | **Now recalculates `Products.AverageRating`/`ReviewCount` (was a no-op before this track).** |
| `DELETE /reviews/admin/{id}` | `Catalog.Manage` | Reject/delete; recalculates rating if the removed review was approved. |
| `GET /reviews/admin/pending` \| `GET /reviews/admin/sentiment-analysis` | `Catalog.Manage` | Unchanged. |

## 10. Stock projection (event, not HTTP)

`StockChangedConsumer` (`IConsumer<StockChangedEvent>`) applies `Delta` to `Products.StockQuantity`
via one atomic `ExecuteUpdate` per message. **Not yet wired**: Catalog's assembly is not in
`ServiceRegistration.cs`'s `AddConsumers(...)` scan list (Communication/Sales/Accounting/Warranty/
Identity only) - integration request filed, see track report. `Products.Status`
(InStock/LowStock/OutOfStock) is NOT recomputed by this consumer (only `StockQuantity`) - known gap.

`SoldCount` projection from `OrderCompletedEvent` was **not implemented**: the event
(`OrderCompletedEvent(OrderId,CustomerId,OrderNumber,OccurredOn)`) carries no line items, so there
is nothing to attribute sold quantity to per product without querying back into Sales (forbidden -
"a consumer must never query back across modules"). Needs a contract change
(`BuildingBlocks/Messaging/IntegrationEvents/OrderLifecycleEvents.cs`, not this track's file) -
filed as an integration request.
