/**
 * Silent refresh + the 401 -> refresh -> retry interceptor.
 *
 * `POST /auth/refresh-token` carries NO token in the body: the browser attaches the HttpOnly
 * `qh_rt` cookie (Path=/api/auth, SameSite=Strict) and we add `X-Requested-With`, which the
 * backend requires as the second CSRF layer. The answer is `{ token, user }`; the rotated refresh
 * token comes back as a new cookie.
 *
 * Two locks, because the backend treats a refresh token presented twice as theft (it kills the
 * whole session family):
 *   · single-flight in this tab — ten parallel 401s share ONE refresh call;
 *   · a Web Lock across tabs — two tabs restored at once refresh one after the other, so the second
 *     presents the cookie the first one just rotated, never the old one.
 */
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import client from './client';
import { accessTokenStore, sessionHint } from '../lib/auth/access-token-store';
import type { User } from './auth';

export interface AuthSession {
    token: string;
    user: User;
}

/** Header the backend's RequireAjaxHeaderFilter demands on refresh-token and logout. */
export const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' } as const;

const REFRESH_URL = '/auth/refresh-token';
const CROSS_TAB_LOCK = 'qh-auth-refresh';

type RefreshableConfig = InternalAxiosRequestConfig & { _authRetried?: boolean };

/** Runs `task` under a cross-tab Web Lock when the browser has one (all evergreen browsers do). */
function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks?.request ? (locks.request(CROSS_TAB_LOCK, task) as Promise<T>) : task();
}

/**
 * Builds a single-flight refresher over `http`. Resolves the new session, or `null` when there is
 * no valid session any more (the in-memory token is cleared then). Exported for tests.
 */
export function createSessionRefresher(http: AxiosInstance): () => Promise<AuthSession | null> {
    let inFlight: Promise<AuthSession | null> | null = null;

    const run = async (): Promise<AuthSession | null> => {
        try {
            const { data } = await http.post<AuthSession>(REFRESH_URL, null, { headers: CSRF_HEADERS });
            accessTokenStore.set(data.token);
            sessionHint.set();
            return data;
        } catch (error) {
            accessTokenStore.set(null);
            // Only a real answer from the server ends the session; a network blip keeps the hint so
            // the next page load tries again.
            if ((error as AxiosError)?.response) sessionHint.clear();
            return null;
        }
    };

    return () => {
        if (!inFlight) {
            inFlight = withCrossTabLock(run).finally(() => {
                inFlight = null;
            });
        }
        return inFlight;
    };
}

/**
 * On a 401 from an authenticated call: refresh once (shared), then replay the request with the new
 * token. Anonymous calls, the refresh call itself and replays are passed through untouched, so a
 * dead session can never loop. When refresh fails the in-memory token is cleared; AuthContext hears
 * that and drops the user, and RequireAuth sends protected pages to /login.
 */
export function installRefreshInterceptor(
    http: AxiosInstance,
    refresh: () => Promise<AuthSession | null>,
): number {
    return http.interceptors.response.use(undefined, async (error: AxiosError) => {
        const config = error.config as RefreshableConfig | undefined;
        const sentWithToken = !!config?.headers?.Authorization;
        if (
            error.response?.status !== 401 ||
            !config ||
            config._authRetried ||
            !sentWithToken ||
            (config.url ?? '').includes(REFRESH_URL)
        ) {
            return Promise.reject(error);
        }

        config._authRetried = true;
        const session = await refresh();
        if (!session) return Promise.reject(error);

        config.headers.Authorization = `Bearer ${session.token}`;
        return http(config);
    });
}

/** The app-wide refresher, bound to the shared client. */
export const refreshSession = createSessionRefresher(client);

// Registered once at module load (ES modules evaluate once).
if (typeof window !== 'undefined') {
    installRefreshInterceptor(client, refreshSession);
}
