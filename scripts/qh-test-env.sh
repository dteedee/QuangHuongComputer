#!/usr/bin/env bash
# qh-test-env.sh - the isolated TEST stack (decision D12).
#
# ORCHESTRATOR ONLY. Tracks never call reset/up/down; they may call `status`.
#
#   scripts/qh-test-env.sh reset [--from-dev|--from-dump <file>|--fresh]
#   scripts/qh-test-env.sh up
#   scripts/qh-test-env.sh down
#   scripts/qh-test-env.sh status
#   scripts/qh-test-env.sh asserts        # the five isolation asserts, fail-closed
#
# What is isolated, and how:
#   DB        quanghuongdb_test        (same container; any name not ending _test is refused)
#   API       :5050 from $QH_SCRATCH/test-artifacts   (never ApiGateway/bin, which :5000 runs)
#   RabbitMQ  vhost qh-test            (vhost / is the owner's and is never touched)
#   Redis     defaultDatabase=1, prefix qh-test:      (dev is db 0, prefix quanghc:)
#   JWT       a key generated per reset -> a TEST token is worthless on :5000 (401)
#   Webroot   $QH_SCRATCH/test-wwwroot (never ApiGateway/wwwroot)
#   SMTP      MailHog localhost:1025   (the real Gmail host is never contacted)
#
# No secret is stored in this script: the dev connection string is read at run time
# with jq from appsettings.Development.json, and the TEST JWT key is generated into
# $QH_SCRATCH (mode 600) at reset.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QH_SCRATCH="${QH_SCRATCH:-/tmp/qh-scratch}"
APPSETTINGS="$REPO_ROOT/backend/ApiGateway/appsettings.Development.json"
API_DIR="$REPO_ROOT/backend/ApiGateway"
ARTIFACTS="$QH_SCRATCH/test-artifacts"
WEBROOT="$QH_SCRATCH/test-wwwroot"
LOG="$QH_SCRATCH/test-api.log"
PIDFILE="$QH_SCRATCH/test-api.pid"
JWTFILE="$QH_SCRATCH/test-jwt.key"
RMQ_BASE="$QH_SCRATCH/rmq-baseline.txt"
MARKER="qh-test-marker.txt"

TEST_DB="quanghuongdb_test"
DEV_DB="quanghuongdb"
TEST_VHOST="qh-test"
TEST_REDIS_DB=1
TEST_PORT=5050
DEV_PORT=5000
APPNAME="qh-test-api"
PG_C="${QH_PG_CONTAINER:-quanghuong-postgres}"
RMQ_C="${QH_RMQ_CONTAINER:-quanghuong-rabbitmq}"
REDIS_C="${QH_REDIS_CONTAINER:-quanghuong-redis}"
DOTNET_LOCK="${QH_DOTNET_LOCK:-/tmp/qh-dotnet.lock}"

export MSBUILDDISABLENODEREUSE=1 DOTNET_CLI_TELEMETRY_OPTOUT=1

die() { echo "qh-test-env: $*" >&2; exit 2; }
say() { echo "qh-test-env: $*"; }

# ---------------------------------------------------------------- config reads
dev_conn()   { jq -r '.ConnectionStrings.DefaultConnection' "$APPSETTINGS"; }
dev_redis()  { jq -r '.Redis.ConnectionString' "$APPSETTINGS"; }
redis_pass() { dev_redis | sed -nE 's/.*[,;] *password=([^,;]*).*/\1/Ip'; }

test_conn() {
  local c; c="$(dev_conn)"
  printf '%s' "$c" | grep -qi "Database=$DEV_DB" || die "unexpected dev connection string shape"
  c="$(printf '%s' "$c" | sed "s/Database=$DEV_DB/Database=$TEST_DB/I")"
  printf '%s;Application Name=%s' "${c%;}" "$APPNAME"
}
test_redis() { printf '%s,defaultDatabase=%s' "$(dev_redis)" "$TEST_REDIS_DB"; }

guard_names() {
  case "$TEST_DB" in *_test) ;; *) die "refusing: TEST database name must end in _test" ;; esac
  [ "$TEST_REDIS_DB" -ge 1 ] || die "refusing: TEST Redis database must not be 0 (that is dev)"
  [ "$TEST_VHOST" != "/" ] || die "refusing: TEST vhost must not be /"
}

pgx() { docker exec "$PG_C" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c "$1"; }
pgt() { docker exec "$PG_C" psql -U postgres -d "$TEST_DB" -t -A -c "$1"; }
pgd() { docker exec -e PGOPTIONS='-c default_transaction_read_only=on' "$PG_C" \
          psql -U postgres -d "$DEV_DB" -t -A -c "$1"; }

# ---------------------------------------------------------------------- mailhog
ensure_mailhog() {
  if docker ps --format '{{.Names}}' | grep -qx 'quanghuong-mailhog'; then say "mailhog already up"; return 0; fi
  say "starting mailhog (the ONLY container this tooling may create)"
  local before after
  before="$(docker ps -q | sort)"
  docker compose -f "$REPO_ROOT/docker-compose.test.yml" up -d mailhog >/dev/null 2>&1 \
    || { echo "qh-test-env: WARNING mailhog did not start; assert 5 will fail" >&2; return 1; }
  after="$(docker ps -q | sort)"
  local added; added="$(comm -13 <(echo "$before") <(echo "$after") | wc -l)"
  if [ "$added" -gt 1 ]; then
    echo "qh-test-env: ABORT - 'docker compose up -d mailhog' started $added containers, not 1." >&2
    return 1
  fi
  for _ in $(seq 1 30); do
    curl -sf -o /dev/null http://localhost:8025/api/v2/messages && { say "mailhog ready"; return 0; }
    sleep 1
  done
  echo "qh-test-env: WARNING mailhog did not answer on :8025" >&2; return 1
}

# ------------------------------------------------------------------------ reset
do_reset() {
  guard_names
  local mode="${1:---from-dev}" dumpfile="${2:-}"
  mkdir -p "$QH_SCRATCH" "$ARTIFACTS" "$WEBROOT"
  do_down || true

  say "dropping + recreating $TEST_DB"
  pgx "DROP DATABASE IF EXISTS \"$TEST_DB\" WITH (FORCE);" || die "cannot drop $TEST_DB"
  pgx "CREATE DATABASE \"$TEST_DB\";" || die "cannot create $TEST_DB"

  case "$mode" in
    --fresh)
      say "fresh: empty DB, migrations + seeder will build it on first up" ;;
    --from-dump)
      [ -f "$dumpfile" ] || die "--from-dump needs an existing file"
      say "restoring from $dumpfile"
      docker exec -i "$PG_C" pg_restore -U postgres -d "$TEST_DB" --no-owner --no-acl \
        < "$dumpfile" > "$QH_SCRATCH/restore.log" 2>&1
      grep -c '^pg_restore: error' "$QH_SCRATCH/restore.log" | sed 's/^/qh-test-env: pg_restore errors: /' ;;
    --from-dev|"")
      # pg_dump|pg_restore, NOT `CREATE DATABASE ... TEMPLATE` (that fails while the
      # owner's API holds a connection). Every clone is also a backup-restore proof.
      say "cloning $DEV_DB -> $TEST_DB (pg_dump -Fc | pg_restore)"
      docker exec "$PG_C" pg_dump -U postgres -Fc "$DEV_DB" > "$QH_SCRATCH/dev-clone.dump" \
        || die "pg_dump of $DEV_DB failed"
      docker exec -i "$PG_C" pg_restore -U postgres -d "$TEST_DB" --no-owner --no-acl \
        < "$QH_SCRATCH/dev-clone.dump" > "$QH_SCRATCH/restore.log" 2>&1
      say "pg_restore errors: $(grep -c '^pg_restore: error' "$QH_SCRATCH/restore.log")" ;;
    *) die "unknown reset mode '$mode'" ;;
  esac

  say "rabbitmq: vhost $TEST_VHOST"
  docker exec "$RMQ_C" rabbitmqctl add_vhost "$TEST_VHOST" >/dev/null 2>&1
  docker exec "$RMQ_C" rabbitmqctl set_permissions -p "$TEST_VHOST" guest '.*' '.*' '.*' >/dev/null \
    || die "cannot set permissions on vhost $TEST_VHOST"

  say "redis: FLUSHDB on database $TEST_REDIS_DB (dev is database 0, untouched)"
  docker exec "$REDIS_C" redis-cli -a "$(redis_pass)" -n "$TEST_REDIS_DB" FLUSHDB >/dev/null 2>&1 \
    || echo "qh-test-env: WARNING redis FLUSHDB failed" >&2

  say "webroot: $WEBROOT"
  mkdir -p "$WEBROOT/uploads/products"
  [ -d "$API_DIR/wwwroot/uploads/products" ] && cp -a "$API_DIR/wwwroot/uploads/products/." "$WEBROOT/uploads/products/" 2>/dev/null
  printf 'qh-test webroot marker %s\n' "$(date -Is)" > "$WEBROOT/$MARKER"

  say "jwt: generating a TEST-only signing key"
  head -c 48 /dev/urandom | base64 -w0 > "$JWTFILE"
  chmod 600 "$JWTFILE"

  ensure_mailhog || true
  say "reset done"
}

# --------------------------------------------------------------------- build/up
build_api() {
  local avail; avail="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
  [ "$avail" -ge 2560000 ] || die "only $((avail/1024)) MB available; need 2500 MB to build"
  say "building ApiGateway into $ARTIFACTS (under the shared build lock)"
  # -o (--close) is REQUIRED: without it the Roslyn compiler server (VBCSCompiler)
  # inherits the lock file descriptor, outlives the build and holds the lock for
  # everyone else until its idle timeout. Reproduced on 2026-09-18.
  flock -o -w 540 -E 75 "$DOTNET_LOCK" \
    dotnet build "$API_DIR/ApiGateway.csproj" -m:1 --artifacts-path "$ARTIFACTS" \
    > "$QH_SCRATCH/test-build.log" 2>&1
  local rc=$?
  [ "$rc" -eq 75 ] && die "build lock timeout - another track is building"
  if [ "$rc" -ne 0 ]; then tail -30 "$QH_SCRATCH/test-build.log" >&2; die "build failed (rc=$rc)"; fi
  tail -3 "$QH_SCRATCH/test-build.log"
}

find_dll() {
  local dll
  dll="$(find "$ARTIFACTS/bin/ApiGateway" -maxdepth 2 -name ApiGateway.dll 2>/dev/null | head -1)"
  [ -n "$dll" ] || dll="$(find "$ARTIFACTS" -name ApiGateway.dll 2>/dev/null | head -1)"
  printf '%s' "$dll"
}

do_up() {
  guard_names
  mkdir -p "$QH_SCRATCH"
  [ -f "$JWTFILE" ] || die "no TEST jwt key - run 'reset' first"
  if port_busy "$TEST_PORT"; then say ":$TEST_PORT already listening; run 'down' first"; return 0; fi
  build_api
  local dll; dll="$(find_dll)"
  [ -n "$dll" ] || die "ApiGateway.dll not found under $ARTIFACTS - --artifacts-path may have been ignored"
  say "dll: $dll"

  # Baseline of the owner's vhost / BEFORE we start, so assert (2) can prove we
  # did not steal a consumer there. NOTE: `rabbitmqctl list_connections` ignores
  # -p and still prints a header even with -q; assert (2) parses accordingly.
  docker exec "$RMQ_C" rabbitmqctl list_queues -q -p / name consumers 2>/dev/null | sort > "$RMQ_BASE"
  date +%s%3N > "$QH_SCRATCH/test-api.start_ms"

  local conn redis jwt
  conn="$(test_conn)"; redis="$(test_redis)"; jwt="$(cat "$JWTFILE")"

  local -a args=(
    --urls "http://localhost:$TEST_PORT"
    --environment Development
    --ConnectionStrings:DefaultConnection="$conn"
    --ConnectionStrings:RabbitMQ="amqp://guest:guest@localhost:5672/$TEST_VHOST"
    --ConnectionStrings:Redis="$redis"
    --RabbitMQ:VirtualHost="$TEST_VHOST"
    --Redis:ConnectionString="$redis"
    --Redis:InstanceName="qh-test:"
    --Jwt:Key="$jwt"
    --webroot "$WEBROOT"
    --Email:Smtp:Host=localhost --Email:Smtp:Port=1025 --Email:Smtp:EnableSsl=false
    --Email:SmtpHost=localhost --Email:SmtpPort=1025 --Email:SmtpEnableSsl=false
    --Email:Smtp:Username=qh-test --Email:Smtp:Password=qh-test
    --Email:SmtpUsername=qh-test --Email:SmtpPassword=qh-test
    --RateLimiting:PermitLimit=100000
    --Cors:AllowedOrigins:0=http://localhost:5175
  )

  say "starting TEST API on :$TEST_PORT (log: $LOG)"
  : > "$LOG"
  # `setsid --fork` is REQUIRED. Without --fork setsid execs in place, the server
  # stays a child of this script, and the script blocks in wait4 forever - which
  # also keeps the agent's pipe open so `qh-test-env.sh up | tail` never returns.
  ( cd "$API_DIR" && setsid --fork dotnet "$dll" "${args[@]}" \
      >> "$LOG" 2>&1 < /dev/null & )

  local i
  for i in $(seq 1 120); do
    if curl -sf -o /dev/null "http://localhost:$TEST_PORT/health/live"; then
      # setsid forks, so $! is not the server. Record the pid that actually listens.
      pid_on_port "$TEST_PORT" > "$PIDFILE"
      say "TEST API healthy after ${i}s (pid $(cat "$PIDFILE"))"; return 0
    fi
    sleep 1
  done
  echo "qh-test-env: TEST API did not become healthy in 120s. Last log lines:" >&2
  tail -30 "$LOG" >&2
  do_down
  return 1
}

port_busy() { ss -ltn "sport = :$1" 2>/dev/null | grep -q ":$1"; }

pid_on_port() { ss -ltnp "sport = :$1" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1; }

do_down() {
  # Never pkill / killall: this box runs 20+ containers and the owner's :5000.
  local pid=""
  [ -f "$PIDFILE" ] && pid="$(cat "$PIDFILE")"
  local lpid; lpid="$(pid_on_port "$TEST_PORT")"
  if [ -n "$lpid" ] && [ "$lpid" != "$pid" ]; then pid="$lpid"; fi
  if [ -z "$pid" ]; then say "nothing listening on :$TEST_PORT"; rm -f "$PIDFILE"; return 0; fi
  if ! ps -p "$pid" >/dev/null 2>&1; then rm -f "$PIDFILE"; say "stale pid $pid"; return 0; fi
  # Refuse to touch the owner's API under any circumstance.
  if [ "$pid" = "$(pid_on_port "$DEV_PORT")" ]; then die "REFUSING: pid $pid is the owner's :$DEV_PORT"; fi
  say "stopping TEST API pid $pid"
  kill -TERM "$pid" 2>/dev/null
  local i
  for i in $(seq 1 30); do ps -p "$pid" >/dev/null 2>&1 || break; sleep 1; done
  ps -p "$pid" >/dev/null 2>&1 && { say "pid $pid still alive, SIGKILL"; kill -KILL "$pid" 2>/dev/null; }
  rm -f "$PIDFILE"
  say "down"
}

# ------------------------------------------------------------- test credentials
# A throwaway account created on TEST only. Never a seeded user, never dev.
T_EMAIL="t-w00-admin@example.com"
T_PASS='Tw00-Bootstrap!9'

test_token() {
  local body tok
  curl -sS -X POST "http://localhost:$TEST_PORT/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$T_EMAIL\",\"password\":\"$T_PASS\",\"fullName\":\"W0-0 bootstrap probe\"}" >/dev/null 2>&1
  # grant Admin on the TEST database only (needed for the mail endpoint)
  pgt "insert into \"AspNetUserRoles\" (\"UserId\",\"RoleId\")
       select u.\"Id\", r.\"Id\" from \"AspNetUsers\" u, \"AspNetRoles\" r
       where u.\"Email\"='$T_EMAIL' and r.\"Name\"='Admin'
       on conflict do nothing;" >/dev/null 2>&1
  body="$(curl -sS -X POST "http://localhost:$TEST_PORT/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$T_EMAIL\",\"password\":\"$T_PASS\"}")"
  tok="$(printf '%s' "$body" | jq -r '.token // .Token // empty')"
  printf '%s' "$tok"
}

# ------------------------------------------------------------------- 5 asserts
A_FAIL=0
a_ok()   { printf 'ASSERT %s  PASS  %s\n' "$1" "$2"; }
a_bad()  { printf 'ASSERT %s  FAIL  %s\n' "$1" "$2"; A_FAIL=$((A_FAIL+1)); }

assert_1_db() {
  local tot on_test
  tot="$(pgd "select count(*) from pg_stat_activity where application_name='$APPNAME';")"
  on_test="$(pgd "select count(*) from pg_stat_activity where application_name='$APPNAME' and datname='$TEST_DB';")"
  if [ "${tot:-0}" -ge 1 ] && [ "$tot" = "$on_test" ]; then
    a_ok 1 "pg_stat_activity: $tot connection(s) named $APPNAME, all on $TEST_DB"
  else
    a_bad 1 "pg_stat_activity: $tot named $APPNAME, only $on_test on $TEST_DB (need >=1 and all)"
  fi
}

assert_2_rabbit() {
  # `list_connections` ignores -p and prints a header even with -q, so filter by
  # the vhost column instead. A TEST connection on the owner's vhost / is
  # identified by connected_at >= the moment we started the TEST API.
  local rows n_test n_dev_new now diff start_ms
  rows="$(docker exec "$RMQ_C" rabbitmqctl list_connections -q vhost connected_at 2>/dev/null | grep -v '^vhost')"
  start_ms="$(cat "$QH_SCRATCH/test-api.start_ms" 2>/dev/null)"; start_ms="${start_ms:-0}"
  n_test="$(printf '%s\n' "$rows" | awk '$1=="'"$TEST_VHOST"'"' | wc -l)"
  n_dev_new="$(printf '%s\n' "$rows" | awk -v s="$start_ms" '$1=="/" && $2+0 >= s' | wc -l)"
  now="$(docker exec "$RMQ_C" rabbitmqctl list_queues -q -p / name consumers 2>/dev/null | sort)"
  if [ ! -s "$RMQ_BASE" ]; then
    echo "$now" > "$RMQ_BASE"
    echo "qh-test-env: NOTE no pre-start vhost / baseline existed; captured one now" >&2
  fi
  diff="$(diff "$RMQ_BASE" <(echo "$now") | head -20)"
  if [ "$n_test" -lt 1 ]; then
    a_bad 2 "no connection on vhost $TEST_VHOST (connections: $(printf '%s' "$rows" | tr '\n' ' '))"
  elif [ "$n_dev_new" -ne 0 ]; then
    a_bad 2 "$n_dev_new connection(s) opened on the owner's vhost / since the TEST API started"
  elif [ -n "$diff" ]; then
    a_bad 2 "consumer counts on vhost / changed since baseline: $(printf '%s' "$diff" | tr '\n' ' ')"
  else
    a_ok 2 "vhost $TEST_VHOST: $n_test conn; vhost /: 0 new conns since TEST start, $(echo "$now" | grep -vc '^name') queues with consumer counts identical to baseline"
  fi
}

assert_3_jwt() {
  local tok code
  tok="${QH_TEST_TOKEN:-}"
  [ -n "$tok" ] || tok="$(test_token)"
  if [ -z "$tok" ]; then a_bad 3 "could not mint a token on :$TEST_PORT"; return; fi
  local code50 code00
  code50="$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $tok" "http://localhost:$TEST_PORT/api/auth/me")"
  code00="$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $tok" "http://localhost:$DEV_PORT/api/auth/me")"
  if [ "$code00" = "401" ]; then
    a_ok 3 "TEST token: GET /api/auth/me on :$TEST_PORT=$code50, on :$DEV_PORT=$code00 (cross-use rejected)"
  else
    a_bad 3 "TEST token accepted on :$DEV_PORT (got $code00, expected 401) - the JWT keys are NOT separate"
  fi
}

assert_4_webroot() {
  local code body
  code="$(curl -sS -o /dev/null -w '%{http_code}' "http://localhost:$TEST_PORT/$MARKER")"
  local devcode
  devcode="$(curl -sS -o /dev/null -w '%{http_code}' "http://localhost:$DEV_PORT/$MARKER")"
  if [ "$code" = "200" ] && [ "$devcode" != "200" ]; then
    a_ok 4 "GET /$MARKER -> :$TEST_PORT=$code (served from $WEBROOT), :$DEV_PORT=$devcode"
  else
    a_bad 4 "GET /$MARKER -> :$TEST_PORT=$code, :$DEV_PORT=$devcode (want 200 on TEST, not 200 on dev)"
  fi
}

assert_5_smtp() {
  local tok subject code hits gmail
  tok="${QH_TEST_TOKEN:-}"
  [ -n "$tok" ] || tok="$(test_token)"
  subject="qh-test-smoke-$(date +%s)"
  code="$(curl -sS -o "$QH_SCRATCH/mail-post.json" -w '%{http_code}' -X POST \
    "http://localhost:$TEST_PORT/api/communication/send-email" \
    -H 'Content-Type: application/json' -H "Authorization: Bearer $tok" \
    -d "{\"to\":\"t-smoke@example.com\",\"subject\":\"$subject\",\"body\":\"w0-0 isolation assert\"}")"
  sleep 2
  hits="$(curl -sS "http://localhost:8025/api/v2/messages" | jq --arg s "$subject" \
    '[.items[]? | select((.Content.Headers.Subject // [])|join("")|contains($s))] | length' 2>/dev/null)"
  gmail="$(grep -c "smtp.gmail.com" "$LOG" 2>/dev/null)"; gmail="${gmail:-0}"
  if [ "${hits:-0}" -ge 1 ] && [ "$gmail" = "0" ]; then
    a_ok 5 "send-email HTTP $code; MailHog holds $hits message(s) '$subject'; grep -c smtp.gmail.com test-api.log = $gmail"
  else
    a_bad 5 "send-email HTTP $code; MailHog matches=$hits; grep -c smtp.gmail.com test-api.log = $gmail; body=$(head -c 200 "$QH_SCRATCH/mail-post.json")"
  fi
}

do_asserts() {
  A_FAIL=0
  export QH_TEST_TOKEN="${QH_TEST_TOKEN:-$(test_token)}"
  assert_1_db; assert_2_rabbit; assert_3_jwt; assert_4_webroot; assert_5_smtp
  if [ "$A_FAIL" -ne 0 ]; then
    echo "qh-test-env: $A_FAIL assert(s) FAILED - fail-closed: killing :$TEST_PORT"
    do_down
    return 1
  fi
  echo "qh-test-env: all 5 isolation asserts PASS"
  return 0
}

do_status() {
  echo "scratch    : $QH_SCRATCH"
  echo "artifacts  : $ARTIFACTS"
  echo "webroot    : $WEBROOT"
  echo "test db    : $TEST_DB $(docker exec "$PG_C" psql -U postgres -t -A -c "select pg_size_pretty(pg_database_size('$TEST_DB'))" 2>/dev/null || echo '(absent)')"
  echo "vhosts     : $(docker exec "$RMQ_C" rabbitmqctl list_vhosts -q 2>/dev/null | tr '\n' ' ')"
  echo "mailhog    : $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8025/api/v2/messages)"
  if port_busy "$TEST_PORT"; then
    echo "api :$TEST_PORT : UP (pid $(pid_on_port "$TEST_PORT")) health=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$TEST_PORT/health/live")"
  else
    echo "api :$TEST_PORT : DOWN"
  fi
  if port_busy "$DEV_PORT"; then echo "api :$DEV_PORT : UP (owner's - GET only)"; else echo "api :$DEV_PORT : DOWN"; fi
  if port_busy "$TEST_PORT"; then echo "--- asserts ---"; do_asserts; fi
}

case "${1:-}" in
  reset)   shift; do_reset "$@" ;;
  up)      do_up ;;
  down)    do_down ;;
  status)  do_status ;;
  asserts) do_asserts ;;
  *)       sed -n '2,28p' "${BASH_SOURCE[0]}"; exit 2 ;;
esac
