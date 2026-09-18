/**
 * Recent searches, per browser. `browserStorage` is the safe wrapper (private
 * windows and blocked site data throw on raw localStorage).
 */
import { useCallback, useState } from 'react';
import { browserStorage } from '../../lib/browser-storage';

const KEY = 'qh.recent-searches';
const MAX = 6;

export function useRecentSearches() {
    const [recent, setRecent] = useState<string[]>(() => {
        const raw = browserStorage.getJSON<string[]>(KEY, []);
        return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string').slice(0, MAX) : [];
    });

    const remember = useCallback((term: string) => {
        const value = term.trim();
        if (!value) return;
        setRecent((prev) => {
            const next = [value, ...prev.filter((t) => t.toLowerCase() !== value.toLowerCase())].slice(0, MAX);
            browserStorage.setJSON(KEY, next);
            return next;
        });
    }, []);

    const clear = useCallback(() => {
        setRecent([]);
        browserStorage.removeItem(KEY);
    }, []);

    return { recent, remember, clear };
}
