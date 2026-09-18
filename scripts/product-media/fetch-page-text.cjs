#!/usr/bin/env node
/**
 * fetch-page-text.cjs
 *
 * Print the RENDERED text of a web page using a real headless Chrome. Manufacturer spec pages are
 * often JS-rendered or reject non-browser clients (403 to curl/WebFetch); this gets the same text a
 * visitor sees, so specs can be transcribed from the official source instead of guessed.
 *
 * Usage:
 *   node fetch-page-text.cjs --url <page> [--max 60000] [--click "Specifications|Tech Specs|Thông số"] [--links 1]
 *
 * --click : regex of tab/button labels to click before reading (spec tabs, "show more")
 * --links : also print same-site links whose text/href looks like spec/gallery/support pages
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const SKILL_PKG = path.resolve(__dirname, '../../.claude/skills/chrome-devtools/scripts/package.json');
const puppeteer = createRequire(SKILL_PKG)('puppeteer');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const url = arg('url');
const max = parseInt(arg('max', '60000'), 10);
const clickRe = arg('click', 'Specifications|Tech Specs|Technical Specifications|Specs|Thông số|Thông số kỹ thuật|View all specs|See all specs|Show more');
const wantLinks = arg('links', '0') === '1';

if (!url) { console.error('usage: --url <page> [--max N] [--click "regex"] [--links 1]'); process.exit(1); }

(async () => {
  const launchOpts = { headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en-US,vi'] };
  if (fs.existsSync('/usr/bin/google-chrome')) launchOpts.executablePath = '/usr/bin/google-chrome';
  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8' });
    // text only: skip heavy assets so many agents can run this concurrently
    await page.setRequestInterception(true);
    page.on('request', r => (['image', 'media', 'font'].includes(r.resourceType()) ? r.abort() : r.continue()));

    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 75000 }).catch(e => { console.error('goto warning:', e.message); return null; });
    for (let y = 0; y < 4; y++) { await page.evaluate(() => window.scrollBy(0, 1200)); await new Promise(r => setTimeout(r, 500)); }

    // open spec tabs / accordions so their text is in the DOM
    await page.evaluate((reSrc) => {
      const re = new RegExp('^\\s*(' + reSrc + ')\\s*$', 'i');
      const els = Array.from(document.querySelectorAll('button, a, [role="tab"], summary, li, span, div'))
        .filter(e => e.children.length <= 2 && re.test((e.textContent || '').trim()));
      els.slice(0, 6).forEach(e => { try { e.click(); } catch { /* not clickable */ } });
    }, clickRe);
    await new Promise(r => setTimeout(r, 1800));

    const out = await page.evaluate((withLinks) => {
      const text = document.body ? document.body.innerText.replace(/\n{3,}/g, '\n\n') : '';
      let links = [];
      if (withLinks) {
        links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ t: (a.textContent || '').trim().slice(0, 60), h: a.href }))
          .filter(l => /spec|gallery|tech|support|datasheet|download|overview|thong-so/i.test(l.t + ' ' + l.h) && l.h.startsWith(location.origin))
          .slice(0, 40);
      }
      return { title: document.title, finalUrl: location.href, text, links };
    }, wantLinks);

    console.log('STATUS: ' + (res ? res.status() : 'n/a') + ' | FINAL URL: ' + out.finalUrl);
    console.log('TITLE: ' + out.title);
    console.log('----- RENDERED TEXT (' + out.text.length + ' chars, showing ' + Math.min(out.text.length, max) + ') -----');
    console.log(out.text.slice(0, max));
    if (wantLinks) { console.log('----- LINKS -----'); out.links.forEach(l => console.log(l.t + ' -> ' + l.h)); }
    await browser.close();
  } catch (e) {
    console.error('FAILED:', e.message);
    await browser.close().catch(() => {});
    process.exit(3);
  }
})();
