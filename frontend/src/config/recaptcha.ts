// Google reCAPTCHA v3 Site Key
// To get your site key, register at: https://www.google.com/recaptcha/admin/create

/** Key thử nghiệm công khai của Google — LUÔN qua. Chỉ được dùng khi chạy dev. */
export const GOOGLE_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

interface RecaptchaEnv {
    PROD: boolean;
    VITE_RECAPTCHA_SITE_KEY?: string;
}

/**
 * Chọn site key theo môi trường build:
 *  - Có VITE_RECAPTCHA_SITE_KEY thật ⇒ dùng nó.
 *  - Bản build production KHÔNG BAO GIỜ dùng key test (kể cả khi ai đó cấu hình nhầm nó) ⇒ '' (tắt
 *    reCAPTCHA phía client; server sẽ từ chối nếu nó bật mà không nhận được token — fail-closed).
 *  - Dev không cấu hình ⇒ key test để luồng đăng nhập vẫn chạy.
 */
export function resolveRecaptchaSiteKey(env: RecaptchaEnv): string {
    const configured = env.VITE_RECAPTCHA_SITE_KEY?.trim() ?? '';
    if (env.PROD) return configured === GOOGLE_TEST_SITE_KEY ? '' : configured;
    return configured || GOOGLE_TEST_SITE_KEY;
}

export const RECAPTCHA_SITE_KEY = resolveRecaptchaSiteKey(import.meta.env);

// Actions for reCAPTCHA
export const RECAPTCHA_ACTIONS = {
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_PASSWORD: 'forgot_password',
    RESET_PASSWORD: 'reset_password',
};
