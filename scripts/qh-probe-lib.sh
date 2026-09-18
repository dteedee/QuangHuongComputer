#!/usr/bin/env bash
# qh-probe-lib.sh - the only sanctioned HTTP client for agents (decision D12).
#
# An audit agent once sent `DELETE /api/auth/roles/Admin` to the owner's live API
# "to check whether it was blocked". It was not. This library makes that call
# impossible to issue by accident: anything that is not a GET/HEAD is refused
# unless it is addressed to the TEST stack on :5050.
#
# Source it, do not execute it:
#   source /abs/path/scripts/qh-probe-lib.sh
#   qh_api GET  /api/products                 # -> TEST :5050 by default
#   QH_API_BASE=http://localhost:5000 qh_api GET /api/products     # read-only, allowed
#   QH_API_BASE=http://localhost:5000 qh_api POST /api/products    # REFUSED, exit 9
#
# Env:
#   QH_API_BASE   default http://localhost:5050
#   QH_TOKEN      bearer token, if set (keep tokens in shell vars, never in files)
#   QH_SCRATCH    where the rate-limit ledger lives
# Exit codes: 9 = refused by the safety contract, 8 = client-side rate limit.

QH_API_BASE="${QH_API_BASE:-http://localhost:5050}"
QH_SCRATCH="${QH_SCRATCH:-/tmp/qh-scratch}"
QH_PROBE_STATE="$QH_SCRATCH/probe-state"
mkdir -p "$QH_PROBE_STATE" 2>/dev/null

# The owner's shared API. Everything here is GET-only except one login.
QH_DEV_BASES_RE='^https?://(localhost|127\.0\.0\.1|\[::1\]):5000(/|$)'
QH_TEST_BASES_RE='^https?://(localhost|127\.0\.0\.1|\[::1\]):5050(/|$)'

qh__refuse() { echo "qh_api: REFUSED - $*" >&2; return 9; }

# Shared 100 req / 60 s limiter on :5000 is partitioned by IP, and every agent
# plus the owner is 127.0.0.1. Keep a track well under its share.
qh__rate_guard_dev() {
  local ledger="$QH_PROBE_STATE/dev-calls.log" now cutoff recent
  now="$(date +%s)"; cutoff=$((now - 60))
  touch "$ledger"
  recent="$(awk -v c="$cutoff" '$1 > c' "$ledger" | wc -l)"
  if [ "$recent" -ge "${QH_DEV_RPM:-20}" ]; then
    echo "qh_api: RATE LIMIT - ${recent} calls to :5000 in the last 60s (budget ${QH_DEV_RPM:-20}/min)." >&2
    echo "qh_api: the owner shares that limiter. Wait, then retry." >&2
    return 8
  fi
  echo "$now" >> "$ledger"
  awk -v c="$cutoff" '$1 > c' "$ledger" > "$ledger.tmp" && mv "$ledger.tmp" "$ledger"
  return 0
}

# POST /api/auth/login on :5000 WRITES a RefreshToken row and is rate-limited
# 5 failures / 10 min PER EMAIL - a guessed password locks the owner out.
qh__login_guard_dev() {
  local body="$1" email stamp now last
  # Opt-in, because a wrong password here locks the OWNER out for 10 minutes.
  # The orchestrator sets QH_LOGIN_OK=1 only when it has handed over real
  # credentials; nothing a track does by accident can reach this endpoint.
  if [ "${QH_LOGIN_OK:-0}" != "1" ]; then
    echo "qh_api: REFUSED - login on :5000 needs QH_LOGIN_OK=1 and credentials from the" >&2
    echo "qh_api: orchestrator. 5 wrong passwords per email = the owner cannot log in for 10 min." >&2
    return 9
  fi
  email="$(printf '%s' "$body" | jq -r '.email // .Email // empty' 2>/dev/null)"
  [ -n "$email" ] || { echo "qh_api: login body must contain .email" >&2; return 9; }
  stamp="$QH_PROBE_STATE/login-$(printf '%s' "$email" | tr -c 'A-Za-z0-9' '_')"
  now="$(date +%s)"
  if [ -f "$stamp" ]; then
    last="$(cat "$stamp")"
    if [ $((now - last)) -lt 3600 ]; then
      echo "qh_api: REFUSED - already logged in as $email $(( (now-last)/60 )) min ago." >&2
      echo "qh_api: max 1 login per account per hour on :5000. Reuse the token you already have." >&2
      return 9
    fi
  fi
  echo "$now" > "$stamp"
  return 0
}

# qh_api METHOD PATH [curl args...]
# Body: pass --data '<json>' (Content-Type: application/json is added for you).
qh_api() {
  # NOTE: never name a local variable `path` here - in zsh `path` is tied to PATH
  # and a local would wipe the command search path inside this function.
  local method="${1:-}" epath="${2:-}"
  shift 2 2>/dev/null || { echo "usage: qh_api METHOD PATH [curl args]" >&2; return 2; }
  method="$(printf '%s' "$method" | tr '[:lower:]' '[:upper:]')"
  case "$epath" in /*) ;; *) epath="/$epath" ;; esac

  local url="${QH_API_BASE%/}$epath"
  local is_test=0 is_dev=0
  [[ "$url" =~ $QH_TEST_BASES_RE ]] && is_test=1
  [[ "$url" =~ $QH_DEV_BASES_RE ]] && is_dev=1

  if [ "$method" != "GET" ] && [ "$method" != "HEAD" ]; then
    if [ "$is_test" -ne 1 ]; then
      # The single exception in the whole contract.
      if [ "$is_dev" -eq 1 ] && [ "$method" = "POST" ] && [ "$epath" = "/api/auth/login" ]; then
        local body="" prev_flag="" a=""
        for a in "$@"; do
          case "$prev_flag" in -d|--data|--data-raw|--data-binary) body="$a" ;; esac
          prev_flag="$a"
        done
        qh__login_guard_dev "$body" || return 9
      else
        qh__refuse "$method $url - writes are only allowed against the TEST stack on :5050."
        return 9
      fi
    fi
  fi

  if [ "$is_dev" -eq 1 ]; then
    qh__rate_guard_dev || return 8
  elif [ "$is_test" -ne 1 ]; then
    qh__refuse "unknown base '$QH_API_BASE'. Allowed: :5050 (read+write), :5000 (read-only)."
    return 9
  fi

  local -a auth=()
  [ -n "${QH_TOKEN:-}" ] && auth=(-H "Authorization: Bearer $QH_TOKEN")

  curl -sS -X "$method" "$url" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    "${auth[@]}" "$@"
}

# qh_api_code METHOD PATH [curl args...] -> prints only the HTTP status code.
qh_api_code() {
  local m="$1" p="$2"; shift 2
  qh_api "$m" "$p" -o /dev/null -w '%{http_code}' "$@"
}

# Works both ways: `source` it from bash, or execute it as a CLI from any shell
# (the agent Bash tool runs zsh here, where sourcing bash idioms is fragile):
#   scripts/qh-probe-lib.sh GET /api/products
_qh_sourced=0
if [ -n "${ZSH_VERSION:-}" ]; then
  case "${ZSH_EVAL_CONTEXT:-}" in *:file*|*file) _qh_sourced=1 ;; esac
elif [ -n "${BASH_VERSION:-}" ]; then
  [ "${BASH_SOURCE[0]}" != "${0}" ] && _qh_sourced=1
fi
if [ "$_qh_sourced" -eq 0 ]; then
  if [ $# -eq 0 ]; then sed -n '2,22p' "$0" >&2; exit 2; fi
  qh_api "$@"
  exit $?
fi
unset _qh_sourced
