# ============================================
# Quang Huong Computer — web image: build the SPA, serve it with Caddy (D05 / phase-64 W1-14)
# ============================================
# Build context is the REPO ROOT (docker-compose.yml: `context: .`, `dockerfile:
# frontend/Dockerfile`), not ./frontend — the final stage needs deploy/Caddyfile, which lives
# outside frontend/ and therefore outside a ./frontend-scoped build context.
#
# Replaces the previous nginx-based image: same "build the SPA" stage, but the runtime stage is
# now caddy:2-alpine (see deploy/Caddyfile for routing — same-origin API proxy, WebSocket, SPA
# fallthrough) instead of nginx + a hand-written nginx.conf.

# ----- Build stage -----
FROM node:20-alpine AS build
WORKDIR /app

# Root-relative defaults (same-origin, D05 §3) so this image builds correctly even when a caller
# (e.g. .github/workflows/deploy.yml, which has no per-environment SITE_URL to pass) supplies no
# build args at all — see docker-compose.yml's `web` service for the full explanation.
ARG VITE_API_URL=/api
ARG VITE_NODE_ENV=production
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_FACEBOOK_APP_ID
ARG VITE_SIGNALR_HUB_URL=/hubs/chat
# Rỗng ⇒ bản build production tắt reCAPTCHA phía client (không bao giờ rơi về key test của Google).
ARG VITE_RECAPTCHA_SITE_KEY

ENV VITE_API_URL=$VITE_API_URL \
    VITE_NODE_ENV=$VITE_NODE_ENV \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID \
    VITE_SIGNALR_HUB_URL=$VITE_SIGNALR_HUB_URL \
    VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY

# Layer caching: dependencies only reinstall when the lockfile changes.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

COPY frontend/ .
RUN npm run build

# ----- Runtime stage: Caddy serves the built SPA + reverse-proxies the API -----
FROM caddy:2-alpine AS production

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 80 443

# No ENTRYPOINT/CMD override: the base image already runs
# `caddy run --config /etc/caddy/Caddyfile --adapter caddyfile`, which is exactly the file and
# docroot copied in above.
