import { test, expect } from '../fixtures/test-base';
import { fetchSimpleProduct } from '../fixtures/api-client';
import { API_BASE } from '../fixtures/safety-guard';

/**
 * D11 — lớp vỏ SEO. Chỉ ĐỌC.
 *
 * Sitemap là thứ Google đọc chứ không phải người, nên không ai mở nó ra xem:
 * đúng loại tệp cần test tự động. Hai lỗi dưới đây đang tồn tại thật, đo trên cả
 * :5050 lẫn :5000 ngày 2026-09-19 (xem IR w4#05, w4#06) nên hai test tương ứng
 * mang tag `@known-bug` và ĐANG ĐỎ — đó là kết quả đúng.
 */

async function sitemapXml(api: import('@playwright/test').APIRequestContext): Promise<string> {
    const res = await api.get('/sitemap.xml');
    expect(res.status(), 'GET /sitemap.xml').toBe(200);
    return res.text();
}

function locsOf(xml: string): string[] {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

test('sitemap.xml tồn tại và có đủ URL', async ({ api }) => {
    const xml = await sitemapXml(api);
    expect(xml.startsWith('<?xml')).toBe(true);
    const locs = locsOf(xml);
    expect(locs.length, 'sitemap rỗng').toBeGreaterThan(20);
    expect(new Set(locs).size, 'sitemap có URL trùng lặp').toBe(locs.length);
});

test('mọi <loc> trong sitemap là URL tuyệt đối http(s) @known-bug', async ({ api }) => {
    // Đang trả `file:///tuyen-dung` — `Frontend:Url` rỗng nên Uri ghép ra scheme
    // `file`. Google bỏ qua toàn bộ sitemap khi gặp scheme này.
    const bad = locsOf(await sitemapXml(api)).filter((l) => !/^https?:\/\//.test(l));
    expect(bad.slice(0, 5), `${bad.length} URL không phải http(s)`).toEqual([]);
});

test('<priority> trong sitemap dùng dấu chấm thập phân @known-bug', async ({ api }) => {
    // Đang trả `0,6` (định dạng vi-VN) — không hợp lệ theo sitemaps.org 0.9,
    // phải là `0.6`. Nguyên nhân: ToString() không truyền CultureInfo.InvariantCulture.
    const xml = await sitemapXml(api);
    const bad = [...xml.matchAll(/<priority>([^<]+)<\/priority>/g)].map((m) => m[1]).filter((v) => v.includes(','));
    expect(bad.slice(0, 5), `${bad.length} giá trị priority dùng dấu phẩy`).toEqual([]);
});

test('robots.txt tồn tại và chặn đúng khu vực riêng tư', async ({ api }) => {
    const res = await api.get('/robots.txt');
    expect(res.status()).toBe(200);
    const txt = await res.text();
    for (const blocked of ['/backoffice', '/tai-khoan', '/gio-hang', '/thanh-toan']) {
        expect(txt, `robots.txt không chặn ${blocked}`).toContain(`Disallow: ${blocked}`);
    }
});

test('mỗi trang chính trả 200 và có tiêu đề riêng', async ({ page }) => {
    const paths = ['/', '/san-pham', '/tin-tuc', '/gioi-thieu', '/lien-he', '/he-thong-cua-hang'];
    const titles = new Map<string, string>();
    for (const path of paths) {
        const res = await page.goto(path);
        expect(res?.status(), `${path} không trả 200`).toBe(200);
        await page.waitForLoadState('networkidle');
        const title = (await page.title()).trim();
        expect(title.length, `${path} không có tiêu đề`).toBeGreaterThan(5);
        titles.set(path, title);
    }
    // Tiêu đề trùng nhau = Google gộp trang, mất thứ hạng.
    expect(new Set(titles.values()).size, `tiêu đề trùng: ${JSON.stringify([...titles])}`).toBe(paths.length);
});

/**
 * Thẻ SEO của trang sản phẩm do SHELL sinh ra (docs/seo-shell.md) — SPA chỉ là
 * lớp phủ cho người dùng, Google đọc bản shell. Nên kiểm trên shell.
 */
test('shell trang sản phẩm có JSON-LD hợp lệ', async ({ api }) => {
    const product = await fetchSimpleProduct(api);
    const html = await (await api.get(`/_shell/san-pham/${product.slug}`)).text();

    const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(blocks.length, 'shell trang sản phẩm không có JSON-LD').toBeGreaterThan(0);
    for (const block of blocks) {
        const parsed = JSON.parse(block); // ném lỗi = JSON-LD hỏng
        expect(String(parsed['@context'])).toContain('schema.org');
    }
});

/**
 * D11: canonical và og:image phải là URL TUYỆT ĐỐI http(s) — Facebook/Zalo không
 * phân giải đường dẫn tương đối, và Google bỏ qua canonical sai scheme.
 *
 * ĐANG TRẢ `file:///san-pham/...` và `file:///brand/og-default.png`, đo 2026-09-19
 * trên cả :5050 lẫn :5000 — IR w4#05. Nguyên nhân gốc:
 * `SeoShellHeadRenderer.AbsoluteUrl` (backend/ApiGateway/Seo/SeoShellHeadRenderer.cs:96)
 * gọi `Uri.TryCreate(pathOrUrl, UriKind.Absolute, ...)`; trên Linux một đường dẫn
 * bắt đầu bằng "/" LÀ một URI tuyệt đối hợp lệ với scheme `file`, nên hàm trả về
 * luôn thay vì ghép với siteUrl.
 */
test('shell trang sản phẩm có canonical và og:image tuyệt đối @known-bug', async ({ api }) => {
    const product = await fetchSimpleProduct(api);
    const html = await (await api.get(`/_shell/san-pham/${product.slug}`)).text();

    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical, 'shell thiếu thẻ canonical').toBeTruthy();
    expect(canonical, 'canonical phải là URL http(s) tuyệt đối').toMatch(/^https?:\/\//);

    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    expect(ogImage, 'shell thiếu og:image').toBeTruthy();
    expect(ogImage, 'og:image phải là URL http(s) tuyệt đối').toMatch(/^https?:\/\//);
    const imgRes = await api.get(ogImage!);
    expect(imgRes.status(), `og:image ${ogImage} không tải được`).toBe(200);
});

test('SPA trang sản phẩm có canonical tuyệt đối', async ({ page, api }) => {
    const product = await fetchSimpleProduct(api);
    await page.goto(`/san-pham/${product.slug}`);
    await page.waitForLoadState('networkidle');

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical, 'thiếu thẻ canonical').toBeTruthy();
    expect(canonical, 'canonical phải là URL tuyệt đối').toMatch(/^https?:\/\//);
    expect(canonical, 'canonical phải trỏ đúng slug sản phẩm').toContain(product.slug);
});

test('trang danh sách có lọc được đánh noindex,follow', async ({ page, api }) => {
    // Tham số lọc là tiếng Việt: `hang=<slug thương hiệu>` (LISTING_PARAMS,
    // `components/listing/use-listing-query.ts:28-38`).
    const brands = await (await api.get('/api/catalog/brands')).json();
    const brand = brands.find((b: { slug?: string }) => b.slug);
    expect(brand, 'không thương hiệu nào có slug').toBeTruthy();

    await page.goto('/san-pham');
    await page.waitForLoadState('networkidle');
    const plain = (await page.locator('meta[name="robots"]').count())
        ? await page.locator('meta[name="robots"]').getAttribute('content')
        : '';
    expect(plain ?? '', 'trang danh sách KHÔNG lọc thì không được noindex').not.toContain('noindex');

    await page.goto(`/san-pham?hang=${brand.slug}`);
    await page.waitForLoadState('networkidle');
    const robots = page.locator('meta[name="robots"]');
    await expect(robots, 'trang danh sách có lọc thiếu hẳn thẻ meta robots').toHaveCount(1);
    const filtered = await robots.getAttribute('content');
    expect(filtered, 'trang danh sách có lọc phải noindex,follow').toContain('noindex');
    expect(filtered).toContain('follow');
});

/**
 * `/_shell/{**path}` (docs/seo-shell.md) phải trả MÃ TRẠNG THÁI THẬT, không phải
 * "soft 200" — đó là toàn bộ lý do nó tồn tại. Chặn truy cập trực tiếp từ ngoài
 * là việc của edge (`deploy/Caddyfile`), không kiểm được ở đây vì không có edge.
 */
test('shell SEO trả mã trạng thái thật cho sản phẩm có và không có', async ({ api }) => {
    const product = await fetchSimpleProduct(api);

    const ok = await api.get(`/_shell/san-pham/${product.slug}`);
    expect(ok.status(), `${API_BASE}/_shell/san-pham/${product.slug}`).toBe(200);
    const html = await ok.text();
    expect(html, 'shell không nhúng tên sản phẩm vào <title>').toContain(product.name.slice(0, 15));

    const missing = await api.get('/_shell/san-pham/san-pham-khong-ton-tai-e2e');
    expect(missing.status(), 'sản phẩm không tồn tại phải 404, không được soft-200').toBe(404);
});

/**
 * D11: URL sản phẩm dạng UUID phải 301 về URL slug (một nội dung — một URL).
 * ĐANG TRẢ 404, đo 2026-09-19 — IR w4#07.
 */
test('URL sản phẩm dạng UUID chuyển hướng 301 về URL slug @known-bug', async ({ api }) => {
    const product = await fetchSimpleProduct(api);
    const res = await api.get(`/_shell/san-pham/${product.id}`, { maxRedirects: 0 });
    expect(res.status(), `/_shell/san-pham/${product.id} phải 301`).toBe(301);
    expect(res.headers()['location'], 'Location phải trỏ về URL slug').toContain(product.slug);
});
