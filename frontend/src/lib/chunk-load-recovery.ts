import { sessionBrowserStorage } from './browser-storage';

// A stale service worker cache / an in-flight deploy can leave a lazy route's
// JS chunk 404ing. One automatic reload usually fixes it (picks up the new
// asset manifest); a second one in the same tab session means something else
// is wrong, so we stop and let the ErrorBoundary's fallback UI take over
// instead of reload-looping the tab forever.
const CHUNK_RELOAD_FLAG_KEY = 'qh_chunk_reload_attempted';

/** True for a dynamic-import failure (Vite/webpack/Safari module-script wording), not an app bug. */
export function isChunkLoadError(error: Error | null | undefined): boolean {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  const message = error.message || '';
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\w.-]+ failed/i.test(message)
  );
}

/**
 * Reloads the page once per tab session to recover from a chunk-load error.
 * Returns true if it triggered the reload, false if it declined (already
 * tried once this session) — the caller should render its normal error
 * fallback UI when this returns false.
 */
export function reloadOnceForChunkError(): boolean {
  const alreadyAttempted = sessionBrowserStorage.getItem(CHUNK_RELOAD_FLAG_KEY) === '1';
  if (alreadyAttempted) return false;
  sessionBrowserStorage.setItem(CHUNK_RELOAD_FLAG_KEY, '1');
  window.location.reload();
  return true;
}
