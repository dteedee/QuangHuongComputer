import { test, expect } from '../fixtures/test-base';
import { fetchSimpleProduct } from '../fixtures/api-client';

/**
 * Bố cục 390px (iPhone 12/13/14). Chạy ở project `mobile` của
 * `playwright.config.ts`. Lỗi thật đã gặp: trang chủ tràn ngang ~77px nên khách
 * kéo ngang thấy dải trắng; nút chat nổi đè lên thanh điều hướng dưới cùng.
 */

const PAGES_TO_CHECK = ['/', '/san-pham', '/gio-hang'];

/** Chênh lệch cho phép giữa chiều rộng cuộn và khung nhìn (px). */
const OVERFLOW_TOLERANCE = 1;

for (const path of PAGES_TO_CHECK) {
    test(`màn 390px: ${path} không tràn ngang`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
        }));
        expect(
            scrollWidth - clientWidth,
            `${path} tràn ngang ${scrollWidth - clientWidth}px (scroll ${scrollWidth} / khung ${clientWidth})`,
        ).toBeLessThanOrEqual(OVERFLOW_TOLERANCE);
    });
}

test('màn 390px: trang sản phẩm có thanh mua hàng dính đáy và bấm được', async ({ page, api }) => {
    const product = await fetchSimpleProduct(api);
    await page.goto(`/san-pham/${product.slug}`);
    await page.waitForLoadState('networkidle');
    // Cuộn qua khối mua hàng để thanh dính đáy xuất hiện
    // (`components/product-detail/product-detail-sticky-buy-bar.tsx`).
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(800);

    const stickyBar = page.locator('div.fixed.bottom-0').filter({ hasText: /THÊM VÀO GIỎ/i }).first();
    await expect(stickyBar, 'không thấy thanh mua hàng dính đáy trên màn hình điện thoại').toBeVisible();

    const addToCart = stickyBar.getByRole('button', { name: /THÊM VÀO GIỎ/i }).first();
    await expect(addToCart).toBeEnabled();

    // Thanh phải nằm trọn trong khung nhìn và nút phải đủ lớn để chạm (>= 40px).
    const box = await addToCart.boundingBox();
    expect(box, 'nút thêm vào giỏ không có vùng hiển thị').not.toBeNull();
    const viewport = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(-OVERFLOW_TOLERANCE);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + OVERFLOW_TOLERANCE);
    expect(box!.height, 'vùng chạm nhỏ hơn 40px').toBeGreaterThanOrEqual(40);

    // Bấm được thật: giỏ hàng phải tăng lên.
    await addToCart.click();
    await page.waitForTimeout(1200);
    await page.goto('/gio-hang');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Giỏ hàng đang trống')).toHaveCount(0);
});

test('màn 390px: nút chat nổi không đè lên thanh mua hàng dính đáy', async ({ page, api }) => {
    const product = await fetchSimpleProduct(api);
    await page.goto(`/san-pham/${product.slug}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(800);

    const fab = page.getByRole('button', { name: '💬' }).first();
    await expect(fab, 'không thấy nút chat nổi').toBeVisible();
    const fabBox = (await fab.boundingBox())!;
    expect(fabBox).not.toBeNull();

    const buyButton = page
        .locator('div.fixed.bottom-0')
        .filter({ hasText: /THÊM VÀO GIỎ/i })
        .getByRole('button', { name: /THÊM VÀO GIỎ/i })
        .first();
    const buyBox = (await buyButton.boundingBox())!;
    expect(buyBox, 'không thấy nút mua ở thanh dính đáy').not.toBeNull();

    const overlapX = Math.min(fabBox.x + fabBox.width, buyBox.x + buyBox.width) - Math.max(fabBox.x, buyBox.x);
    const overlapY = Math.min(fabBox.y + fabBox.height, buyBox.y + buyBox.height) - Math.max(fabBox.y, buyBox.y);
    expect(
        overlapX > 0 && overlapY > 0,
        `nút chat đè lên nút mua ${Math.round(overlapX)}x${Math.round(overlapY)}px`,
    ).toBe(false);
});
