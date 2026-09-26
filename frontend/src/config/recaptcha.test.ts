import { describe, expect, it } from 'vitest';
import { GOOGLE_TEST_SITE_KEY, resolveRecaptchaSiteKey } from './recaptcha';

describe('resolveRecaptchaSiteKey', () => {
    it('build production không cấu hình key thì tắt reCAPTCHA, không rơi về key test', () => {
        expect(resolveRecaptchaSiteKey({ PROD: true })).toBe('');
        expect(resolveRecaptchaSiteKey({ PROD: true, VITE_RECAPTCHA_SITE_KEY: '  ' })).toBe('');
    });

    it('build production cấu hình nhầm key test vẫn bị từ chối', () => {
        expect(resolveRecaptchaSiteKey({ PROD: true, VITE_RECAPTCHA_SITE_KEY: GOOGLE_TEST_SITE_KEY })).toBe('');
    });

    it('build production dùng key thật đã cấu hình', () => {
        expect(resolveRecaptchaSiteKey({ PROD: true, VITE_RECAPTCHA_SITE_KEY: 'real-site-key' })).toBe('real-site-key');
    });

    it('dev không cấu hình thì dùng key test để luồng đăng nhập vẫn chạy', () => {
        expect(resolveRecaptchaSiteKey({ PROD: false })).toBe(GOOGLE_TEST_SITE_KEY);
        expect(resolveRecaptchaSiteKey({ PROD: false, VITE_RECAPTCHA_SITE_KEY: 'dev-key' })).toBe('dev-key');
    });
});
