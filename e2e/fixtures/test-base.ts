import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import './safety-guard';
import { assertWebTargetAllowed } from './safety-guard';
import { newApiContext, login, authSlot } from './api-client';
import { SEEDED_CUSTOMER } from './accounts';

/**
 * `test` mở rộng dùng chung cho mọi spec.
 *
 * - `consoleErrors`: gom lỗi console + lỗi JS chưa bắt của trang. Spec storefront
 *   khẳng định danh sách này rỗng — "0 lỗi console" là một tiêu chí nghiệm thu
 *   của phase-36, không phải lời hứa suông.
 * - `api`: context gọi API TEST, ẩn danh.
 */

/**
 * Ảnh thiếu file trong webroot của stack TEST (`$QH_SCRATCH/test-wwwroot` chỉ là
 * bản sao một phần) không phải lỗi ứng dụng. Lọc đúng loại này, KHÔNG lọc gì khác.
 */
const IGNORABLE = [
    // CHỈ bỏ qua 404 của tệp ảnh/phông tĩnh. Trước đây mẫu này khớp MỌI lỗi 404
    // tải tài nguyên, nên một request /api/... 404 hay một chunk JS thiếu cũng bị
    // nuốt mất — đúng loại lỗi mà tiêu chí "0 lỗi console" phải bắt được.
    /Failed to load resource: the server responded with a status of 404\b[^@]*@\s*\S+\.(png|jpe?g|webp|gif|svg|avif|ico|woff2?)(\?\S*)?$/i,
];

export function isIgnorableConsoleError(text: string): boolean {
    return IGNORABLE.some((re) => re.test(text));
}

type Fixtures = {
    consoleErrors: string[];
    api: APIRequestContext;
    /** Chốt phạm vi D12, chạy tự động trước mọi test (xem `safety-guard.ts`). */
    readonlyScopeGuard: void;
};

export const test = base.extend<Fixtures>({
    consoleErrors: async ({ page }, use) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
            // Kèm URL nguồn: lỗi "Failed to load resource" không có URL trong text,
            // mà bộ lọc bên dưới phải phân biệt được ảnh thiếu với API 404.
            if (msg.type() === 'error') errors.push(`${msg.text()} @ ${msg.location().url}`);
        });
        page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
        await use(errors);
    },

    readonlyScopeGuard: [
        async ({}, use, testInfo) => {
            assertWebTargetAllowed(testInfo.title);
            await use();
        },
        { auto: true },
    ],

    api: async ({}, use) => {
        const ctx = await newApiContext();
        await use(ctx);
        await ctx.dispose();
    },
});

export { expect };

/** Chỉ giữ lỗi console thật sự của ứng dụng. */
export function appConsoleErrors(errors: string[]): string[] {
    return errors.filter((e) => !isIgnorableConsoleError(e));
}

/**
 * Đăng nhập qua giao diện thật (form `/login`), vì chính nút đó từng đá 3 role
 * nhân viên về storefront. Không nhồi token vào localStorage — làm vậy sẽ bỏ qua
 * đúng đoạn code cần bảo vệ.
 */
export async function loginThroughUi(page: Page, email: string, password: string): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
        await authSlot(); // cùng hạn mức 10 req/60s với login qua API
        await page.goto('/login');
        await page.getByLabel(/Địa chỉ Email/i).fill(email);
        // Ô mật khẩu chưa có nhãn liên kết (`<label>` không có `for`, tên khả truy cập
        // chỉ là placeholder "********") — IR w4#01. Tạm khoá theo type.
        await page.locator('input[type="password"]').first().fill(password);

        const [response] = await Promise.all([
            page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 30_000 }),
            page.getByRole('button', { name: /^Đăng nhập$/ }).click(),
        ]);

        if (response.status() === 429) {
            // Hạn mức `auth` là 10 req/60s/IP và cả bộ test đi chung một IP.
            const retryAfter = Number(response.headers()['retry-after'] ?? 60);
            await page.waitForTimeout(Math.min(retryAfter, 65) * 1000 + 1000);
            continue;
        }
        if (!response.ok()) {
            throw new Error(`Đăng nhập qua giao diện thất bại (${response.status()}) cho ${email}`);
        }
        await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
        return;
    }
    throw new Error(`Đăng nhập qua giao diện bị chặn bởi hạn mức sau 3 lần thử: ${email}`);
}

/**
 * Bấm "THÊM VÀO GIỎ" trên PDP và **chờ đến khi server đã nhận**.
 * Không chờ thì điều hướng sang /gio-hang có thể cắt ngang request đang bay và
 * test đỏ vì thời điểm chứ không vì lỗi sản phẩm.
 */
export async function addToCartFromPdp(page: Page): Promise<void> {
    const [response] = await Promise.all([
        page.waitForResponse(
            (r) => /\/api\/sales\/(public\/)?cart\/items/.test(r.url()) && r.request().method() === 'POST',
            { timeout: 20_000 },
        ),
        page.getByRole('button', { name: /THÊM VÀO GIỎ/i }).first().click(),
    ]);
    if (!response.ok()) {
        throw new Error(`Thêm vào giỏ thất bại (${response.status()}): ${(await response.text()).slice(0, 200)}`);
    }
}

/** Context API đã đăng nhập bằng tài khoản khách seed (chỉ dùng cho kịch bản đọc). */
export async function seededCustomerApi(): Promise<APIRequestContext> {
    const anon = await newApiContext();
    const { token } = await login(anon, SEEDED_CUSTOMER.email, SEEDED_CUSTOMER.password);
    await anon.dispose();
    return newApiContext(token);
}
