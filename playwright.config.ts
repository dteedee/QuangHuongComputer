import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình Playwright cho bộ smoke E2E (track W4-4).
 *
 * D12 (quy trình thực thi an toàn): `baseURL` mặc định là **:5175** — frontend TEST
 * trỏ vào API TEST :5050. Cổng :5174/:5000 là site ĐANG CHẠY của chủ cửa hàng;
 * bộ test này không bao giờ ghi vào đó (xem `e2e/fixtures/safety-guard.ts`, nó
 * ném lỗi ngay khi khởi động nếu API base không phải :5050).
 *
 * Trình duyệt: dùng Google Chrome hệ thống (`channel: 'chrome'`) vì repo chưa có
 * `package.json` ở gốc nên chưa tải được browser bundle của Playwright.
 * Đặt `E2E_BROWSER_CHANNEL=chromium` khi CI đã chạy `npx playwright install`.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5175';
const CHANNEL = process.env.E2E_BROWSER_CHANNEL ?? 'chrome';

export default defineConfig({
    testDir: './e2e/specs',
    // Artefact (trace/screenshot/video) nằm trong thư mục của chính track này.
    outputDir: './e2e/.artifacts',
    // Một worker: stack TEST dùng chung với các track khác, và checkout ghi tồn kho thật.
    workers: 1,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    // 120s: login qua giao diện phải tự xếp hàng dưới hạn mức 10 req/60s của policy "auth",
    // nên một test có đăng nhập có thể phải chờ gần trọn một cửa sổ 60s.
    timeout: 120_000,
    expect: { timeout: 10_000 },
    reporter: process.env.CI ? [['list'], ['html', { outputFolder: './e2e/.artifacts/html', open: 'never' }]] : [['list']],
    use: {
        baseURL: BASE_URL,
        channel: CHANNEL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
    },
    projects: [
        {
            name: 'desktop',
            testIgnore: /mobile-.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'], channel: CHANNEL, viewport: { width: 1440, height: 900 } },
        },
        {
            name: 'mobile',
            testMatch: /mobile-.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                channel: CHANNEL,
                viewport: { width: 390, height: 844 },
                isMobile: false, // channel 'chrome' không bật được touch emulation của Chromium bundle
                hasTouch: true,
                deviceScaleFactor: 3,
            },
        },
    ],
});
