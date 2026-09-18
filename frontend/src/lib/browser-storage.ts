/**
 * D11: safe wrapper around Web Storage. Private windows (Safari ITP), blocked
 * site data, quota-exceeded, and headless thumbnail capture can all make
 * `localStorage`/`sessionStorage` throw on read OR write — every context that
 * used raw `localStorage.getItem/setItem` was one of those environments away
 * from a white-screen crash. Every read/write here is caught; callers get a
 * safe fallback instead of an exception.
 */

interface SafeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): void;
  /** Parsed JSON read; returns `fallback` on a missing key, a throw, or invalid JSON. */
  getJSON<T>(key: string, fallback: T): T;
  /** Stringifies and writes; returns false (never throws) if storage is unavailable. */
  setJSON(key: string, value: unknown): boolean;
}

function createSafeStorage(getStorage: () => Storage): SafeStorage {
  return {
    getItem(key) {
      try {
        return getStorage().getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        getStorage().setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    removeItem(key) {
      try {
        getStorage().removeItem(key);
      } catch {
        // Nothing to clean up if storage isn't available in the first place.
      }
    },
    getJSON<T>(key: string, fallback: T): T {
      try {
        const raw = getStorage().getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    setJSON(key, value) {
      try {
        getStorage().setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Persists across sessions (theme, audience, comparison list, wishlist cache, tokens). */
export const browserStorage = createSafeStorage(() => window.localStorage);

/** Cleared when the tab closes — used for one-shot, per-session guards (e.g. the chunk-reload flag). */
export const sessionBrowserStorage = createSafeStorage(() => window.sessionStorage);
