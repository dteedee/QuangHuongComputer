#!/usr/bin/env bash
# Monthly restore drill (D05 mục 7/41, phase-64 step 3): decrypt the newest dump, restore it into
# a throwaway database, assert it actually contains a shop (tables exist, orders exist, the data
# is not stale), emit PASS/FAIL + a heartbeat file an external uptime check can read.
#
# The private age key is NEVER stored on the server — it must be passed in for this one run only
# (BACKUP_AGE_PRIVATE_KEY env var), e.g. `make restore-drill AGE_PRIVATE_KEY=$(cat offsite.key)`.
# If it is not passed, the drill fails loudly rather than silently skipping the decrypt check.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
RESTORE_DB="${RESTORE_DB:-qh_restore_test}"
HEARTBEAT_FILE="${HEARTBEAT_FILE:-${BACKUP_DIR}/restore-drill.heartbeat.json}"
MAX_AGE_HOURS=26

heartbeat() {
  printf '{"status":"%s","at":"%s","detail":%s}\n' "$1" "$(date -u -Iseconds)" "$2" > "${HEARTBEAT_FILE}"
}

fail() {
  local msg="$1"
  echo "RESTORE-DRILL FAIL: ${msg}" >&2
  heartbeat "FAIL" "\"$(printf '%s' "${msg}" | sed 's/"/\\"/g')\""
  exit 1
}

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
export PGPASSWORD="${POSTGRES_PASSWORD}"

# shellcheck disable=SC2012 # our filenames are a fixed timestamp format: no spaces/globs to trip `ls`
newest="$(ls -1t "${BACKUP_DIR}"/quanghuong_backup_*.dump* 2>/dev/null | head -n1 || true)"
[ -n "${newest}" ] || fail "no dump found under ${BACKUP_DIR}"

plain="/tmp/restore-drill-$$.dump"
case "${newest}" in
  *.age)
    [ -n "${BACKUP_AGE_PRIVATE_KEY:-}" ] || fail "${newest} is encrypted but BACKUP_AGE_PRIVATE_KEY was not provided for this run"
    keyfile="$(mktemp)"
    printf '%s\n' "${BACKUP_AGE_PRIVATE_KEY}" > "${keyfile}"
    age -d -i "${keyfile}" -o "${plain}" "${newest}" || { rm -f "${keyfile}"; fail "age decrypt failed for ${newest}"; }
    rm -f "${keyfile}"
    ;;
  *)
    cp "${newest}" "${plain}"
    ;;
esac

dropdb -h "${DB_HOST}" -U "${DB_USER}" --if-exists "${RESTORE_DB}"
createdb -h "${DB_HOST}" -U "${DB_USER}" "${RESTORE_DB}"
if ! pg_restore -h "${DB_HOST}" -U "${DB_USER}" -d "${RESTORE_DB}" --no-owner --no-acl "${plain}"; then
  rm -f "${plain}"
  fail "pg_restore failed for ${newest}"
fi
rm -f "${plain}"

table_count="$(psql -h "${DB_HOST}" -U "${DB_USER}" -d "${RESTORE_DB}" -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")"
[ "${table_count}" -gt 0 ] || fail "0 tables after restore — dump is empty or restore silently failed"

# The shop itself must be in the dump, not just an empty schema: products are seeded on day one
# and only grow, so 0 products means the dump does not contain a usable shop.
product_count="$(psql -h "${DB_HOST}" -U "${DB_USER}" -d "${RESTORE_DB}" -Atc 'SELECT count(*) FROM public."Products"')"
[ "${product_count}" -gt 0 ] || fail "0 rows in public.\"Products\" — a restore that proves nothing about real data is not a passing drill"

# Orders are NOT a pass condition. A new shop has none, and a shop that simply sold nothing
# yesterday has no new ones — neither is a backup problem, and failing on it trains the owner to
# ignore the alert. Reported, not asserted.
order_count="$(psql -h "${DB_HOST}" -U "${DB_USER}" -d "${RESTORE_DB}" -Atc 'SELECT count(*) FROM public."Orders"')"

# Staleness is a property of the BACKUP FILE, not of shop activity (the old check read
# max("Orders"."CreatedAt"), so a quiet weekend failed the drill while a stale dump with one old
# order passed it — W4-5 rehearsal).
dump_age_hours="$(( ( $(date -u +%s) - $(stat -c %Y "${newest}") ) / 3600 ))"
[ "${dump_age_hours}" -lt "${MAX_AGE_HOURS}" ] || fail "newest dump $(basename "${newest}") is ${dump_age_hours}h old (>= ${MAX_AGE_HOURS}h) — backups have stopped running"

dropdb -h "${DB_HOST}" -U "${DB_USER}" "${RESTORE_DB}"

detail="{\"file\":\"$(basename "${newest}")\",\"tables\":${table_count},\"products\":${product_count},\"orders\":${order_count},\"dumpAgeHours\":${dump_age_hours}}"
heartbeat "PASS" "${detail}"
echo "RESTORE-DRILL PASS: file=$(basename "${newest}") tables=${table_count} products=${product_count} orders=${order_count} dumpAgeHours=${dump_age_hours}"
