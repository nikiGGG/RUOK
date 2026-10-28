#!/usr/bin/env bash
# RUOK host-level production-runtime smoke test (WP08 / T035-T038 fallback).
#
# The Docker image cannot be built in an environment where the container's
# outbound network is blocked (no Alpine apk repos, no npm registry in-container).
# This script exercises the SAME compiled production runtime the image runs
# (`node build` + the bundled `node build/db-migrate.mjs`) directly on the host,
# proving startup, readiness/liveness, migration, a real goal write, restart and
# EXACT persistence — without Docker.
#
# Truthful-oracle semantics (WP08):
#   * Every HTTP request is bounded; readiness/liveness failures and lost or
#     drifted objectives are FATAL (nonzero).
#   * After restart we RE-LOGIN with the same account (allowed) but NEVER re-
#     create the objective. Persistence is proven by an exact id+title read of
#     the ORIGINAL objective.
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
CURL_TIMEOUT="${RUOK_SMOKE_CURL_MAX_TIME:-5}"

OBJECTIVE_TITLE="WP08 Host SQLite Persistence Objective"
USERNAME="wp08host"
PASSWORD="smokepass123"

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
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$CURL_TIMEOUT" \
      "http://127.0.0.1:${PORT}/api/ready" || true)
    if [ "$code" = "200" ]; then echo "    /api/ready -> 200"; return 0; fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "    FAIL: /api/ready never 200 within 120s" >&2
      return 1
    fi
    sleep 2
  done
}

json_field() {
  local file="$1" path="$2"
  node -e \
    "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');try{const v=${path};console.log(v??'')}catch(e){process.exit(1)}" \
    "$file"
}

# Exact re-read of a single objective by id; asserts id+title match.
exact_read_objective() {
  local id="$1" expected="$2"
  local body; body="$(mktemp)"
  local code
  code=$(curl -s -b "$COOKIE_JAR" --max-time "$CURL_TIMEOUT" -o "$body" -w '%{http_code}' \
    "http://127.0.0.1:${PORT}/api/objectives/$id" || true)
  if [ "$code" != "200" ]; then
    echo "    FAIL: exact read of objective $id -> HTTP $code (lost/unauthorized)" >&2
    rm -f "$body"
    return 1
  fi
  local rid rtitle
  rid="$(json_field "$body" 'JSON.parse(s).objective.id' 2>/dev/null || true)"
  rtitle="$(json_field "$body" 'JSON.parse(s).objective.title' 2>/dev/null || true)"
  rm -f "$body"
  if [ "$rid" != "$id" ] || [ "$rtitle" != "$expected" ]; then
    echo "    FAIL: exact read mismatch (id=$rid expected=$id, title='$rtitle' expected='$expected')" >&2
    return 1
  fi
  echo "    exact read OK id=$id title='$rtitle'"
  return 0
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
HEALTH=$(curl -s --max-time "$CURL_TIMEOUT" -w '\n%{http_code}' "http://127.0.0.1:${PORT}/api/health")
[ "$(printf '%s' "$HEALTH" | tail -n1)" = "200" ] || { echo "    FAIL health" >&2; exit 1; }
echo "    /api/health -> 200"

echo "### [host] register user + create objective"
REG_CODE=$(curl -s --max-time "$CURL_TIMEOUT" -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -o /dev/null -w '%{http_code}' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  "http://127.0.0.1:${PORT}/api/auth/register" || true)
[ "$REG_CODE" = "200" ] || { echo "    FAIL register HTTP $REG_CODE" >&2; exit 1; }

OBJ_BODY="$(mktemp)"
OBJ_CODE=$(curl -s --max-time "$CURL_TIMEOUT" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' -o "$OBJ_BODY" -w '%{http_code}' \
  -d "{\"title\":\"$OBJECTIVE_TITLE\",\"level\":\"yearly\",\"year\":2026}" \
  "http://127.0.0.1:${PORT}/api/objectives" || true)
[ "$OBJ_CODE" = "201" ] || { echo "    FAIL objective create HTTP $OBJ_CODE" >&2; rm -f "$OBJ_BODY"; exit 1; }
OBJ_ID="$(json_field "$OBJ_BODY" 'JSON.parse(s).objective.id' 2>/dev/null || true)"
rm -f "$OBJ_BODY"
[ -n "$OBJ_ID" ] || { echo "    FAIL objective create (empty id)" >&2; exit 1; }
echo "    created objective id=$OBJ_ID title='$OBJECTIVE_TITLE'"
ls -la "$DATA_DIR/okr.db" >/dev/null && echo "    DB file present at $DATA_DIR/okr.db"

echo "### [host] restarting production runtime and verifying EXACT persistence"
kill "$SERVER_PID"; wait "$SERVER_PID" 2>/dev/null || true; SERVER_PID=""
start_server
wait_ready

# Re-login with the same account after restart (allowed). We do NOT recreate the
# objective — persistence is proven by the exact id+title read below.
LOGIN_CODE=$(curl -s --max-time "$CURL_TIMEOUT" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' -o /dev/null -w '%{http_code}' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  "http://127.0.0.1:${PORT}/api/auth/login" || true)
[ "$LOGIN_CODE" = "200" ] || { echo "    FAIL re-login after restart HTTP $LOGIN_CODE" >&2; exit 1; }

exact_read_objective "$OBJ_ID" "$OBJECTIVE_TITLE"

echo "### [host] PASS"
echo "    port=$PORT data=$DATA_DIR"