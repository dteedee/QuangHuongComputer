#!/usr/bin/env bash
# qh-build.sh - the ONLY sanctioned way for an agent to compile / typecheck / test
# during the full-system overhaul (decision D12).
#
# Why it exists: 5 parallel tracks on one 23GB box will happily start 5 MSBuild
# graphs at once and OOM the owner's live API. This wrapper serialises every
# build behind one flock, caps MSBuild to a single node, refuses to start when
# free RAM is low, and keeps output out of the tree that :5000 is running from.
#
# Usage (ALWAYS call by absolute path, never as `cd <dir>; <cmd>`):
#   scripts/qh-build.sh be       <path/to/Module.csproj> [extra dotnet args]
#   scripts/qh-build.sh be-test  <filter>                [extra dotnet args]
#   scripts/qh-build.sh fe-tsc
#   scripts/qh-build.sh fe-lint  [paths...]
#   scripts/qh-build.sh fe-test  [pattern...]
#   scripts/qh-build.sh status
#
# Refused for everyone: the solution and ApiGateway.csproj (gate / qh-test-env.sh
# only - see QH_ROLE below). Exit 75 = could not take the lock in time: report it,
# never bypass the lock, never raise the timeout (the agent Bash tool caps at 600s;
# run long jobs in the background and poll the log instead).
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QH_SCRATCH="${QH_SCRATCH:-/tmp/qh-scratch}"
DOTNET_LOCK="${QH_DOTNET_LOCK:-/tmp/qh-dotnet.lock}"
NODE_LOCK="${QH_NODE_LOCK:-/tmp/qh-node.lock}"
LOCK_WAIT=540           # MUST stay <= 540: the agent Bash tool times out at 600s
MIN_AVAIL_KB=2560000    # 2.5 GB

export MSBUILDDISABLENODEREUSE=1
export DOTNET_CLI_TELEMETRY_OPTOUT=1

die() { echo "qh-build: $*" >&2; exit 2; }

check_ram() {
  local avail
  avail="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
  if [ -z "$avail" ]; then
    echo "qh-build: WARNING cannot read MemAvailable, continuing" >&2
    return 0
  fi
  if [ "$avail" -lt "$MIN_AVAIL_KB" ]; then
    echo "qh-build: REFUSED - only $((avail / 1024)) MB available, need $((MIN_AVAIL_KB / 1024)) MB." >&2
    echo "qh-build: another track is probably mid-build. Wait and retry; do NOT lower the floor," >&2
    echo "qh-build: do NOT kill anything (the owner's API :5000 and 20+ foreign containers live here)." >&2
    exit 3
  fi
}

# Anything that would touch the binaries the owner's :5000 is running from, or that
# would fan out a full solution graph, is orchestrator/gate territory.
guard_target() {
  local target="$1"
  case "$target" in
    *.sln|*.slnx)
      [ "${QH_ROLE:-}" = "gate" ] || [ "${QH_ROLE:-}" = "orchestrator" ] \
        || die "REFUSED: solution builds are gate-only. Build your own module .csproj." ;;
    *ApiGateway.csproj)
      [ "${QH_ROLE:-}" = "gate" ] || [ "${QH_ROLE:-}" = "orchestrator" ] \
        || die "REFUSED: ApiGateway.csproj is built only by the gate / scripts/qh-test-env.sh." ;;
  esac
}

run_locked() { # <lockfile> <cmd...>
  local lock="$1"; shift
  local started; started="$(date +%s)"
  # -o (--close) is REQUIRED: without it the Roslyn compiler server (VBCSCompiler)
  # inherits the lock file descriptor, outlives the build and keeps every other
  # track locked out until its idle timeout. Reproduced on 2026-09-18.
  flock -o -w "$LOCK_WAIT" -E 75 "$lock" "$@"
  local rc=$?
  if [ "$rc" -eq 75 ]; then
    echo "qh-build: LOCK TIMEOUT after ${LOCK_WAIT}s on $lock - another track is building." >&2
    echo "qh-build: report 'blocked: build lock' and retry later. Never remove the lock file." >&2
  fi
  echo "qh-build: exit=$rc elapsed=$(( $(date +%s) - started ))s" >&2
  return $rc
}

cmd="${1:-}"; shift || true

case "$cmd" in
  be)
    target="${1:-}"; [ -n "$target" ] || die "usage: qh-build.sh be <Module.csproj> [extra args]"
    shift
    guard_target "$target"
    [ -f "$target" ] || target="$REPO_ROOT/$target"
    [ -f "$target" ] || die "not found: $target"
    check_ram
    run_locked "$DOTNET_LOCK" dotnet build "$target" -m:1 \
      --artifacts-path "$QH_SCRATCH/be-artifacts" "$@"
    ;;

  be-test)
    filter="${1:-}"; shift || true
    check_ram
    if [ -n "$filter" ]; then
      run_locked "$DOTNET_LOCK" dotnet test "$REPO_ROOT/backend/Tests/UnitTests/UnitTests.csproj" \
        -m:1 --artifacts-path "$QH_SCRATCH/ut-artifacts" --filter "$filter" "$@"
    else
      run_locked "$DOTNET_LOCK" dotnet test "$REPO_ROOT/backend/Tests/UnitTests/UnitTests.csproj" \
        -m:1 --artifacts-path "$QH_SCRATCH/ut-artifacts" "$@"
    fi
    ;;

  fe-tsc)
    check_ram
    run_locked "$NODE_LOCK" bash -c \
      "cd '$REPO_ROOT/frontend' && npx --no-install tsc --noEmit -p tsconfig.app.json"
    ;;

  fe-lint)
    check_ram
    local_paths="${*:-.}"
    run_locked "$NODE_LOCK" bash -c \
      "cd '$REPO_ROOT/frontend' && npx --no-install eslint $local_paths --ext ts,tsx"
    ;;

  fe-test)
    check_ram
    local_pattern="${*:-}"
    run_locked "$NODE_LOCK" bash -c \
      "cd '$REPO_ROOT/frontend' && npx --no-install vitest run $local_pattern"
    ;;

  status)
    echo "repo       : $REPO_ROOT"
    echo "scratch    : $QH_SCRATCH"
    echo "dotnet     : $(dotnet --version 2>/dev/null)"
    echo "MemAvail   : $(( $(awk '/^MemAvailable:/ {print $2}' /proc/meminfo) / 1024 )) MB (floor $((MIN_AVAIL_KB/1024)) MB)"
    for l in "$DOTNET_LOCK" "$NODE_LOCK"; do
      if flock -n -E 9 "$l" true 2>/dev/null; then echo "lock       : $l free"; else echo "lock       : $l HELD"; fi
    done
    ;;

  ""|help|-h|--help)
    sed -n '2,25p' "${BASH_SOURCE[0]}"
    ;;

  *)
    die "unknown sub-command '$cmd' (be | be-test | fe-tsc | fe-lint | fe-test | status)"
    ;;
esac
