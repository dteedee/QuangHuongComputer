/**
 * Chốt an toàn D12, kiểm tra ngay khi nạp module.
 *
 * Bối cảnh: một agent audit từng gọi `DELETE /api/auth/roles/Admin` vào API đang
 * chạy của chủ cửa hàng "để xem có bị chặn không" — và nó không bị chặn. Bộ E2E này
 * GHI dữ liệu (đăng ký tài khoản, đặt đơn), nên nó phải không thể trỏ nhầm sang
 * stack thật. File này biến quy tắc đó thành code, không phải một câu trong tài liệu.
 */

/** API TEST duy nhất được phép ghi. */
export const TEST_API_PORT = '5050';
/** Frontend TEST duy nhất được phép chạy kịch bản có ghi. */
export const TEST_WEB_PORT = '5175';

export const API_BASE = (process.env.E2E_API_URL ?? 'http://localhost:5050').replace(/\/$/, '');
export const WEB_BASE = (process.env.E2E_BASE_URL ?? 'http://localhost:5175').replace(/\/$/, '');

function portOf(url: string): string {
    try {
        const u = new URL(url);
        return u.port || (u.protocol === 'https:' ? '443' : '80');
    } catch {
        throw new Error(`E2E: URL không hợp lệ: ${url}`);
    }
}

if (portOf(API_BASE) !== TEST_API_PORT) {
    throw new Error(
        `E2E DỪNG: API base = ${API_BASE}. Bộ test này ghi dữ liệu nên chỉ được trỏ vào ` +
            `API TEST :${TEST_API_PORT} (D12). :5000 là API đang phục vụ cửa hàng.`,
    );
}

if (portOf(WEB_BASE) !== TEST_WEB_PORT && process.env.E2E_ALLOW_READONLY_WEB !== '1') {
    throw new Error(
        `E2E DỪNG: baseURL = ${WEB_BASE}. Chỉ :${TEST_WEB_PORT} được dùng. Muốn chạy smoke ` +
            `CHỈ ĐỌC trên :5174 thì đặt E2E_ALLOW_READONLY_WEB=1 và chỉ chạy các spec có tag @readonly.`,
    );
}

/**
 * Cửa thoát `E2E_ALLOW_READONLY_WEB=1` chỉ cho phép chạy spec có tag `@readonly`.
 * Trước đây đây chỉ là một câu trong thông báo lỗi — không có gì thực thi, nên
 * đặt biến này rồi trỏ baseURL sang :5174 là cả bộ test (kể cả kịch bản đặt đơn)
 * chạy thẳng vào site của chủ cửa hàng. `test-base.ts` gọi hàm dưới đây cho MỌI
 * test để biến câu chữ đó thành ràng buộc thật.
 */
export const WEB_IS_TEST_STACK = portOf(WEB_BASE) === TEST_WEB_PORT;

export function assertWebTargetAllowed(testTitle: string): void {
    if (WEB_IS_TEST_STACK) return;
    if (/@readonly\b/.test(testTitle)) return;
    throw new Error(
        `E2E DỪNG: baseURL = ${WEB_BASE} (không phải :${TEST_WEB_PORT}) và test ` +
            `"${testTitle}" không có tag @readonly. Chỉ spec CHỈ ĐỌC mới được chạy ngoài stack TEST.`,
    );
}

/** Tiền tố bắt buộc của mọi dữ liệu do bộ test tạo ra, để dọn dẹp và để không lẫn với dữ liệu thật. */
export const E2E_PREFIX = 'E2E-';

/** Sinh khoá tự nhiên duy nhất cho một lần chạy (`E2E-<mã>-<hậu tố>`). */
export function e2eKey(suffix: string): string {
    return `${E2E_PREFIX}${Date.now().toString(36)}-${suffix}`;
}

/** Email dùng một lần; `@example.com` bị form đăng ký production từ chối (D03). */
export function e2eEmail(suffix: string): string {
    return `e2e-${Date.now().toString(36)}-${suffix}@example.com`.toLowerCase();
}
