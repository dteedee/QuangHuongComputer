/**
 * Access token — IN MEMORY ONLY.
 *
 * Before: `token` + `refreshToken` + `user` sat in localStorage, so one XSS anywhere (storefront or
 * back office) could copy a 14-day refresh token and own the account from another machine. Now:
 *   · the refresh token is an HttpOnly cookie (`qh_rt`, Path=/api/auth) — script never sees it;
 *   · the short-lived access token lives only in this module variable. A reload loses it on purpose;
 *     `refreshSession()` (api/auth-refresh.ts) gets a fresh one from the cookie on page load.
 * An XSS can still act as the user while the tab is open, but it can no longer steal a session.
 */
import { browserStorage } from '../browser-storage';

type Listener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

export const accessTokenStore = {
    get(): string | null {
        return accessToken;
    },
    set(next: string | null): void {
        if (next === accessToken) return;
        accessToken = next;
        listeners.forEach((listener) => listener(next));
    },
    /** Returns the unsubscribe function. */
    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};

/**
 * Non-secret hint "this browser had a session", so an anonymous visitor's page load does not wait
 * on (or even send) a refresh call that can only fail. Holds `'1'`, nothing else — safe to be
 * readable by script. Missing hint + live cookie just means the user signs in again.
 */
const SESSION_HINT_KEY = 'qh.session';

export const sessionHint = {
    isSet: (): boolean => browserStorage.getItem(SESSION_HINT_KEY) === '1',
    set: (): void => {
        browserStorage.setItem(SESSION_HINT_KEY, '1');
    },
    clear: (): void => {
        browserStorage.removeItem(SESSION_HINT_KEY);
    },
};

/** Keys the pre-cookie SPA wrote. Tokens must never be left behind in localStorage. */
export const LEGACY_AUTH_STORAGE_KEYS = ['token', 'refreshToken', 'user'] as const;

/**
 * One-time migration clean-up, run on every start (idempotent, cheap). Users signed in with the
 * old build sign in once more: their refresh token was in localStorage and is deliberately not
 * carried over into the cookie (the backend no longer accepts a token from the request body).
 */
export function purgeLegacyAuthStorage(): void {
    LEGACY_AUTH_STORAGE_KEYS.forEach((key) => browserStorage.removeItem(key));
}
