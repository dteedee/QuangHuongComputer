#!/usr/bin/env node
/**
 * fetch-product-images.cjs
 *
 * Capture REAL product images from an official manufacturer product page using a real
 * (headless) Chrome, so hotlink protection / anti-bot CDNs that reject curl still work.
 *
 * It never fabricates anything: if no usable image is found it exits with code 2 and an
 * empty manifest, so the caller must pick another source page (or another product).
 *
 * Usage:
 *   node fetch-product-images.cjs --url <official product page> --out <dir> [--max 8] [--min 600] [--hint "model tokens"]
 *
 * Output: <out>/cand-01.webp ... (normalized: <=1200px, white background, webp q82)
 *         <out>/candidates.json  (sourceUrl, original size, alt, score for each candidate)
 * The caller then LOOKS at the candidates, keeps the best 2-4 as 01.webp.. and deletes the rest.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

// puppeteer + sharp are installed with the project's chrome-devtools skill; reuse them.
const SKILL_PKG = path.resolve(__dirname, '../../.claude/skills/chrome-devtools/scripts/package.json');
const skillRequire = createRequire(SKILL_PKG);
const puppeteer = skillRequire('puppeteer');
const sharp = skillRequire('sharp');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const url = arg('url');
const outDir = arg('out');
const max = parseInt(arg('max', '8'), 10);
const minSide = parseInt(arg('min', '600'), 10);
const hintTokens = (arg('hint', '') || '').toLowerCase().split(/[\s,/|]+/).filter(t => t.length >= 3);

if (!url || !outDir) {
  console.error('usage: --url <page> --out <dir> [--max 8] [--min 600] [--hint "tokens"]');
  process.exit(1);
}

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const JUNK = /(sprite|icon|logo|favicon|banner|badge|flag|avatar|payment|social|footer|header|loading|placeholder|pixel|tracking|thumb_?nail|\/nav\/|menu)/i;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const launchOpts = { headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en-US,vi'] };
  if (fs.existsSync('/usr/bin/google-chrome')) launchOpts.executablePath = '/usr/bin/google-chrome';
  const browser = await puppeteer.launch(launchOpts);
  const captured = new Map(); // url -> Buffer (images seen on the wire while the page loaded)

  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8' });

    page.on('response', async (res) => {
      try {
        const ct = (res.headers()['content-type'] || '').toLowerCase();
        if (!ct.startsWith('image/') || ct.includes('svg') || ct.includes('gif')) return;
        const buf = await res.buffer();
        if (buf.length >= 15 * 1024) captured.set(res.url(), buf);
      } catch { /* body unavailable (redirect/cache) - ignore */ }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 75000 }).catch(e => console.error('goto warning:', e.message));
    // trigger lazy-loaded gallery images
    for (let y = 0; y < 3; y++) { await page.evaluate(() => window.scrollBy(0, 900)); await new Promise(r => setTimeout(r, 700)); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 800));

    // DOM candidates: og:image, JSON-LD image, large <img>/<source> in the page
    const dom = await page.evaluate(() => {
      const out = [];
      const push = (u, alt, w, h, top, kind) => { if (u && /^https?:/.test(u)) out.push({ u, alt: alt || '', w: w || 0, h: h || 0, top: top ?? 99999, kind }); };
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(m => push(m.content, 'og', 0, 0, 0, 'og'));
      document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
        try {
          const walk = (o) => {
            if (!o || typeof o !== 'object') return;
            if (o.image) [].concat(o.image).forEach(i => push(typeof i === 'string' ? i : i && i.url, 'jsonld', 0, 0, 0, 'jsonld'));
            Object.values(o).forEach(walk);
          };
          walk(JSON.parse(s.textContent));
        } catch { /* ignore bad json-ld */ }
      });
      document.querySelectorAll('img').forEach(img => {
        const r = img.getBoundingClientRect();
        const best = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        push(new URL(best, location.href).href, img.alt, img.naturalWidth, img.naturalHeight, r.top + window.scrollY, 'img');
        const ss = img.getAttribute('srcset') || img.getAttribute('data-srcset');
        if (ss) {
          const last = ss.split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean).pop();
          if (last) push(new URL(last, location.href).href, img.alt, 0, 0, r.top + window.scrollY, 'srcset');
        }
      });
      return { title: document.title, items: out };
    });

    // Make sure every DOM candidate has bytes: reuse wire capture, else fetch through the browser.
    const wanted = dom.items.filter(i => !JUNK.test(i.u));
    for (const it of wanted) {
      if (captured.has(it.u)) continue;
      try {
        const p2 = await browser.newPage();
        await p2.setUserAgent(UA);
        await p2.setExtraHTTPHeaders({ Referer: url });
        const res = await p2.goto(it.u, { timeout: 30000, waitUntil: 'load' });
        const ct = ((res && res.headers()['content-type']) || '').toLowerCase();
        if (res && res.ok() && ct.startsWith('image/') && !ct.includes('svg')) captured.set(it.u, await res.buffer());
        await p2.close();
      } catch { /* skip unreachable candidate */ }
    }

    // Score + normalize
    const meta = new Map(wanted.map(i => [i.u, i]));
    const seenHash = new Set();
    const scored = [];
    for (const [u, buf] of captured) {
      if (JUNK.test(u)) continue;
      let info;
      try { info = await sharp(buf).metadata(); } catch { continue; }
      const w = info.width || 0, h = info.height || 0;
      if (Math.max(w, h) < minSide || Math.min(w, h) < minSide * 0.45) continue;
      const ratio = w / h;
      if (ratio > 2.4 || ratio < 0.4) continue; // wide marketing banners / tall strips
      const hash = crypto.createHash('md5').update(buf).digest('hex');
      if (seenHash.has(hash)) continue;
      seenHash.add(hash);
      const m = meta.get(u) || {};
      const hay = (u + ' ' + (m.alt || '')).toLowerCase();
      let score = Math.min(w * h, 2000 * 2000) / 1e5;                 // bigger is better (capped)
      if (ratio > 0.75 && ratio < 1.6) score += 12;                   // product-shot-like aspect
      if (m.kind === 'og' || m.kind === 'jsonld') score += 15;        // page's own declared product image
      if (typeof m.top === 'number' && m.top < 1400) score += 10;     // in the hero/gallery area
      score += hintTokens.filter(t => hay.includes(t)).length * 8;    // url/alt mentions the model
      scored.push({ u, buf, w, h, alt: m.alt || '', kind: m.kind || 'wire', score });
    }
    scored.sort((a, b) => b.score - a.score);

    // Perceptual de-dup: CDNs serve the same picture at several sizes (different bytes, same image).
    // 8x8 average-hash; hamming distance <= 5 means "same picture" -> keep the best-scored one only.
    const aHash = async (buf) => {
      const px = await sharp(buf).flatten({ background: '#ffffff' }).greyscale().resize(8, 8, { fit: 'fill' }).raw().toBuffer();
      const avg = px.reduce((s, v) => s + v, 0) / px.length;
      return Array.from(px, v => (v >= avg ? 1 : 0));
    };
    const unique = [];
    for (const c of scored) {
      try { c.hash = await aHash(c.buf); } catch { continue; }
      const dup = unique.some(o => o.hash.reduce((d, bit, i) => d + (bit !== c.hash[i] ? 1 : 0), 0) <= 5);
      if (!dup) unique.push(c);
    }
    scored.length = 0;
    scored.push(...unique);

    const manifest = { page: url, title: dom.title, candidates: [] };
    let n = 0;
    for (const c of scored.slice(0, max)) {
      n += 1;
      const file = 'cand-' + String(n).padStart(2, '0') + '.webp';
      // D02: .withMetadata() is MANDATORY - sharp strips EXIF/IPTC/XMP by default, which
      // deletes the rights-management information that copyright law explicitly protects.
      await sharp(c.buf)
        .flatten({ background: '#ffffff' })
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .withMetadata()
        .webp({ quality: 82 })
        .toFile(path.join(outDir, file));
      manifest.candidates.push({ file, sourceUrl: c.u, width: c.w, height: c.h, alt: c.alt, kind: c.kind, score: Math.round(c.score) });
    }
    fs.writeFileSync(path.join(outDir, 'candidates.json'), JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({ title: dom.title, imagesOnWire: captured.size, candidates: manifest.candidates.map(c => `${c.file} ${c.width}x${c.height} s=${c.score} ${c.sourceUrl.slice(0, 110)}`) }, null, 1));
    await browser.close();
    process.exit(manifest.candidates.length ? 0 : 2);
  } catch (e) {
    console.error('FAILED:', e.message);
    await browser.close().catch(() => {});
    process.exit(3);
  }
})();
