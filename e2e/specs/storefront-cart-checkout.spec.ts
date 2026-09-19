import { test, expect, loginThroughUi, addToCartFromPdp } from '../fixtures/test-base';
import { newApiContext, registerCustomer, login, fetchSimpleProduct, cancelOrder } from '../fixtures/api-client';
import type { Page } from '@playwright/test';

/**
 * Luồng tiền của cửa hàng, đi bằng giao diện đúng như khách đi:
 * thêm giỏ khi chưa đăng nhập → đăng nhập → giỏ còn nguyên → đặt COD →
 * trang xác nhận có mã đơn → tải lại vẫn còn → đơn nằm trong "đơn của tôi".
 *
 * Tự dọn: mọi đơn tạo ra đều bị huỷ ở cuối (huỷ cũng nhập lại tồn kho).
 */

const createdOrderIds: string[] = [];
let cleanupToken = '';

test.afterAll(async () => {
    if (!cleanupToken || createdOrderIds.length === 0) return;
    const api = await newApiContext(cleanupToken);
    for (const id of createdOrderIds) await cancelOrder(api, id, 'E2E cleanup');
    await api.dispose();
});

/**
 * Điều kiện CẦN của toàn bộ thanh toán: không có danh sách tỉnh/phường thì ô
 * "Tỉnh/Thành phố" đứng mãi ở "Đang tải…" và khách không đặt được hàng.
 * Đúng lỗi đã từng phát hành: 25 mã tỉnh để dạng số không đóng ngoặc kép ⇒ 500.
 */
test('danh sách tỉnh/phường nạp được (điều kiện cần của thanh toán) @needs-test-api-rebuild', async ({ api }) => {
    const res = await api.get('/api/sales/shipping/provinces');
    expect(res.status(), 'GET /api/sales/shipping/provinces phải 200').toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.provinces)).toBe(true);
    expect(body.provinces.length).toBeGreaterThan(30);
    // Mã tỉnh phải là CHUỖI — số sẽ làm System.Text.Json ném lỗi và trả 500.
    for (const p of body.provinces) expect(typeof p.code).toBe('string');

    const wards = await api.get(`/api/sales/shipping/provinces/${body.provinces[0].code}/wards`);
    expect(wards.status()).toBe(200);
    expect((await wards.json()).wards.length).toBeGreaterThan(0);
});

test('giỏ hàng của khách vãng lai còn nguyên sau khi đăng nhập', async ({ page, api }) => {
    const product = await fetchSimpleProduct(api);
    const customer = await registerCustomer(api, 'cart');

    // 1. Thêm vào giỏ khi CHƯA đăng nhập.
    await page.goto(`/san-pham/${product.slug}`);
    await addToCartFromPdp(page);
    await page.goto('/gio-hang');
    await page.waitForLoadState('networkidle');
    await expect(
        page.getByText('Giỏ hàng đang trống'),
        'thêm vào giỏ khi chưa đăng nhập không có tác dụng',
    ).toHaveCount(0);
    await expect(page.getByText(product.name, { exact: false }).first()).toBeVisible();

    // 2. Đăng nhập — giỏ phải được gộp, không được bốc hơi.
    //    Gộp giỏ chạy bất đồng bộ và FE hiện thực bằng DELETE rồi POST lại từng dòng
    //    (xem IR w4#04), nên cho nó tối đa 20s và đọc lại trang giỏ nhiều lần.
    await loginThroughUi(page, customer.email, customer.password);
    await expect
        .poll(
            async () => {
                await page.goto('/gio-hang');
                await page.waitForLoadState('networkidle');
                return (await page.locator('body').innerText()).includes(product.name);
            },
            { timeout: 25_000, message: 'sản phẩm thêm lúc chưa đăng nhập không còn trong giỏ sau khi đăng nhập' },
        )
        .toBe(true);
    await expect(page.getByText('Giỏ hàng đang trống')).toHaveCount(0);
});

/**
 * ĐANG BỊ CHẶN bởi môi trường, không phải bởi sản phẩm: API TEST :5050 đang chạy
 * bản build 2026-09-19 01:29, còn bản vá mã tỉnh nằm ở commit d5d6f64 (06:31),
 * nên `/api/sales/shipping/provinces` trả 500 và ô tỉnh/thành đứng ở "Đang tải…".
 * Gate chạy lại sau khi dựng lại :5050 (xem e2e/README.md) thì test này mới có
 * nghĩa. Tag để lần chạy "mốc xanh" loại ra được.
 */
test('đặt đơn COD qua giao diện: có mã đơn, tải lại vẫn còn @needs-test-api-rebuild', async ({ page, api }) => {
    const product = await fetchSimpleProduct(api);
    const customer = await registerCustomer(api, 'cod');
    const session = await login(api, customer.email, customer.password);
    cleanupToken = session.token;

    await loginThroughUi(page, customer.email, customer.password);
    await page.goto(`/san-pham/${product.slug}`);
    await addToCartFromPdp(page);

    await page.goto('/thanh-toan');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="fullName"]').fill('E2E Tester');
    await page.locator('input[name="phone"]').fill('0912345678');
    await page.locator('input[name="email"]').fill(customer.email);
    await page.locator('input[name="address"]').fill('Số 1 đường E2E');

    await expect(
        page.getByText('Đang tải…'),
        'ô Tỉnh/Thành phố không nạp được danh sách — khách không thể đặt hàng',
    ).toHaveCount(0, { timeout: 20_000 });

    await pickCombobox(page, 0);
    await pickCombobox(page, 1);

    await advanceWizard(page);

    const orderNumber = await page.getByText(/ORD-\d{8}-[0-9A-F]+/i).first().textContent();
    expect(orderNumber, 'trang xác nhận không hiện mã đơn').toMatch(/ORD-\d{8}-[0-9A-F]+/i);

    // Tải lại trang xác nhận — mã đơn không được biến mất.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/ORD-\d{8}-[0-9A-F]+/i).first(), 'tải lại trang xác nhận mất mã đơn').toBeVisible();

    // Đơn phải nằm trong danh sách đơn của chính tài khoản đó.
    const ordersApi = await newApiContext(session.token);
    const body = await (await ordersApi.get('/api/sales/orders')).json();
    const list = Array.isArray(body) ? body : (body.items ?? body.orders ?? []);
    const match = list.find((o: { orderNumber?: string }) => o.orderNumber && orderNumber?.includes(o.orderNumber));
    expect(match, 'đơn vừa đặt không xuất hiện trong danh sách đơn của tài khoản').toBeTruthy();
    if (match?.id) createdOrderIds.push(match.id);
    await ordersApi.dispose();
});

/** Mở combobox thứ `index` và chọn lựa chọn đầu tiên. */
async function pickCombobox(page: Page, index: number): Promise<void> {
    const box = page.getByRole('combobox').nth(index);
    await box.click();
    const option = page.getByRole('option').first();
    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.click();
}

/** Bấm qua các bước còn lại của wizard cho tới khi tới trang xác nhận. */
async function advanceWizard(page: Page): Promise<void> {
    for (let step = 0; step < 5; step++) {
        const cod = page.getByText(/Thanh toán khi nhận hàng|COD/i).first();
        if (await cod.isVisible().catch(() => false)) await cod.click();

        const next = page.getByRole('button', { name: /Tiếp tục|Đặt hàng|Hoàn tất|Xác nhận đặt hàng/i }).first();
        if ((await next.count()) === 0) return;
        await next.click();
        await page.waitForLoadState('networkidle');
        if (await page.getByText(/ORD-\d{8}-[0-9A-F]+/i).first().isVisible().catch(() => false)) return;
    }
}
