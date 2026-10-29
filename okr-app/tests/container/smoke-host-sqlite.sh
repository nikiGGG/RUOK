#!/usr/bin/env bash
# RUOK host-level production-runtime smoke test (WP09 / T036 fallback).
#
# The Docker image cannot be built in an environment where the container's
# outbound network is blocked (no Alpine apk repos, no npm registry in-container).
# This script exercises the SAME compiled production runtime the image runs
# (`node build` + the bundled `node build/db-migrate.mjs`) directly on the host,
# proving startup, readiness/liveness, migration, a real goal write, restart and
# persistence — without Docker.
#
# Prereqs: `npm run build` has been run (produces build/ + build/db-migrate.mjs).
#
# Usage:
#   bash tests/container/smoke-host-sqlite.sh
# Env overrides: RUOK_SMOKE_PORT (default 3181), RUOK_SMOKE_DATA_DIR.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OKR_APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$OKR_APP_DIR"

PORT="${RUOK_SMOKE_PORT:-3181}"
DATA_DIR="${RUOK_SMOKE_DATA_DIR:-$(mktemp -d)}"
SERVER_PID=""

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

start_server() {
  PORT="$PORT" HOST=127.0.0.1 NODE_ENV=production DATABASE_PATH="$DATA_DIR/okr.db" \
    node build > "$DATA_DIR/server.log" 2>&1 &
  SERVER_PID=$!
  echo "    server pid=$SERVER_PID"
}

wait_ready() {
  local deadline=$(( $(date +%s) + 120 ))
  while :; do
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/ready" || true)
    if [ "$code" = "200" ]; then echo "    /api/ready -> 200"; return 0; fi
    if [ "$(date +%s)" -ge "$deadline" ]; then echo "    /api/ready never 200" >&2; return 1; fi
    sleep 2
  done
}

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"; cleanup' EXIT

echo "### [host] migration-only invocation (production deps) on empty DB"
DATABASE_PATH="$DATA_DIR/okr.db" node build/db-migrate.mjs
echo "    migration-only invocation exit=0"

echo "### [host] starting production runtime (node build)"
start_server
wait_ready

echo "### [host] liveness /api/health"
HEALTH=$(curl -s -w '\n%{http_code}' "http://127.0.0.1:${PORT}/api/health")
[ "$(printf '%s' "$HEALTH" | tail -n1)" = "200" ] || { echo "    FAIL health" >&2; exit 1; }
echo "    /api/health -> 200"

echo "### [host] register user + create objective"
curl -sS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"smokeuser","password":"smokepass123"}' \
  "http://127.0.0.1:${PORT}/api/auth/register" >/dev/null
OBJ_RESP=$(curl -sS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"title":"WP09 Host Smoke Objective","level":"yearly","year":2026}' \
  "http://127.0.0.1:${PORT}/api/objectives")
OBJ_ID=$(printf '%s' "$OBJ_RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).objective.id))")
echo "    created objective id=$OBJ_ID"
[ -n "$OBJ_ID" ] || { echo "    FAIL objective" >&2; exit 1; }
ls -la "$DATA_DIR/okr.db" >/dev/null && echo "    DB file present at $DATA_DIR/okr.db"

echo "### [host] restarting production runtime and verifying persistence"
kill "$SERVER_PID"; wait "$SERVER_PID" 2>/dev/null || true; SERVER_PID=""
start_server
wait_ready
LIST_RESP=$(curl -sS -b "$COOKIE_JAR" "http://127.0.0.1:${PORT}/api/objectives")
if printf '%s' "$LIST_RESP" | grep -q "$OBJ_ID"; then
  echo "    objective $OBJ_ID persisted across restart"
else
  echo "    FAIL objective NOT persisted" >&2
  exit 1
fi

echo "### [host] PASS"
echo "    port=$PORT data=$DATA_DIR"