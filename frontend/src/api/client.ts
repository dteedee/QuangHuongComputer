import axios, { type AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { normalizeApiError } from '../lib/api-error';
import { browserStorage } from '../lib/browser-storage';

// Create axios instance
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const client = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — registered exactly once (module-level side effect; ES
// modules are evaluated once regardless of how many files import `client`).
client.interceptors.request.use(
  (config) => {
    const token = browserStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — also registered exactly once.
// LƯU Ý: interceptor refresh-token 401 nằm ở `auth.ts` (setupTokenRefreshInterceptor,
// gọi trong AuthContext) — dùng đúng path `/auth/refresh-token` và lưu lại refreshToken
// mới (BE rotate refresh token). Không lặp lại logic đó ở đây để tránh 2 interceptor
// tranh nhau xử lý cùng 1 lỗi 401. (`auth.ts`/`AuthContext.tsx` register a SECOND
// response interceptor of their own, and do so twice — once at module load, once per
// AuthProvider mount; that duplication is real but lives outside this track's file
// ownership — see `integration-requests-w1.md`.)
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const normalized = normalizeApiError(error);
    error.normalized = normalized;

    // Never log the response body — it can carry PII (name, address, phone).
    // The traceId is the safe, sufficient thing to quote back to support/logs.
    if (!error.response) {
      console.error(`Network error calling ${error.config?.url ?? 'unknown endpoint'}`);
      toast.error(normalized.message, { id: 'api-error-network' });
    } else if (normalized.status === 403) {
      toast.error(normalized.message, { id: 'api-error-403' });
    } else if (normalized.status === 429) {
      const wait = normalized.retryAfter ? ` (thử lại sau ${normalized.retryAfter}s)` : '';
      toast.error(`${normalized.message}${wait}`, { id: 'api-error-429' });
    } else {
      console.error(`API error ${normalized.status} at ${error.config?.url ?? 'unknown endpoint'} — traceId: ${normalized.traceId ?? 'n/a'}`);
    }

    return Promise.reject(error);
  }
);

export default client;
