import { describe, it, expect, beforeEach, vi } from 'vitest';
import { accessTokenStore, purgeLegacyAuthStorage, sessionHint } from './access-token-store';
import { resolveApiOrigin } from '../api-origin';

describe('accessTokenStore (chỉ trong bộ nhớ)', () => {
    beforeEach(() => {
        accessTokenStore.set(null);
        localStorage.clear();
    });

    it('set/get không bao giờ chạm localStorage', () => {
        accessTokenStore.set('at-1');
        expect(accessTokenStore.get()).toBe('at-1');
        expect(Object.keys(localStorage)).toEqual([]);
    });

    it('báo cho listener khi đổi, bỏ qua khi giá trị không đổi, huỷ đăng ký được', () => {
        const listener = vi.fn();
        const unsubscribe = accessTokenStore.subscribe(listener);
        accessTokenStore.set('a');
        accessTokenStore.set('a');
        accessTokenStore.set(null);
        unsubscribe();
        accessTokenStore.set('b');
        expect(listener.mock.calls).toEqual([['a'], [null]]);
    });

    it('dọn khoá cũ token/refreshToken/user của bản build trước, giữ nguyên khoá khác', () => {
        localStorage.setItem('token', 'old-at');
        localStorage.setItem('refreshToken', 'old-rt');
        localStorage.setItem('user', '{"id":"u"}');
        localStorage.setItem('qh-guest-cart', '[]');

        purgeLegacyAuthStorage();

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect(localStorage.getItem('qh-guest-cart')).toBe('[]');
    });

    it('cờ phiên chỉ là "1", không chứa bí mật', () => {
        sessionHint.set();
        expect(Object.values(localStorage)).toEqual(['1']);
        sessionHint.clear();
        expect(sessionHint.isSet()).toBe(false);
    });
});

describe('resolveApiOrigin', () => {
    it.each([
        [undefined, ''],
        ['', ''],
        ['/api', ''],
        ['/api/', ''],
        ['http://localhost:5050', 'http://localhost:5050'],
        ['https://shop.vn/api', 'https://shop.vn'],
    ])('%s -> "%s" (không bao giờ thành /api/api)', (raw, expected) => {
        expect(resolveApiOrigin(raw)).toBe(expected);
    });
});
