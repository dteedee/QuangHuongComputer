#!/usr/bin/env node
/**
 * publish-seed-media.cjs - W0-6 / decision D02.
 *
 * Takes the verified product photos from the curation workspace
 * (`plans/260917-2100-full-system-overhaul/research/product-data/v2/<slug>/NN.webp`,
 * which is git-ignored) and publishes the approved ones into the VERSIONED seed webroot
 * `backend/ApiGateway/wwwroot/media/seed/products/<slug>/`, in exactly two renditions:
 *
 *     NN.webp       <= 1200px longest side, q82, <= 200KB   (main)
 *     NN-400.webp   400px longest side,            <= 60KB  (thumbnail)
 *
 * Never a third rendition. The DB stores the RELATIVE path `/media/seed/products/<slug>/NN.webp`.
 *
 * Hard rules it enforces, failing the run (exit 1) rather than publishing something wrong:
 *   - `imageStatus` must be exactly "ok"; anything else is reported and skipped.
 *   - every source host must be in `official-source-domains.json` (D02: manufacturer only,
 *     never a retailer / stock library / AI generator).
 *   - magic bytes must say WEBP / JPEG / PNG - the extension is not trusted.
 *   - at most `--max` (default 4) images per product; D02's default budget is 3.
 *   - hard 40MB total for the whole published tree.
 *   - sharp MUST keep EXIF/IPTC/XMP (`.withMetadata()`): stripping it deletes the
 *     rights-management information that copyright law names explicitly.
 *
 * It writes `media-manifest.json` into the versioned dataset directory. The C# importer
 * refuses any image file that has no manifest entry, so this script is the only way an
 * image can reach the catalogue.
 *
 * Usage:
 *   node scripts/product-media/publish-seed-media.cjs [--src DIR] [--out DIR] [--dataset DIR]
 *                                                    [--max 4] [--dry-run] [--only slug,slug]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createRequire } = require('module');

// sharp ships with the project's chrome-devtools skill; reuse it (no install here).
const SKILL_PKG = path.resolve(__dirname, '../../.claude/skills/chrome-devtools/scripts/package.json');
const sharp = createRequire(SKILL_PKG)('sharp');

const REPO = path.resolve(__dirname, '../..');
const DEFAULT_SRC = path.join(REPO, 'plans/260917-2100-full-system-overhaul/research/product-data/v2');
const DEFAULT_OUT = path.join(REPO, 'backend/ApiGateway/wwwroot/media/seed/products');
const DEFAULT_DATASET = path.join(REPO, 'backend/Services/Catalog/Infrastructure/Data/Import/dataset');

const MAIN_MAX_PX = 1200;
const MAIN_MAX_BYTES = 200 * 1024;
const THUMB_PX = 400;
const THUMB_MAX_BYTES = 60 * 1024;
const TOTAL_MAX_BYTES = 40 * 1024 * 1024;
const URL_PREFIX = '/media/seed/products';

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes('--' + name);

const SRC = path.resolve(arg('src', DEFAULT_SRC));
const OUT = path.resolve(arg('out', DEFAULT_OUT));
const DATASET = path.resolve(arg('dataset', DEFAULT_DATASET));
const MAX_IMAGES = parseInt(arg('max', '4'), 10);
const DRY = has('dry-run');
const ONLY = (arg('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

/** Magic-byte sniff. The file extension is never trusted for something that lands in wwwroot. */
function sniff(buf) {
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.toString('hex', 0, 8) === '89504e470d0a1a0a') return 'png';
  return null;
}

/** Encode down the quality ladder until the byte budget is met; never a third rendition. */
async function encode(buf, { px, maxBytes, qualities }) {
  let last = null;
  for (const q of qualities) {
    const out = await sharp(buf)
      .flatten({ background: '#ffffff' })
      .resize({ width: px, height: px, fit: 'inside', withoutEnlargement: true })
      .withMetadata() // D02: keep EXIF/IPTC/XMP - stripping removes rights-management info.
      .webp({ quality: q })
      .toBuffer({ resolveWithObject: true });
    last = { data: out.data, width: out.info.width, height: out.info.height, quality: q };
    if (out.data.length <= maxBytes) return last;
  }
  return last; // caller decides whether an over-budget result is fatal
}

function loadAllowedHosts() {
  const file = path.join(DATASET, 'official-source-domains.json');
  if (!fs.existsSync(file)) throw new Error('missing allowlist: ' + file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Set((json.allowedHosts || []).map((h) => h.toLowerCase()));
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

async function main() {
  const allowed = loadAllowedHosts();
  const slugs = fs.readdirSync(SRC)
    .filter((d) => fs.statSync(path.join(SRC, d)).isDirectory())
    .filter((d) => fs.existsSync(path.join(SRC, d, 'product.json')))
    .filter((d) => ONLY.length === 0 || ONLY.includes(d))
    .sort();

  const files = [];
  const skipped = [];
  const pending = []; // { dir, name, buf } - encoded but not yet written (budget check first)
  let totalBytes = 0;

  for (const slug of slugs) {
    const rec = JSON.parse(fs.readFileSync(path.join(SRC, slug, 'product.json'), 'utf8'));
    if (rec.slug !== slug) { skipped.push({ slug, reason: `slug mismatch: product.json says "${rec.slug}"` }); continue; }
    // D02/D-updates: the predicate is exactly "ok". Anything else is reported, never defaulted in.
    if (rec.imageStatus !== 'ok') { skipped.push({ slug, reason: `imageStatus="${rec.imageStatus}"` }); continue; }

    const images = (rec.images || []).slice(0, MAX_IMAGES);
    if (images.length === 0) { skipped.push({ slug, reason: 'no images[] entries' }); continue; }

    // Whole-product veto: one disallowed host means the record is not publishable as it stands.
    const bad = images.map((im) => hostOf(im.sourceUrl)).filter((h) => !h || !allowed.has(h));
    if (bad.length > 0) { skipped.push({ slug, reason: `source host not in official-source-domains.json: ${[...new Set(bad)].join(', ')}` }); continue; }

    const outDir = path.join(OUT, slug);
    const produced = [];
    let productFailed = null;

    for (const im of images) {
      const srcFile = path.join(SRC, slug, im.file);
      if (!fs.existsSync(srcFile)) { productFailed = `missing file ${im.file}`; break; }
      const raw = fs.readFileSync(srcFile);
      const kind = sniff(raw);
      if (!kind) { productFailed = `${im.file}: magic bytes are not webp/jpeg/png`; break; }

      const main = await encode(raw, { px: MAIN_MAX_PX, maxBytes: MAIN_MAX_BYTES, qualities: [82, 76, 70, 64] });
      if (main.data.length > MAIN_MAX_BYTES) { productFailed = `${im.file}: ${(main.data.length / 1024).toFixed(0)}KB still over the 200KB main budget`; break; }
      const thumb = await encode(raw, { px: THUMB_PX, maxBytes: THUMB_MAX_BYTES, qualities: [78, 70, 62, 55] });
      if (thumb.data.length > THUMB_MAX_BYTES) { productFailed = `${im.file}: thumbnail ${(thumb.data.length / 1024).toFixed(0)}KB over the 60KB budget`; break; }

      const base = path.basename(im.file, path.extname(im.file)); // "01"
      const capturedAt = fs.statSync(srcFile).mtime.toISOString();
      produced.push(
        { name: `${base}.webp`, buf: main.data, width: main.width, height: main.height, role: 'main', im, capturedAt },
        { name: `${base}-400.webp`, buf: thumb.data, width: thumb.width, height: thumb.height, role: 'thumb', im, capturedAt },
      );
    }

    if (productFailed) { skipped.push({ slug, reason: productFailed }); continue; }

    // NOTHING is written here. The 40MB budget is a precondition, so every byte is encoded and
    // measured first and the tree is only touched once the whole run is known to fit; writing
    // as we went left an over-budget tree on disk next to a stale manifest when the cap tripped.
    for (const f of produced) {
      const rel = `${URL_PREFIX}/${slug}/${f.name}`;
      pending.push({ dir: outDir, name: f.name, buf: f.buf });
      totalBytes += f.buf.length;
      files.push({
        path: rel,
        sha256: crypto.createHash('sha256').update(f.buf).digest('hex'),
        bytes: f.buf.length,
        width: f.width,
        height: f.height,
        rendition: f.role,
        slug,
        alt: f.im.alt || '',
        brand: rec.brand,
        sourcePageUrl: rec.officialUrl,
        sourceImageUrl: f.im.sourceUrl,
        capturedAt: f.capturedAt,
        licenseBasis: 'official-site',
      });
    }
  }

  // Budget is checked BEFORE the first byte reaches the repository: an over-budget run must
  // leave the published tree exactly as it was, not half-replaced.
  if (totalBytes > TOTAL_MAX_BYTES) {
    console.error(`publish-seed-media: REFUSED - ${(totalBytes / 1048576).toFixed(1)}MB exceeds the hard 40MB seed budget (D02).`);
    console.error('publish-seed-media: nothing was written. Drop to 3 then 2 images per product.');
    process.exit(1);
  }

  if (!DRY) {
    for (const f of pending) {
      fs.mkdirSync(f.dir, { recursive: true });
      fs.writeFileSync(path.join(f.dir, f.name), f.buf);
    }
  }

  // Prune: the published tree is generated output, so anything not in this manifest is a
  // leftover from an earlier run (a rejected product, a removed photo) and must not be
  // committed. Only ever touches files under OUT.
  //
  // With --only, `files` describes just the selected slugs, so pruning the whole tree would
  // delete every other product's published photos (and the merged manifest below would be the
  // only record left). Restrict both to the selected slugs in that case.
  const pruned = [];
  if (!DRY && fs.existsSync(OUT)) {
    const wanted = new Set(files.map((f) => path.join(OUT, f.path.slice(URL_PREFIX.length + 1))));
    for (const slug of fs.readdirSync(OUT)) {
      if (ONLY.length > 0 && !ONLY.includes(slug)) continue;
      const dir = path.join(OUT, slug);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (!wanted.has(full)) { fs.unlinkSync(full); pruned.push(path.relative(OUT, full)); }
      }
      if (fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); pruned.push(slug + '/'); }
    }
  }

  // A --only run describes a subset, so it MUST merge into the existing manifest: overwriting
  // it would leave the C# importer with no entry for the other products, and the importer
  // rejects every record whose images are not in the manifest.
  const manifestPath = path.join(DATASET, 'media-manifest.json');
  if (ONLY.length > 0 && fs.existsSync(manifestPath)) {
    const previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const kept = (previous.files || []).filter((f) => !ONLY.includes(f.slug));
    files.push(...kept);
    files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
    totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);
    for (const s of (previous.skipped || [])) if (!ONLY.includes(s.slug)) skipped.push(s);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/product-media/publish-seed-media.cjs',
    urlPrefix: URL_PREFIX,
    budget: { mainMaxBytes: MAIN_MAX_BYTES, thumbMaxBytes: THUMB_MAX_BYTES, totalMaxBytes: TOTAL_MAX_BYTES, maxImagesPerProduct: MAX_IMAGES },
    totalBytes,
    productCount: new Set(files.map((f) => f.slug)).size,
    fileCount: files.length,
    skipped,
    files,
  };
  if (!DRY) fs.writeFileSync(path.join(DATASET, 'media-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(JSON.stringify({
    dryRun: DRY,
    products: manifest.productCount,
    files: manifest.fileCount,
    totalMB: +(totalBytes / 1048576).toFixed(2),
    budgetMB: 40,
    pruned,
    skipped,
  }, null, 2));
}

main().catch((e) => { console.error('publish-seed-media: ' + (e && e.stack || e)); process.exit(1); });
