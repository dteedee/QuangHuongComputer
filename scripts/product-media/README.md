# Product media tooling (decision D02)

Three scripts. Together they are the only sanctioned path from "a photograph exists on a
manufacturer's website" to "a product image is served by the shop".

```
manufacturer page                         curation workspace                published seed
(official site only)                      plans/.../research/product-data/   backend/ApiGateway/
                                          v2/<slug>/                        wwwroot/media/seed/
        │                                        │                          products/<slug>/
        │  fetch-product-images.cjs              │  publish-seed-media.cjs          │
        └───────────────► cand-NN.webp ──human──►  01.webp, 02.webp ──────────► 01.webp + 01-400.webp
                          candidates.json   review  product.json                   media-manifest.json
```

| Script | What it does |
|---|---|
| `fetch-product-images.cjs` | Drives a real headless Chrome at ONE official product page and captures every image it loads, scores them, and writes `cand-NN.webp` + `candidates.json`. It never invents anything: no usable image means exit 2 and an empty manifest. **A human looks at the candidates and decides.** |
| `fetch-page-text.cjs` | Same browser, text only - for reading a spec table off a page that blocks `curl`. |
| `publish-seed-media.cjs` | Takes the approved `NN.webp` files and publishes them, enforcing every D02 rule. This is the one that runs in the build/gate. |

`puppeteer` and `sharp` are resolved from the project's chrome-devtools skill; nothing is
installed here (see `package.json`). Never run `npm install` in this repository.

## Publishing

```bash
node scripts/product-media/publish-seed-media.cjs --dry-run   # report only, writes nothing
node scripts/product-media/publish-seed-media.cjs             # publish + write media-manifest.json
```

Rules it enforces, each of which fails the run rather than publishing something wrong:

* `product.json.imageStatus` must be exactly `"ok"`. `partial` / `failed` are reported and
  skipped - a product with no compliant photograph is **reported, never padded with a
  substitute picture**.
* every source host must be in `Import/dataset/official-source-domains.json`. That list is
  manufacturer domains and the CDNs their own pages load from. A retailer, marketplace, review
  site, stock library or AI generator is never allowed - the 2026-09-18 pass caught four images
  of one laptop taken from `cdnv2.tgdd.vn`, a competing Vietnamese retailer.
* magic bytes must say WEBP / JPEG / PNG. The file extension is not trusted for anything that
  lands in `wwwroot`.
* exactly two renditions per photo: `NN.webp` (≤1200px, ≤200KB) and `NN-400.webp` (≤60KB).
  Never a third.
* at most 4 images per product (D02's default budget is 3), and a **hard 40MB total** for the
  whole published tree. Over budget = exit 1, no partial publish.
* `sharp(...).withMetadata()` is mandatory. Sharp strips EXIF/IPTC/XMP by default, and that
  metadata is the rights-management information copyright law names explicitly.
* anything already in the published tree that the new manifest does not list is pruned, so a
  rejected product never leaves stale files behind to be committed.

## media-manifest.json

Written into `backend/Services/Catalog/Infrastructure/Data/Import/dataset/`. One entry per
published file: `path, sha256, bytes, width, height, rendition, slug, alt, brand,
sourcePageUrl, sourceImageUrl, capturedAt, licenseBasis`.

`licenseBasis` is one of `official-site` | `open-icecat` | `distributor-pack` | `own-photo`.
Everything published so far is `official-site`. **Do not tag anything `open-icecat` before
reading Icecat's terms** - their terms page answered 404 on 2026-09-18, so the licence is
unverified.

`ProductDatasetImporter` refuses any product whose images have no manifest entry, or whose
manifest entry names a host outside the allowlist. The manifest is therefore the record the
owner reviews if a manufacturer ever objects to a photograph.

## Where the images end up

`backend/ApiGateway/wwwroot/media/seed/products/<slug>/NN.webp`, served by the running API at
`/media/seed/products/<slug>/NN.webp` with **no restart** (`UseStaticFiles()` serves the whole
of `wwwroot`). The database stores that relative path, never an absolute URL. These files are
seed assets and **are committed** - they are not runtime uploads.
