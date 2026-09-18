#!/usr/bin/env bash
# qh-checkpoint.sh - restorable snapshots of the owner's database (decision D12).
#
# ORCHESTRATOR ONLY. Tracks never call this.
#
#   scripts/qh-checkpoint.sh db <label> [wave]   # pg_dump -Fc + SHA256SUMS
#   scripts/qh-checkpoint.sh verify <label|file> # restore into a scratch DB and
#                                                # run the invariants on the copy
#   scripts/qh-checkpoint.sh list
#
# <label> is free text; `w0-start`, `w1-pre`, `w1-post` are the conventions.
# The wave is taken from a `w<N>-` prefix on the label when present.
# Dumps land in plans/<plan>/checkpoints/w<N>/ (git-ignored). Only the two most
# recent wave directories are kept.
#
# `verify` restores into quanghuongdb_ckverify and drops it again. It refuses to
# touch any database whose name does not end in _ckverify - the owner's database
# is never a restore target here (that is R3, done by hand).
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAN_DIR="${QH_PLAN_DIR:-$REPO_ROOT/plans/260917-2100-full-system-overhaul}"
CK_ROOT="$PLAN_DIR/checkpoints"
PG_CONTAINER="${QH_PG_CONTAINER:-quanghuong-postgres}"
SRC_DB="${QH_SRC_DB:-quanghuongdb}"
VERIFY_DB="quanghuongdb_ckverify"

die() { echo "qh-checkpoint: $*" >&2; exit 2; }

pgx() { docker exec "$PG_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c "$1"; }

do_db() {
  local label="${1:-}" wave="${2:-}"
  [ -n "$label" ] || die "usage: qh-checkpoint.sh db <label> [wave]"
  if [ -z "$wave" ]; then
    case "$label" in w[0-9]*-*) wave="${label%%-*}"; wave="${wave#w}" ;; *) wave="${QH_WAVE:-0}" ;; esac
  fi
  local dir="$CK_ROOT/w$wave"
  mkdir -p "$dir"
  local stamp file
  stamp="$(date +%y%m%d-%H%M%S)"
  file="$dir/${label}-${stamp}.dump"
  echo "qh-checkpoint: pg_dump -Fc $SRC_DB -> $file"
  if ! docker exec "$PG_CONTAINER" pg_dump -U postgres -Fc "$SRC_DB" > "$file"; then
    rm -f "$file"; die "pg_dump failed"
  fi
  [ -s "$file" ] || { rm -f "$file"; die "pg_dump produced an empty file"; }
  ( cd "$dir" && sha256sum "$(basename "$file")" >> SHA256SUMS )
  echo "qh-checkpoint: $(du -h "$file" | cut -f1)  sha256 $(sha256sum "$file" | cut -c1-16)..."
  # retention: keep the two most recent wave directories
  local keep
  keep="$(ls -1dt "$CK_ROOT"/w* 2>/dev/null | tail -n +3)"
  if [ -n "$keep" ]; then
    echo "qh-checkpoint: pruning old wave checkpoints:"; echo "$keep" | sed 's/^/  rm -rf /'
    echo "$keep" | xargs -r rm -rf
  fi
  echo "$file"
}

do_verify() {
  local arg="${1:-}" file
  [ -n "$arg" ] || die "usage: qh-checkpoint.sh verify <label|file>"
  if [ -f "$arg" ]; then file="$arg"; else
    file="$(ls -1t "$CK_ROOT"/w*/"$arg"*.dump 2>/dev/null | head -1)"
  fi
  [ -n "$file" ] && [ -f "$file" ] || die "no dump found for '$arg'"
  case "$VERIFY_DB" in *_ckverify) ;; *) die "refusing: verify target must end in _ckverify" ;; esac

  echo "qh-checkpoint: verifying $file"
  ( cd "$(dirname "$file")" && sha256sum -c --ignore-missing SHA256SUMS 2>/dev/null | grep -F "$(basename "$file")" ) \
    || echo "qh-checkpoint: (no SHA256SUMS entry - continuing)"

  pgx "DROP DATABASE IF EXISTS \"$VERIFY_DB\" WITH (FORCE);" || die "cannot drop $VERIFY_DB"
  pgx "CREATE DATABASE \"$VERIFY_DB\";" || die "cannot create $VERIFY_DB"
  local rc=0
  docker exec -i "$PG_CONTAINER" pg_restore -U postgres -d "$VERIFY_DB" --no-owner --no-acl \
    < "$file" > /tmp/qh-ckverify.log 2>&1 || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "qh-checkpoint: pg_restore exited $rc (warnings are normal, errors are not):"
    grep -iE '^pg_restore: (error|warning)' /tmp/qh-ckverify.log | head -20
  fi
  echo "--- invariants on the restored copy ---"
  QH_SCRATCH="${QH_SCRATCH:-/tmp/qh-scratch}" "$REPO_ROOT/scripts/qh-invariants.sh" --db "$VERIFY_DB"
  local irc=$?
  pgx "DROP DATABASE IF EXISTS \"$VERIFY_DB\" WITH (FORCE);" >/dev/null
  if [ "$irc" -eq 0 ]; then echo "qh-checkpoint: RESTORE VERIFIED ($file)"; else echo "qh-checkpoint: RESTORE FAILED VERIFICATION"; fi
  return $irc
}

case "${1:-}" in
  db)     shift; do_db "$@" ;;
  verify) shift; do_verify "$@" ;;
  list)   find "$CK_ROOT" -name '*.dump' -printf '%TY-%Tm-%Td %TH:%TM  %10s  %p\n' 2>/dev/null | sort ;;
  *)      sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 2 ;;
esac
