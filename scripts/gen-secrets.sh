#!/usr/bin/env bash
# Generates DB/Redis/RabbitMQ passwords + a JWT signing key with `openssl rand`, and writes them
# into a target .env file — copying it from an example first if it does not exist yet.
# D05 §10/§15, phase-64 step 5.
#
# Usage:
#   scripts/gen-secrets.sh                                   # .env.prod from .env.prod.example
#   scripts/gen-secrets.sh --target .env.docker --from .env.docker.example
#
# Only fills placeholder/empty values (CHANGE_ME_*, or the var missing entirely) — a value an
# operator already set (e.g. after a first run, or hand-edited) is left untouched. Re-running is
# therefore safe and does not rotate secrets you already have; to rotate, blank the line first.
set -euo pipefail

TARGET=".env.prod"
FROM=".env.prod.example"

while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    --from) FROM="$2"; shift 2 ;;
    *) echo "gen-secrets: unknown argument '$1'" >&2; exit 2 ;;
  esac
done

if [ ! -f "${TARGET}" ]; then
  [ -f "${FROM}" ] || { echo "gen-secrets: neither ${TARGET} nor ${FROM} exists" >&2; exit 2; }
  cp "${FROM}" "${TARGET}"
  chmod 600 "${TARGET}"
  echo "gen-secrets: created ${TARGET} from ${FROM}"
fi

# One random value per KEY= line whose value is empty or a CHANGE_ME_* placeholder.
# rand -base64 33 gives a 44-char value with no shell-hostile characters once tr strips '/','+','='.
random_value() {
  local length="$1"
  openssl rand -base64 "$((length * 2))" | tr -dc 'A-Za-z0-9' | head -c "${length}"
}

fill() {
  local key="$1" length="$2"
  local current
  current="$(grep -E "^${key}=" "${TARGET}" | head -n1 | cut -d= -f2- || true)"
  if [ -z "${current}" ] || [[ "${current}" == CHANGE_ME_* ]]; then
    local value
    value="$(random_value "${length}")"
    if grep -qE "^${key}=" "${TARGET}"; then
      sed -i.bak "s#^${key}=.*#${key}=${value}#" "${TARGET}" && rm -f "${TARGET}.bak"
    else
      printf '%s=%s\n' "${key}" "${value}" >> "${TARGET}"
    fi
    echo "gen-secrets: generated ${key} (${length} chars)"
  else
    echo "gen-secrets: ${key} already set, leaving it"
  fi
}

fill POSTGRES_PASSWORD 32
fill REDIS_PASSWORD 32
fill RABBITMQ_PASSWORD 32
fill JWT_KEY 64

echo "gen-secrets: done — review ${TARGET} (chmod 600, never committed) before starting the stack"
