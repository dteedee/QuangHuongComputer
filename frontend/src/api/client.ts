import axios, { type AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { normalizeApiError } from '../lib/api-error';
import { API_ORIGIN } from '../lib/api-origin';
import { accessTokenStore } from '../lib/auth/access-token-store';

// Same origin by default ('' + '/api'); see lib/api-origin.ts.
export const client = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 30000,
  // The refresh token is an HttpOnly cookie. Same-origin requests send it anyway; this makes a
  // cross-origin-but-same-site API (e2e TEST stack) both STORE it on login and SEND it on refresh.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — registered exactly once (module-level side effect; ES
// modules are evaluated once regardless of how many files import `client`).
// The access token comes from memory only (lib/auth/access-token-store.ts), never localStorage.
client.interceptors.request.use(
  (config) => {
    const token = accessTokenStore.get();
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — also registered exactly once. The 401 -> refresh -> retry interceptor
// lives in `auth-refresh.ts` (single-flight, cross-tab lock); it is NOT duplicated here.
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
