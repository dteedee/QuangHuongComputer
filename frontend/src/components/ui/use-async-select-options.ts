/**
 * Server-side option loading for `AsyncSearchableSelect`: debounce the query,
 * reset to page 1 when it changes, append pages, and surface failures.
 *
 * Extracted so the component file stays readable and under the 200-LOC rule.
 * The `failed` flag is the important part: the previous implementation swallowed
 * the rejection into `console.error`, leaving an empty list that looked exactly
 * like "no results" — a dead endpoint read as a legitimate empty dataset.
 */
import { useCallback, useEffect, useState } from 'react';
import type { SelectOptionItem } from './select-list';

export type LoadOptions = (
  search: string,
  page: number,
) => Promise<{ options: SelectOptionItem[]; hasMore: boolean }>;

export interface AsyncSelectState {
  options: SelectOptionItem[];
  loading: boolean;
  failed: boolean;
  hasMore: boolean;
  search: string;
  setSearch: (value: string) => void;
  loadNextPage: () => void;
}

const DEBOUNCE_MS = 300;

export function useAsyncSelectOptions(loadOptions: LoadOptions, enabled: boolean): AsyncSelectState {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<SelectOptionItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced]);

  const fetchPage = useCallback(
    async (q: string, p: number) => {
      setLoading(true);
      setFailed(false);
      try {
        const result = await loadOptions(q, p);
        setOptions((prev) => (p === 1 ? result.options : [...prev, ...result.options]));
        setHasMore(result.hasMore);
      } catch {
        setFailed(true);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions],
  );

  useEffect(() => {
    if (enabled) void fetchPage(debounced, page);
  }, [enabled, debounced, page, fetchPage]);

  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);

  return { options, loading, failed, hasMore, search, setSearch, loadNextPage };
}
