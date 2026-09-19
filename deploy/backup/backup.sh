#!/usr/bin/env bash
# Postgres + media-data backup: pg_dump -Fc, tar the media volume, encrypt both with age (the
# server only ever holds the PUBLIC key — see restore-drill.sh for the one place the private key
# is used, and only when an operator passes it in), push offsite with rclone if configured, prune
# to a GFS-style local retention (48 hourly / 14 daily / 12 monthly). D05 mục 6/31, phase-64 step 3.
#
# Usage: backup.sh <hourly|nightly|manual|predeploy>
# Called by cron (see crontab: hourly 08-22h, nightly 02:30) or by `make backup` /
# `scripts/stack-up.sh` (which runs `manual`/`predeploy` right before every migrate). `manual` and
# `predeploy` are dumped but never auto-pruned by retention count — only hourly/nightly are.
set -euo pipefail

TIER="${1:-manual}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
MEDIA_DIR="${MEDIA_DIR:-/media-data}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_NAME="${POSTGRES_DB:-quanghuongdb}"
DB_USER="${POSTGRES_USER:-postgres}"
AGE_RECIPIENT="${BACKUP_AGE_PUBLIC_KEY:-}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BASE="quanghuong_backup_${TIER}_${TS}"
DUMP_FILE="${BACKUP_DIR}/${BASE}.dump"
MEDIA_FILE="${BACKUP_DIR}/quanghuong_media_${TIER}_${TS}.tar.gz"

log() { echo "[backup:${TIER}] $(date -u -Iseconds) $*"; }

mkdir -p "${BACKUP_DIR}"
log "starting, base=${BASE}"

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
export PGPASSWORD="${POSTGRES_PASSWORD}"

pg_dump -h "${DB_HOST}" -U "${DB_USER}" -Fc "${DB_NAME}" -f "${DUMP_FILE}"
dump_bytes="$(stat -c%s "${DUMP_FILE}")"
log "pg_dump done, ${dump_bytes} bytes"

has_media=false
if [ -d "${MEDIA_DIR}" ] && [ -n "$(ls -A "${MEDIA_DIR}" 2>/dev/null || true)" ]; then
  tar -czf "${MEDIA_FILE}" -C "${MEDIA_DIR}" .
  has_media=true
  log "media tar done, $(stat -c%s "${MEDIA_FILE}") bytes"
else
  log "WARNING: ${MEDIA_DIR} missing or empty, skipping media archive"
fi

cat > "${BACKUP_DIR}/${BASE}.meta.json" <<EOF
{"tier":"${TIER}","createdAt":"$(date -u -Iseconds)","database":"${DB_NAME}","dumpBytes":${dump_bytes},"hasMedia":${has_media}}
EOF

dump_ext=".dump"
media_ext=".tar.gz"
if [ -n "${AGE_RECIPIENT}" ]; then
  age -r "${AGE_RECIPIENT}" -o "${DUMP_FILE}.age" "${DUMP_FILE}" && rm -f "${DUMP_FILE}"
  DUMP_FILE="${DUMP_FILE}.age"
  if [ "${has_media}" = true ]; then
    age -r "${AGE_RECIPIENT}" -o "${MEDIA_FILE}.age" "${MEDIA_FILE}" && rm -f "${MEDIA_FILE}"
    MEDIA_FILE="${MEDIA_FILE}.age"
  fi
  dump_ext=".dump.age"
  media_ext=".tar.gz.age"
  log "encrypted with age recipient ${AGE_RECIPIENT}"
else
  log "WARNING: BACKUP_AGE_PUBLIC_KEY not set — dump left UNENCRYPTED at ${DUMP_FILE} (fine for a local-only stack, never for one pushed offsite)"
fi

# Offsite push is optional (D05: "not configured yet" is a valid state). Credentials live in a
# mounted rclone.conf, never inlined here or baked into the image.
RCLONE_CONF="${BACKUP_S3_RCLONE_CONF:-/run/secrets/rclone.conf}"
if [ -n "${BACKUP_S3_REMOTE:-}" ] && [ -f "${RCLONE_CONF}" ]; then
  rclone --config "${RCLONE_CONF}" copy "${DUMP_FILE}" "${BACKUP_S3_REMOTE}"
  [ "${has_media}" = true ] && rclone --config "${RCLONE_CONF}" copy "${MEDIA_FILE}" "${BACKUP_S3_REMOTE}"
  log "pushed to ${BACKUP_S3_REMOTE}"
else
  log "BACKUP_S3_REMOTE not configured — local-only (see docs/deployment-guide.md offsite setup)"
fi

# Monthly keep: on the first nightly of a calendar month, duplicate this run's files under the
# "monthly" tier so it survives the 14-day "nightly" prune below. Copying (not re-dumping) keeps
# this a pure file operation with nothing that can fail against the database.
if [ "${TIER}" = "nightly" ] && [ "$(date -u +%d)" = "01" ]; then
  monthly_base="quanghuong_backup_monthly_${TS}"
  cp "${DUMP_FILE}" "${BACKUP_DIR}/${monthly_base}${dump_ext}"
  cp "${BACKUP_DIR}/${BASE}.meta.json" "${BACKUP_DIR}/${monthly_base}.meta.json"
  [ "${has_media}" = true ] && cp "${MEDIA_FILE}" "${BACKUP_DIR}/quanghuong_media_monthly_${TS}${media_ext}"
  log "monthly copy: ${monthly_base}"
fi

# --- GFS-style local retention. Each tier's own files never interfere with another tier's count,
# because the tier is part of the filename (see BASE above) — no timestamp-pattern guessing. ---
prune_tier() {
  local tier="$1" keep="$2"
  # shellcheck disable=SC2012 # our filenames are a fixed timestamp format: no spaces/globs to trip `ls`
  ls -1t "${BACKUP_DIR}"/quanghuong_backup_"${tier}"_*.dump* 2>/dev/null | tail -n "+$((keep + 1))" | while IFS= read -r old; do
    local base ts_part
    base="$(basename "${old}")"
    base="${base%.dump*}"
    ts_part="${base#quanghuong_backup_"${tier}"_}"
    rm -f "${BACKUP_DIR}/${base}.dump" "${BACKUP_DIR}/${base}.dump.age" "${BACKUP_DIR}/${base}.meta.json"
    rm -f "${BACKUP_DIR}/quanghuong_media_${tier}_${ts_part}.tar.gz" "${BACKUP_DIR}/quanghuong_media_${tier}_${ts_part}.tar.gz.age"
  done || true
  # `|| true`: with `set -o pipefail`, the `ls` above exits non-zero when that tier has no files
  # yet (every new server, for its first month of `monthly`), which propagated out of this
  # function and made the WHOLE script exit 1 after a perfectly good dump — cron and `make backup`
  # both reported failure on every successful backup (W4-5 rehearsal).
}

case "${TIER}" in
  hourly) prune_tier hourly 48 ;;
  nightly) prune_tier nightly 14 ;;
esac
prune_tier monthly 12

log "done"
