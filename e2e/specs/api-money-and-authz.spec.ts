import { test, expect } from '../fixtures/test-base';
import { newApiContext, login, registerCustomer, fetchSellableProducts, getInventoryStock, getCatalogStock, checkoutCod, cancelOrder } from '../fixtures/api-client';
import { ADMIN_ACCOUNT } from '../fixtures/accounts';
import type { APIRequestContext } from '@playwright/test';

/**
 * Nhóm lỗi mà dự án ĐÃ THẬT SỰ phát hành và không test nào bắt được:
 * checkout tin vào số tiền client gửi lên, API CRM không kiểm quyền, máy trạng
 * thái đơn bị đi tắt. Mỗi test dưới đây khoá đúng một trong số đó.
 *
 * Toàn bộ chạy trên stack TEST (:5050) và tự dọn: mọi đơn tạo ra đều bị huỷ ở cuối.
 */

let customerApi: APIRequestContext;
let adminApi: APIRequestContext;
const createdOrderIds: string[] = [];

test.beforeAll(async () => {
    const anon = await newApiContext();
    const customer = await registerCustomer(anon, 'money');
    const c = await login(anon, customer.email, customer.password);
    const a = await login(anon, ADMIN_ACCOUNT.email, ADMIN_ACCOUNT.password);
    await anon.dispose();
    customerApi = await newApiContext(c.token);
    adminApi = await newApiContext(a.token);
});

test.afterAll(async () => {
    for (const id of createdOrderIds) await cancelOrder(customerApi, id, 'E2E cleanup');
    await customerApi.dispose();
    await adminApi.dispose();
});

test('checkout bỏ qua đơn giá và giảm giá tay do client gửi lên', async () => {
    const [product] = await fetchSellableProducts(customerApi, 1);

    const honest = await checkoutCod(customerApi, [{ productId: product.id, quantity: 2 }]);
    createdOrderIds.push(honest.orderId);

    const tampered = await checkoutCod(customerApi, [
        { productId: product.id, quantity: 2, unitPrice: 1, productName: 'GIÁ GIẢ' },
    ]);
    createdOrderIds.push(tampered.orderId);

    // Cùng một giỏ ⇒ cùng một số tiền. Nếu server tin `unitPrice` của client thì
    // đơn thứ hai sẽ rẻ hơn — đúng lỗi "đặt được đơn 0đ" của wave 0.
    expect(tampered.totalAmount).toBe(honest.totalAmount);
    expect(tampered.totalAmount).toBeGreaterThanOrEqual(product.price * 2);
});

test('web checkout không áp được giảm giá tay (chỉ bán tại quầy mới có)', async () => {
    const [product] = await fetchSellableProducts(customerApi, 1);
    const baseline = await checkoutCod(customerApi, [{ productId: product.id, quantity: 1 }]);
    createdOrderIds.push(baseline.orderId);

    const res = await customerApi.post('/api/sales/checkout', {
        data: {
            items: [{ productId: product.id, quantity: 1 }],
            shippingAddress: 'E2E, Vĩnh Bảo, Hải Phòng',
            recipientName: 'E2E Tester',
            recipientPhone: '0912345678',
            paymentMethod: 'COD',
            manualDiscount: product.price, // cố tình xin giảm bằng đúng giá bán
            manualDiscountReason: 'E2E',
        },
    });

    if (res.ok()) {
        const body = await res.json();
        createdOrderIds.push(body.orderId);
        expect(body.totalAmount).toBe(baseline.totalAmount); // giảm giá bị bỏ qua
    } else {
        expect(res.status()).toBe(400); // hoặc bị từ chối thẳng — cả hai đều an toàn
    }
});

test('API CRM đòi quyền: khách 403, ẩn danh 401', async ({ api }) => {
    const anonRes = await api.get('/api/crm/customers');
    expect(anonRes.status()).toBe(401);

    const customerRes = await customerApi.get('/api/crm/customers');
    expect(customerRes.status()).toBe(403);
});

test('máy trạng thái đơn không cho nhảy cóc Pending → Delivered', async () => {
    const [product] = await fetchSellableProducts(customerApi, 1);
    const order = await checkoutCod(customerApi, [{ productId: product.id, quantity: 1 }]);
    createdOrderIds.push(order.orderId);
    expect(order.orderStatus).toBe('Pending');

    const skip = await adminApi.post(`/api/sales/admin/orders/${order.orderId}/transitions`, {
        data: { to: 'Delivered', reason: 'E2E nhảy cóc' },
    });
    expect(skip.status()).toBe(409);

    const ok = await adminApi.post(`/api/sales/admin/orders/${order.orderId}/transitions`, {
        data: { to: 'Confirmed', reason: 'E2E xác nhận' },
    });
    expect(ok.status()).toBe(200);

    // Gọi lại đúng mốc đang đứng ⇒ idempotent, vẫn 200.
    const again = await adminApi.post(`/api/sales/admin/orders/${order.orderId}/transitions`, {
        data: { to: 'Confirmed', reason: 'E2E lặp lại' },
    });
    expect(again.status()).toBe(200);
});

test('huỷ đơn nhập lại đúng số lượng tồn kho đã trừ', async () => {
    const [product] = await fetchSellableProducts(customerApi, 1);
    const before = (await getInventoryStock(customerApi, product.id)).onHand;

    const order = await checkoutCod(customerApi, [{ productId: product.id, quantity: 2 }]);
    await expect
        .poll(async () => (await getInventoryStock(customerApi, product.id)).onHand, { timeout: 20_000 })
        .toBe(before - 2);

    expect(await cancelOrder(customerApi, order.orderId, 'E2E hoàn tồn')).toBe(200);
    await expect
        .poll(async () => (await getInventoryStock(customerApi, product.id)).onHand, { timeout: 20_000 })
        .toBe(before);
});

/**
 * LỖI ĐANG TỒN TẠI — IR w4#03. `Products.StockQuantity` (số hiển thị cho khách)
 * không được cập nhật khi đơn trừ kho, nên PDP có thể mời khách mua hàng đã hết.
 * Đo được 2026-09-19: catalog 110 / tồn khả dụng 94 trên cùng một sản phẩm.
 *
 * Test này ĐANG ĐỎ, cố ý: lỗi chưa được sửa. Tag `@known-bug` để gate có thể
 * chạy `--grep-invert "@known-bug"` lấy mốc xanh, còn lần chạy đầy đủ vẫn nói thật.
 */
test('tồn kho catalog công bố phải khớp tồn khả dụng thực tế @known-bug', async () => {
    const [product] = await fetchSellableProducts(customerApi, 1);
    const inventory = await getInventoryStock(customerApi, product.id);
    const catalog = await getCatalogStock(customerApi, product.id);
    expect(catalog).toBe(inventory.available);
});

test('đơn của người khác trả 404, không lộ sự tồn tại', async () => {
    const [product] = await fetchSellableProducts(customerApi, 1);
    const order = await checkoutCod(customerApi, [{ productId: product.id, quantity: 1 }]);
    createdOrderIds.push(order.orderId);

    const anon = await newApiContext();
    const other = await registerCustomer(anon, 'other');
    const o = await login(anon, other.email, other.password);
    await anon.dispose();
    const otherApi = await newApiContext(o.token);

    const res = await otherApi.get(`/api/sales/orders/${order.orderId}`);
    expect(res.status()).toBe(404);
    await otherApi.dispose();
});
