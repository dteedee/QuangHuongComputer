import { QueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

/**
 * The one QueryClient instance for the whole app (mounted once in `main.tsx`).
 * Defaults were previously unset, so every screen used TanStack Query's raw
 * defaults (staleTime 0 -> refetch on every mount, retry 3x even on a 404).
 */

// Data is "fresh enough" for 30s: avoids a refetch storm when several
// components on the same page mount the same query back to back.
const DEFAULT_STALE_TIME_MS = 30_000;

// One retry beyond the first attempt — enough to ride out a blip without
// making the user stare at a spinner for the default 3-retry backoff chain.
const MAX_RETRIES = 2;

/**
 * Retry only what retrying can fix: a network failure (no response at all,
 * e.g. the API was briefly unreachable) or a 5xx (server's fault, may be
 * transient). A 4xx is the caller's mistake — retrying it just repeats the
 * same rejection three times before finally showing the error.
 */
function isRetryableError(error: unknown): boolean {
  const status = (error as AxiosError | undefined)?.response?.status;
  if (status === undefined) return true; // network error / timeout — worth a retry
  return status >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME_MS,
      // Backoffice screens (dashboards, tables left open in a background tab)
      // must not silently refetch every time the user alt-tabs back in.
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryableError(error),
    },
    mutations: {
      // Mutations are rarely safe to retry blindly (a POST that already
      // partially succeeded server-side should not be replayed automatically).
      retry: false,
    },
  },
});
