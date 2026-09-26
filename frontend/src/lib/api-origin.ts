/**
 * Where the SPA reaches the backend. `''` means SAME ORIGIN, which is the normal case:
 *   · dev:  Vite on :5174 proxies /api, /hubs, /media, /uploads to the API (vite.config.ts);
 *   · prod: Caddy serves the SPA and proxies the same prefixes (deploy/Caddyfile).
 * Same origin matters for the HttpOnly refresh cookie: it is then a plain first-party cookie with
 * no CORS-credentials dance. An absolute `VITE_API_URL` (e.g. the e2e TEST stack's
 * `http://localhost:5050`) still works: it is same-SITE, so the SameSite=Strict cookie is sent, and
 * `client` uses `withCredentials`.
 *
 * Accepts `VITE_API_URL` with or without a trailing `/api` — docker-compose/Dockerfile pass `/api`,
 * and the client used to append another `/api`, producing `/api/api/...` in the built image.
 */
export function resolveApiOrigin(raw: string | undefined | null): string {
    return (raw ?? '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');
}

export const API_ORIGIN = resolveApiOrigin(import.meta.env.VITE_API_URL);
