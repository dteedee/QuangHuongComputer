#!/usr/bin/env bash
# The ONE sequence that brings the stack up — `make up` and `make deploy` both call this, so
# every local demo is a deployment rehearsal (D05 §"Ly do", phase-64 step 4).
#
# 1. infra up --wait (postgres, redis, rabbitmq)
# 2. safety stop: refuse if ${COMPOSE_PROJECT_NAME}-postgres is already running under a DIFFERENT
#    compose project — this is exactly the "make up seizes the shared dev DB" accident D05/D12
#    exist to prevent. Override with FORCE=1 only if you are certain.
# 3. pre-migrate dump (best-effort; a fresh/empty database has nothing to lose)
# 4. one-shot `migrate` job: `db migrate` then `db seed --profile <profile>` — a non-zero exit
#    STOPS here and leaves the previous `api`/`web` containers running untouched
# 5. api + web up --wait
#
# Usage:
#   scripts/stack-up.sh                       # local: docker-compose.yml, .env.docker, demo seed
#   scripts/stack-up.sh --prod                # docker-compose.yml + .prod.yml, .env.prod, reference seed
#   scripts/stack-up.sh --seed-profile demo   # override the profile either mode picked
#   FORCE=1 scripts/stack-up.sh               # bypass the shared-Postgres safety stop
#
# --prod must come before --seed-profile/--env-file on the command line if you want to override
# what it sets (flags are applied in argument order).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-quanghuong}"
ENV_FILE=".env.docker"
COMPOSE_FILES=(-f docker-compose.yml)
SEED_PROFILE="demo"

while [ $# -gt 0 ]; do
  case "$1" in
    --prod)
      ENV_FILE=".env.prod"
      COMPOSE_FILES+=(-f docker-compose.prod.yml)
      SEED_PROFILE="reference"
      shift
      ;;
    --seed-profile)
      SEED_PROFILE="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    *)
      echo "stack-up: unknown argument '$1'" >&2
      exit 2
      ;;
  esac
done

[ -f "${ENV_FILE}" ] || {
  echo "stack-up: ${ENV_FILE} not found. Run scripts/gen-secrets.sh --target ${ENV_FILE} --from ${ENV_FILE}.example first (make up does this for you)." >&2
  exit 2
}

compose() {
  docker compose -p "${PROJECT_NAME}" "${COMPOSE_FILES[@]}" --env-file "${ENV_FILE}" "$@"
}

log() { echo "stack-up: $*"; }

# --- 2. safety stop (before touching anything) -----------------------------------------------
container_name="${PROJECT_NAME}-postgres"
if grep -qx "${container_name}" < <(docker ps --format '{{.Names}}'); then
  existing_project="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "${container_name}" 2>/dev/null || true)"
  if [ "${existing_project}" != "${PROJECT_NAME}" ]; then
    if [ "${FORCE:-0}" != "1" ]; then
      cat >&2 <<EOF
stack-up: REFUSED.
Container '${container_name}' is already running, but it belongs to compose project
'${existing_project:-<none/unknown>}', not '${PROJECT_NAME}'.
Bringing this stack up would seize that database and could seed demo data over real data —
this is exactly the accident D05/D12 exist to prevent.
If you are certain this is safe, re-run with FORCE=1.
EOF
      exit 1
    fi
    log "WARNING: FORCE=1 — proceeding even though '${container_name}' belongs to project '${existing_project:-<none>}'"
  fi
fi

# --- 1. infra up --wait -------------------------------------------------------------------------
log "[1/5] infra up (postgres redis rabbitmq) --wait, project=${PROJECT_NAME}"
compose up -d --wait postgres redis rabbitmq

# --- 3. pre-migrate dump (best-effort — direct pg_dump against the postgres container itself, so
# this does not depend on the `backup` sidecar image being built yet on a brand new server) ------
log "[2/5] pre-migrate dump"
mkdir -p "${REPO_ROOT}/backups"
dump_file="${REPO_ROOT}/backups/pre-migrate_$(date -u +%Y%m%dT%H%M%SZ).dump"
# shellcheck disable=SC2016 # intentional: expanded by the CONTAINER's shell (sh -c), not this one
if compose exec -T postgres sh -c 'pg_dump -U "${POSTGRES_USER:-postgres}" -Fc "${POSTGRES_DB:-quanghuongdb}"' > "${dump_file}" 2>/dev/null \
  && [ -s "${dump_file}" ]; then
  log "pre-migrate dump saved to ${dump_file}"
else
  rm -f "${dump_file}"
  log "WARNING: pre-migrate dump produced nothing (a fresh/empty database has nothing to lose) — continuing"
fi

# --- 4. migrate + seed, one shot -----------------------------------------------------------------
log "[3/5] migrate + seed --profile ${SEED_PROFILE}"
if ! compose run --rm --entrypoint sh migrate -c \
  "dotnet ApiGateway.dll db migrate && dotnet ApiGateway.dll db seed --profile ${SEED_PROFILE}"; then
  log "REFUSED: migrate/seed failed (non-zero exit) — see the log above. Any previously running api/web containers are untouched. Fix the error and re-run."
  exit 1
fi

# --- 5. api + web ----------------------------------------------------------------------------
log "[4/5] api + web up --wait"
compose up -d --wait api web

# --- Done: print the URL + admin account -----------------------------------------------------
site_url="$(grep -E '^SITE_URL=' "${ENV_FILE}" | tail -n1 | cut -d= -f2-)"
admin_email="$(grep -E '^ADMIN_EMAIL=' "${ENV_FILE}" | tail -n1 | cut -d= -f2-)"
log "[5/5] up. URL: ${site_url:-http://localhost:8080}"
# `[ ... ] && log ...` ở DÒNG CUỐI dưới `set -e` làm cả script thoát 1 khi điều kiện sai —
# một lần deploy thành công vẫn bị `make deploy` báo lỗi. Dùng if để mã thoát luôn là 0.
if [ -n "${admin_email:-}" ]; then
  log "Admin: ${admin_email} (forced password change on first login)"
fi
if [ "${SEED_PROFILE}" = "demo" ]; then
  log "Demo accounts: docs/deployment-guide.md §2 (Development only)."
fi
exit 0
