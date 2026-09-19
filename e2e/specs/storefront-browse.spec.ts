import { test, expect, appConsoleErrors } from '../fixtures/test-base';
import { fetchSimpleProduct } from '../fixtures/api-client';

/**
 * Storefront — các đường đi mà audit wave 0 phải mở trình duyệt mới phát hiện ra:
 * trang chủ trắng, danh mục không lọc, tìm kiếm chữ thường không ra gì, 404 trắng trơn.
 * Toàn bộ spec này CHỈ ĐỌC.
 */

test('trang chủ hiển thị được, có ảnh sản phẩm thật và không có lỗi console', async ({ page, consoleErrors }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Quang Hưởng/i);
    await expect(page.locator('header').first()).toBeVisible();

    // Ảnh sản phẩm thật: có <img> đã tải xong với kích thước thật (không phải
    // placeholder 1x1 hay ô xám). Lỗi cũ: trang chủ render nhưng mọi ảnh 404.
    const loadedImages = await page.locator('img').evaluateAll((els) =>
        els.filter((e) => {
            const img = e as HTMLImageElement;
            return img.complete && img.naturalWidth > 100 && img.naturalHeight > 100;
        }).length,
    );
    expect(loadedImages, 'trang chủ không có ảnh nào tải được').toBeGreaterThan(0);

    // Có link sang trang sản phẩm.
    expect(await page.locator('a[href^="/san-pham/"]').count()).toBeGreaterThan(0);

    expect(appConsoleErrors(consoleErrors), 'lỗi console trên trang chủ').toEqual([]);
});

test('danh mục chỉ hiện sản phẩm của chính danh mục đó', async ({ page, api }) => {
    const categories = await (await api.get('/api/catalog/categories')).json();
    const withSlug = categories.filter((c: { slug?: string }) => c.slug);
    expect(withSlug.length, 'không có danh mục nào có slug').toBeGreaterThan(0);

    // Chọn danh mục thật sự có hàng, nếu không phép so sánh không nói lên điều gì.
    let chosen: { id: string; slug: string; name: string } | null = null;
    let expectedTotal = 0;
    for (const c of withSlug) {
        const res = await api.get('/api/catalog/products/search', { params: { categoryId: c.id, pageSize: 1 } });
        const body = await res.json();
        if (body.total > 0) {
            chosen = c;
            expectedTotal = body.total;
            break;
        }
    }
    expect(chosen, 'không danh mục nào có sản phẩm').not.toBeNull();

    await page.goto(`/danh-muc/${chosen!.slug}`);
    await page.waitForLoadState('networkidle');

    // Số sản phẩm trên trang phải khớp số của API cho ĐÚNG danh mục đó
    // (lỗi cũ: trang danh mục trả về toàn bộ catalogue).
    await expect(page.getByText(new RegExp(`${expectedTotal}\\s*sản phẩm`, 'i')).first()).toBeVisible();
    expect(await page.locator('a[href^="/san-pham/"]').count()).toBeGreaterThan(0);
});

test('tìm kiếm chữ thường "asus" trả về kết quả liên quan', async ({ page, api }) => {
    const apiBody = await (await api.get('/api/catalog/products/search', { params: { query: 'asus', pageSize: 50 } })).json();
    expect(apiBody.total, 'dữ liệu TEST không có sản phẩm Asus nào').toBeGreaterThan(0);
    // API phải lọc thật, không trả về cả catalogue.
    const all = await (await api.get('/api/catalog/products', { params: { pageSize: 1 } })).json();
    expect(apiBody.total).toBeLessThan(all.total);

    await page.goto('/tim-kiem?query=asus');
    await page.waitForLoadState('networkidle');
    const productLinks = page.locator('a[href^="/san-pham/"]');
    expect(await productLinks.count(), 'trang tìm kiếm không hiện sản phẩm nào').toBeGreaterThan(0);
});

test('URL không tồn tại hiện trang 404, không phải màn hình trắng', async ({ page }) => {
    await page.goto('/duong-dan-khong-bao-gio-ton-tai-e2e');
    await expect(page.getByText('404').first()).toBeVisible();
    await expect(page.getByText(/Không tìm thấy trang/i).first()).toBeVisible();
    // Vẫn còn lối thoát cho khách.
    await expect(page.getByRole('link', { name: /Về trang chủ/i }).first()).toBeVisible();
});

test('sản phẩm không tồn tại không hiện trang trắng', async ({ page }) => {
    await page.goto('/san-pham/san-pham-khong-ton-tai-e2e-12345');
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    expect(text.trim().length, 'trang sản phẩm không tồn tại trả về body rỗng').toBeGreaterThan(50);
    expect(text).toMatch(/404|Không tìm thấy|không tồn tại/i);
});

test('trang chi tiết sản phẩm có giá, ảnh, thông số và nút thêm giỏ', async ({ page, api }) => {
    const product = await fetchSimpleProduct(api);
    await page.goto(`/san-pham/${product.slug}`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(new RegExp(product.name.slice(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    // Giá hiển thị theo định dạng VND, đúng con số của API.
    const formatted = new Intl.NumberFormat('vi-VN').format(product.price);
    await expect(page.getByText(formatted, { exact: false }).first()).toBeVisible();
    // Bảng thông số kỹ thuật (đã gom nhóm) và nút mua.
    await expect(page.getByText(/CẤU HÌNH NỔI BẬT|Thông số kỹ thuật/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /THÊM VÀO GIỎ/i }).first()).toBeEnabled();
});
