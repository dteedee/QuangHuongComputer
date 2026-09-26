import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { createSessionRefresher, installRefreshInterceptor, CSRF_HEADERS } from './auth-refresh';
import { accessTokenStore, sessionHint } from '../lib/auth/access-token-store';

/**
 * Luồng 401 -> refresh -> gọi lại, chạy trên một axios instance thật với adapter giả
 * (không mạng). Bảo vệ: refresh đi bằng cookie + header CSRF, không body token; nhiều 401 cùng
 * lúc chỉ tạo MỘT lần refresh (gọi 2 lần = backend coi là dùng lại token và giết cả phiên).
 */
type Handler = (config: InternalAxiosRequestConfig) => { status: number; data?: unknown };

function fakeServer(handler: Handler) {
    const calls: InternalAxiosRequestConfig[] = [];
    const adapter: AxiosAdapter = async (config) => {
        calls.push(config);
        const { status, data } = handler(config);
        const response = { status, data, statusText: String(status), headers: {}, config };
        if (status >= 400) {
            throw new AxiosError(`HTTP ${status}`, String(status), config, null, response);
        }
        return response;
    };
    const http = axios.create({ adapter });
    http.interceptors.request.use((config) => {
        const token = accessTokenStore.get();
        if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
    return { http, calls };
}

const user = { id: 'u1', email: 'a@b.vn', fullName: 'A', roles: ['Customer'] };

describe('auth-refresh', () => {
    beforeEach(() => {
        accessTokenStore.set(null);
        localStorage.clear();
    });

    it('refresh gửi header CSRF, KHÔNG gửi refresh token trong body; lưu access token vào bộ nhớ', async () => {
        const { http, calls } = fakeServer(() => ({ status: 200, data: { token: 'new-at', user } }));

        const session = await createSessionRefresher(http)();

        expect(session?.token).toBe('new-at');
        expect(accessTokenStore.get()).toBe('new-at');
        expect(sessionHint.isSet()).toBe(true);
        expect(calls[0].url).toBe('/auth/refresh-token');
        expect(calls[0].headers['X-Requested-With']).toBe(CSRF_HEADERS['X-Requested-With']);
        expect(calls[0].data ?? null).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('nhiều 401 song song -> đúng MỘT lần refresh, mọi request được gọi lại với token mới', async () => {
        accessTokenStore.set('expired-at');
        let refreshCount = 0;
        const { http, calls } = fakeServer((config) => {
            if (config.url === '/auth/refresh-token') {
                refreshCount += 1;
                return { status: 200, data: { token: 'fresh-at', user } };
            }
            return config.headers.Authorization === 'Bearer fresh-at'
                ? { status: 200, data: { ok: config.url } }
                : { status: 401 };
        });
        installRefreshInterceptor(http, createSessionRefresher(http));

        const results = await Promise.all(['/a', '/b', '/c'].map((url) => http.get(url)));

        expect(refreshCount).toBe(1);
        expect(results.map((r) => r.data.ok)).toEqual(['/a', '/b', '/c']);
        expect(calls.filter((c) => c.url === '/a')).toHaveLength(2);
    });

    it('refresh thất bại -> xoá token trong bộ nhớ và cờ phiên, trả lỗi 401 gốc, không lặp vô hạn', async () => {
        accessTokenStore.set('expired-at');
        sessionHint.set();
        const { http, calls } = fakeServer(() => ({ status: 401 }));
        installRefreshInterceptor(http, createSessionRefresher(http));
        const listener = vi.fn();
        const unsubscribe = accessTokenStore.subscribe(listener);

        await expect(http.get('/orders')).rejects.toMatchObject({ response: { status: 401 } });

        expect(accessTokenStore.get()).toBeNull();
        expect(sessionHint.isSet()).toBe(false);
        expect(listener).toHaveBeenCalledWith(null);
        expect(calls.map((c) => c.url)).toEqual(['/orders', '/auth/refresh-token']);
        unsubscribe();
    });

    it('401 của request ẩn danh (không Bearer) -> không refresh', async () => {
        const { http, calls } = fakeServer(() => ({ status: 401 }));
        installRefreshInterceptor(http, createSessionRefresher(http));

        await expect(http.get('/me')).rejects.toBeInstanceOf(AxiosError);

        expect(calls).toHaveLength(1);
    });

    it('lỗi mạng khi refresh -> giữ cờ phiên để lần tải trang sau thử lại', async () => {
        sessionHint.set();
        const http = axios.create({
            adapter: async (config) => {
                throw new AxiosError('Network Error', 'ERR_NETWORK', config);
            },
        });

        expect(await createSessionRefresher(http)()).toBeNull();
        expect(sessionHint.isSet()).toBe(true);
    });
});
