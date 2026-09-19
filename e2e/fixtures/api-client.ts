import { request, type APIRequestContext } from '@playwright/test';
import { API_BASE, e2eEmail } from './safety-guard';

/**
 * Client HTTP gọi thẳng API TEST (:5050).
 * Dùng để (a) dựng dữ liệu cho kịch bản UI mà không phải click 10 màn hình,
 * (b) khẳng định những thứ UI không nhìn thấy: số tiền server tự tính, phân quyền,
 * máy trạng thái đơn hàng — đúng nhóm lỗi đã thực sự lọt lưới ở wave 0-3.
 */

export interface LoginResult {
    token: string;
    userId: string;
    roles: string[];
}

export async function newApiContext(token?: string): Promise<APIRequestContext> {
    return request.newContext({
        baseURL: API_BASE,
        extraHTTPHeaders: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}

/**
 * `/api/auth/*` chạy dưới policy `auth`: **10 request / 60s / IP**
 * (`ApiGateway/Startup/RateLimitingSetup.cs:80`). Cả bộ E2E đi từ một IP nên phải
 * tự xếp hàng, nếu không test sẽ đỏ vì 429 chứ không phải vì lỗi sản phẩm.
 * Đã gửi integration request xin nới hạn mức này riêng cho stack TEST.
 */
const AUTH_LIMIT = Number(process.env.E2E_AUTH_LIMIT ?? 6);
const AUTH_WINDOW_MS = 60_000;
const authCalls: number[] = [];

/** Giữ một suất gọi `/api/auth/*`; dùng cả cho login qua giao diện. */
export async function authSlot(): Promise<void> {
    for (;;) {
        const now = Date.now();
        while (authCalls.length && now - authCalls[0] > AUTH_WINDOW_MS) authCalls.shift();
        if (authCalls.length < AUTH_LIMIT) {
            authCalls.push(now);
            return;
        }
        const waitMs = AUTH_WINDOW_MS - (now - authCalls[0]) + 500;
        await new Promise((r) => setTimeout(r, waitMs));
    }
}

/** Gọi một endpoint auth, tự chờ khi bị 429 (tối đa 2 lần). */
async function postAuth(api: APIRequestContext, path: string, data: unknown) {
    for (let attempt = 0; ; attempt++) {
        await authSlot();
        const res = await api.post(path, { data });
        if (res.status() !== 429 || attempt >= 2) return res;
        const retryAfter = Number(res.headers()['retry-after'] ?? 60);
        await new Promise((r) => setTimeout(r, Math.min(retryAfter, 65) * 1000 + 1000));
    }
}

export async function login(api: APIRequestContext, email: string, password: string): Promise<LoginResult> {
    const res = await postAuth(api, '/api/auth/login', { email, password });
    if (!res.ok()) throw new Error(`Đăng nhập thất bại (${res.status()}) cho ${email}: ${await res.text()}`);
    const body = await res.json();
    if (body.requiresTwoFactor) throw new Error(`Tài khoản ${email} đang bật 2FA — E2E không dùng được`);
    if (!body.token) throw new Error(`Phản hồi đăng nhập không có token cho ${email}`);
    return { token: body.token, userId: body.user?.id ?? '', roles: body.user?.roles ?? [] };
}

/** Đăng ký một khách hàng MỚI cho riêng lần chạy này; không bao giờ mượn tài khoản có sẵn. */
export async function registerCustomer(
    api: APIRequestContext,
    suffix: string,
): Promise<{ email: string; password: string }> {
    const email = e2eEmail(suffix);
    const password = 'E2e@12345';
    const res = await postAuth(api, '/api/auth/register', {
        email,
        password,
        confirmPassword: password,
        fullName: `E2E ${suffix}`,
        phoneNumber: '0912345678',
    });
    if (!res.ok()) throw new Error(`Đăng ký thất bại (${res.status()}): ${await res.text()}`);
    return { email, password };
}

export interface ProductLite {
    id: string;
    slug: string;
    name: string;
    price: number;
    stockQuantity: number;
    categoryId?: string;
    categoryName?: string;
}

/** Lấy các sản phẩm đang bán, còn tồn — nguồn dữ liệu cho mọi kịch bản mua hàng. */
export async function fetchSellableProducts(api: APIRequestContext, count = 5): Promise<ProductLite[]> {
    const res = await api.get('/api/catalog/products', { params: { page: 1, pageSize: 40 } });
    if (!res.ok()) throw new Error(`GET /catalog/products lỗi ${res.status()}`);
    const body = await res.json();
    const list: ProductLite[] = (body.products ?? [])
        .filter((p: ProductLite) => Number(p.price) > 0 && Number(p.stockQuantity) > 3)
        .slice(0, count);
    if (list.length === 0) throw new Error('Không có sản phẩm nào còn tồn để chạy E2E');
    return list;
}

/**
 * Một sản phẩm KHÔNG có biến thể: PDP khi đó hiển thị đúng `price` của sản phẩm.
 * Cần thiết vì DB TEST còn lẫn biến thể rác do các track trước tạo (`W37-VAR-*`,
 * giá 12.345.000₫) — bám vào sản phẩm có biến thể thì test đo nhầm thứ khác.
 */
export async function fetchSimpleProduct(api: APIRequestContext): Promise<ProductLite> {
    for (const candidate of await fetchSellableProducts(api, 12)) {
        const res = await api.get(`/api/catalog/products/by-slug/${candidate.slug}`, {
            params: { include: 'media,specs,variants' },
        });
        if (!res.ok()) continue;
        const detail = await res.json();
        if ((detail.variants ?? []).length === 0) return { ...candidate, price: Number(detail.price) };
    }
    throw new Error('Không tìm thấy sản phẩm không có biến thể để chạy E2E');
}

/**
 * Tồn kho THẬT (Inventory là nguồn sự thật, không phải `Products.StockQuantity`
 * của Catalog — hai số này đang lệch nhau, xem IR w4#03).
 */
export async function getInventoryStock(
    api: APIRequestContext,
    productId: string,
): Promise<{ onHand: number; reserved: number; available: number }> {
    const res = await api.get(`/api/inventory/products/${productId}/stock`);
    if (!res.ok()) throw new Error(`GET /inventory/products/${productId}/stock lỗi ${res.status()}`);
    const b = await res.json();
    return { onHand: Number(b.quantityOnHand), reserved: Number(b.reservedQuantity), available: Number(b.availableQuantity) };
}

/** Con số tồn mà Catalog công bố ra storefront. */
export async function getCatalogStock(api: APIRequestContext, productId: string): Promise<number> {
    const res = await api.get(`/api/catalog/products/${productId}`);
    if (!res.ok()) throw new Error(`GET /catalog/products/${productId} lỗi ${res.status()}`);
    const body = await res.json();
    return Number(body.stockQuantity ?? 0);
}

export interface CheckoutResult {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    taxAmount: number;
    orderStatus: string;
}

/** Đặt đơn COD qua API. `unitPrice`/`productName` cố tình gửi sai để chứng minh server bỏ qua chúng. */
export async function checkoutCod(
    api: APIRequestContext,
    items: Array<{ productId: string; quantity: number; unitPrice?: number; productName?: string }>,
    note = 'E2E COD',
): Promise<CheckoutResult> {
    const res = await api.post('/api/sales/checkout', {
        data: {
            // `unitPrice`/`productName` chỉ gửi khi test cố tình giả mạo:
            // gửi `null` bị 400 vì DTO khai báo decimal không nullable.
            items: items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                ...(i.productName !== undefined ? { productName: i.productName } : {}),
                ...(i.unitPrice !== undefined ? { unitPrice: i.unitPrice } : {}),
            })),
            shippingAddress: 'E2E, Thị trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng',
            recipientName: 'E2E Tester',
            recipientPhone: '0912345678',
            paymentMethod: 'COD',
            notes: note,
            isPickup: false,
        },
    });
    if (!res.ok()) throw new Error(`Checkout lỗi ${res.status()}: ${await res.text()}`);
    return res.json();
}

/**
 * Dọn dẹp: huỷ đơn do chính test tạo ra. Huỷ (không xoá) là thao tác duy nhất
 * bộ test được phép làm với dữ liệu nghiệp vụ — nó cũng nhập lại tồn kho.
 */
export async function cancelOrder(api: APIRequestContext, orderId: string, reason = 'E2E cleanup'): Promise<number> {
    const res = await api.post(`/api/sales/orders/${orderId}/cancel`, { data: { reason } });
    return res.status();
}
