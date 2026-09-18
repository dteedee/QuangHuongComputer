#!/usr/bin/env bash
# qh-invariants.sh - tripwire over the OWNER's dev state (decision D12).
#
# Runs on events, not on a clock (an agent cannot set a timer): before a wave
# opens, after every track handover, before and after each gate tier.
#
# It only ever reads: psql with default_transaction_read_only=on, and
# `git status --porcelain`. It changes nothing, anywhere.
#
#   scripts/qh-invariants.sh            # check, exit 0 = clean, 1 = VIOLATION
#   scripts/qh-invariants.sh --init     # record today's numbers + tree as the floor
#   scripts/qh-invariants.sh --db quanghuongdb_restore   # check a restored copy
#
# Ownership check: put one glob per line in $QH_SCRATCH/ownership-allow.txt
# (the globs of the tracks currently running). Files changed outside them, and
# not present in $QH_SCRATCH/tree-baseline.txt, are reported as violations.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QH_SCRATCH="${QH_SCRATCH:-/tmp/qh-scratch}"
PG_CONTAINER="${QH_PG_CONTAINER:-quanghuong-postgres}"
DB="quanghuongdb"
MODE="check"

while [ $# -gt 0 ]; do
  case "$1" in
    --init) MODE="init" ;;
    --db) DB="$2"; shift ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown arg $1" >&2; exit 2 ;;
  esac
  shift
done

mkdir -p "$QH_SCRATCH"
FLOORS="$QH_SCRATCH/invariants-floors.env"
TREE_BASE="$QH_SCRATCH/tree-baseline.txt"
ALLOW="$QH_SCRATCH/ownership-allow.txt"

# Hard floors from the state verified on 2026-09-18 (D12). The recorded floors
# may rise above these, never below.
HARD_ROLES=11; HARD_USERS=30; HARD_ADMINCLAIMS=90; HARD_MIGRATIONS=51; HARD_PRODUCTS=26

psql_q() { # read-only, single value
  docker exec -e PGOPTIONS='-c default_transaction_read_only=on' "$PG_CONTAINER" \
    psql -U postgres -d "$DB" -t -A -c "$1" 2>&1
}

read_counts() {
  local row
  row="$(psql_q "select (select count(*) from \"AspNetRoles\")
                      ||'|'||(select count(*) from \"AspNetUsers\")
                      ||'|'||(select count(*) from \"AspNetRoleClaims\" rc join \"AspNetRoles\" r on r.\"Id\"=rc.\"RoleId\" where r.\"Name\"='Admin')
                      ||'|'||(select count(*) from \"__EFMigrationsHistory\")
                      ||'|'||(select count(*) from \"Products\" where \"IsActive\"=true)
                      ||'|'||(select count(*) from \"AspNetUserRoles\" ur join \"AspNetRoles\" r on r.\"Id\"=ur.\"RoleId\" join \"AspNetUsers\" u on u.\"Id\"=ur.\"UserId\" where r.\"Name\"='Admin' and u.\"Email\"='admin@quanghuong.com')")"
  if ! printf '%s' "$row" | grep -Eq '^[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+$'; then
    echo "QUERY FAILED: $row" >&2
    return 1
  fi
  IFS='|' read -r N_ROLES N_USERS N_ADMINCLAIMS N_MIGRATIONS N_PRODUCTS N_ADMINMEMBER <<< "$row"
}

read_counts || { echo "qh-invariants: RED - cannot read $DB"; exit 1; }

if [ "$MODE" = "init" ]; then
  {
    echo "F_ROLES=$N_ROLES"; echo "F_USERS=$N_USERS"; echo "F_ADMINCLAIMS=$N_ADMINCLAIMS"
    echo "F_MIGRATIONS=$N_MIGRATIONS"; echo "F_PRODUCTS=$N_PRODUCTS"
  } > "$FLOORS"
  ( cd "$REPO_ROOT" && git status --porcelain ) | sed 's/^...//' | sort -u > "$TREE_BASE"
  echo "qh-invariants: floors recorded in $FLOORS"
  cat "$FLOORS"
  echo "qh-invariants: tree baseline ($(wc -l < "$TREE_BASE") entries) in $TREE_BASE"
  exit 0
fi

F_ROLES=$HARD_ROLES; F_USERS=$HARD_USERS; F_ADMINCLAIMS=$HARD_ADMINCLAIMS
F_MIGRATIONS=$HARD_MIGRATIONS; F_PRODUCTS=$HARD_PRODUCTS
# shellcheck disable=SC1090
[ -f "$FLOORS" ] && . "$FLOORS"
max() { [ "$1" -gt "$2" ] && echo "$1" || echo "$2"; }
F_ROLES=$(max "$F_ROLES" $HARD_ROLES);           F_USERS=$(max "$F_USERS" $HARD_USERS)
F_ADMINCLAIMS=$(max "$F_ADMINCLAIMS" $HARD_ADMINCLAIMS)
F_MIGRATIONS=$(max "$F_MIGRATIONS" $HARD_MIGRATIONS); F_PRODUCTS=$(max "$F_PRODUCTS" $HARD_PRODUCTS)

VIOL=0
chk() { # name actual floor
  if [ "$2" -lt "$3" ]; then
    printf '  VIOLATION  %-22s %s (floor %s)\n' "$1" "$2" "$3"; VIOL=$((VIOL+1))
  else
    printf '  ok         %-22s %s (floor %s)\n' "$1" "$2" "$3"
  fi
}

echo "qh-invariants: db=$DB  $(date -Is)"
chk "AspNetRoles"            "$N_ROLES"        "$F_ROLES"
chk "AspNetUsers"            "$N_USERS"        "$F_USERS"
chk "Admin role claims"      "$N_ADMINCLAIMS"  "$F_ADMINCLAIMS"
chk "__EFMigrationsHistory"  "$N_MIGRATIONS"   "$F_MIGRATIONS"

# The D03 purge+import window (W0-G tier C) is the ONE place active products may fall.
if [ "${QH_ALLOW_PRODUCT_DROP:-0}" = "1" ]; then
  printf '  waived     %-22s %s (D03 purge window)\n' "active Products" "$N_PRODUCTS"
else
  chk "active Products"      "$N_PRODUCTS"     "$F_PRODUCTS"
fi

if [ "$N_ADMINMEMBER" -ge 1 ]; then
  printf '  ok         %-22s in Admin\n' "admin@quanghuong.com"
else
  printf '  VIOLATION  %-22s NOT in Admin role\n' "admin@quanghuong.com"; VIOL=$((VIOL+1))
fi

# ---- ownership / working tree -------------------------------------------------
CHANGED="$(cd "$REPO_ROOT" && git status --porcelain | sed 's/^...//' | sort -u)"
if [ -z "$CHANGED" ]; then
  echo "  ok         working tree           clean"
else
  OUTSIDE=""
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if [ -f "$TREE_BASE" ] && grep -Fxq "$f" "$TREE_BASE"; then continue; fi
    if [ -f "$ALLOW" ]; then
      allowed=0
      while IFS= read -r g; do
        case "$g" in ''|\#*) continue ;; esac
        # shellcheck disable=SC2254
        case "$f" in $g) allowed=1; break ;; esac
      done < "$ALLOW"
      [ "$allowed" = 1 ] && continue
    fi
    OUTSIDE="$OUTSIDE$f"$'\n'
  done <<< "$CHANGED"
  if [ -n "$OUTSIDE" ]; then
    echo "  VIOLATION  files changed outside the active ownership globs:"
    printf '%s' "$OUTSIDE" | sed 's/^/               /'
    VIOL=$((VIOL+1))
  else
    echo "  ok         working tree           all changes inside ownership globs / baseline"
  fi
fi

if [ "$VIOL" -eq 0 ]; then
  echo "qh-invariants: GREEN"
  exit 0
fi
echo "qh-invariants: RED - $VIOL violation(s). Stop every track, check AuditLogs, consider R1/R3."
exit 1
