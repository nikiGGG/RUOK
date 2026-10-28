#!/usr/bin/env bash
# Shared helpers for RUOK container smoke tests (WP08 / T035-T038).
#
# These scripts build the production image from a CLEAN build context and run it
# the way a real deployment would. They record the exact docker commands and
# exit codes so the result is auditable.
#
# Truthful-oracle guarantees (WP08):
#   * Every HTTP request is BOUNDED (connect + max time) so a hung probe cannot
#     spin forever or be mistaken for success.
#   * HTTP status and JSON parse results are CHECKED, not assumed. A missing
#     objective, an empty id, a non-200 status or a readiness timeout is FATAL
#     with a clear, redacted diagnostic — never a warning followed by PASS.
#   * The exact write->restart->read journey re-reads the objective BY ID and
#     asserts both id AND title match, so a lost write or a partial restore is
#     detected instead of a grep-only existence heuristic.
#   * No password, session cookie jar or credential-bearing URL is ever printed.
set -uo pipefail

# Directory of the okr-app package (two levels up from tests/container/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OKR_APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Image name/tag used for the smoke build.
IMAGE_NAME="${RUOK_SMOKE_IMAGE:-ruok:smoke}"

# Local port the container is published on (default 3180).
SMOKE_PORT="${RUOK_SMOKE_PORT:-3180}"

# How long (seconds) to wait for readiness before giving up (FATAL).
READY_TIMEOUT="${RUOK_SMOKE_READY_TIMEOUT:-120}"

# Per-request curl bounds so probes never hang the oracle.
CURL_CONNECT_TIMEOUT="${RUOK_SMOKE_CURL_CONNECT_TIMEOUT:-3}"
CURL_MAX_TIME="${RUOK_SMOKE_CURL_MAX_TIME:-5}"

# Last HTTP status returned by api_call (global).
HTTP_STATUS=""

# ---------------------------------------------------------------------------
# Prerequisite + build
# ---------------------------------------------------------------------------

# Verify host commands required by the smoke suite. Fails nonzero if any is
# missing rather than fabricating a PASS.
require_cmds() {
  local miss=""
  for c in docker curl node; do
    if ! command -v "$c" >/dev/null 2>&1; then
      echo "    FAIL: required command '$c' is not on PATH" >&2
      miss=1
    fi
  done
  [ -z "$miss" ] || return 1
}

# Build the production image from a clean context. Fails loudly if the build
# cannot complete (e.g. emulation/arch limits) — never fabricates success.
smoke_build() {
  echo "==> docker build -t ${IMAGE_NAME} .  (context: ${OKR_APP_DIR})"
  (cd "$OKR_APP_DIR" && docker build -t "$IMAGE_NAME" .)
}

# Local image id (64-hex) — label accurately when no registry digest exists.
image_id() {
  docker inspect -f '{{.Id}}' "$IMAGE_NAME" 2>/dev/null || echo "<unknown>"
}

# Registry digest (may be empty when the image was only built locally).
image_digest() {
  docker inspect -f '{{range .RepoDigests}}{{.}} {{end}}' "$IMAGE_NAME" 2>/dev/null | tr -s ' '
}

# ---------------------------------------------------------------------------
# Bounded HTTP helpers
# ---------------------------------------------------------------------------

# Perform a bounded HTTP request.
#   api_call METHOD URL COOKIE_JAR OUT_BODY [DATA_JSON]
# Sets global HTTP_STATUS to the response code. Returns 0 on a COMPLETED
# request (any HTTP status); nonzero only if the request itself failed/timed out.
api_call() {
  local method="$1" url="$2" jar="$3" out="$4" data="${5:-}"
  local args=(-sS --connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time "$CURL_MAX_TIME"
    -o "$out" -w '%{http_code}')
  if [ -n "$jar" ]; then args+=(-b "$jar" -c "$jar"); fi
  args+=(-H 'Content-Type: application/json')
  if [ -n "$data" ]; then args+=(-d "$data"); fi
  if [ "$method" != "GET" ]; then args+=(-X "$method"); fi
  HTTP_STATUS=""
  local code
  code=$(curl "${args[@]}" "$url") || {
    echo "    FAIL: curl $method $url failed/timed out (max ${CURL_MAX_TIME}s)" >&2
    return 1
  }
  HTTP_STATUS="$code"
  return 0
}

# Fail if the last api_call HTTP_STATUS is not the expected value.
assert_status() {
  local expected="$1" label="$2"
  if [ "$HTTP_STATUS" != "$expected" ]; then
    echo "    FAIL: $label returned HTTP $HTTP_STATUS (expected $expected)" >&2
    return 1
  fi
  return 0
}

# Read a JSON field from a file (node is required on the host).
json_field_file() {
  local file="$1" path="$2"
  node -e \
    "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');try{const v=${path};console.log(v??'')}catch(e){process.exit(1)}" \
    "$file"
}

# Wait until GET /api/ready returns HTTP 200. FATAL on timeout.
wait_ready() {
  local port="$1"
  local deadline=$(( $(date +%s) + READY_TIMEOUT ))
  while :; do
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' \
      --connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time "$CURL_MAX_TIME" \
      "http://127.0.0.1:${port}/api/ready" || true)
    if [ "$code" = "200" ]; then
      echo "    /api/ready -> 200"
      return 0
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "    FAIL: /api/ready never returned 200 within ${READY_TIMEOUT}s (last code=${code})" >&2
      return 1
    fi
    sleep 2
  done
}

# ---------------------------------------------------------------------------
# Exact write->restart->read oracle
# ---------------------------------------------------------------------------

# Re-read a single objective BY ID and assert both id and title match.
# Returns nonzero (FATAL) when the objective is missing, unauthorized, or its
# title drifted — i.e. lost/partial persistence is never tolerated.
exact_read_objective() {
  local base="$1" jar="$2" id="$3" expected_title="$4"
  local out; out="$(mktemp)"
  local rc=0
  api_call GET "$base/api/objectives/$id" "$jar" "$out" || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "    FAIL: exact read of objective $id failed (network/timeout)" >&2
    rm -f "$out"
    return 1
  fi
  if [ "$HTTP_STATUS" != "200" ]; then
    echo "    FAIL: exact read of objective $id -> HTTP $HTTP_STATUS (expected 200; lost or unauthorized)" >&2
    rm -f "$out"
    return 1
  fi
  local rid rtitle
  rid="$(json_field_file "$out" 'JSON.parse(s).objective.id' 2>/dev/null || true)"
  rtitle="$(json_field_file "$out" 'JSON.parse(s).objective.title' 2>/dev/null || true)"
  rm -f "$out"
  if [ -z "$rid" ] || [ "$rid" != "$id" ]; then
    echo "    FAIL: exact read id mismatch (expected $id, got '${rid:-<empty>}')" >&2
    return 1
  fi
  if [ -z "$rtitle" ] || [ "$rtitle" != "$expected_title" ]; then
    echo "    FAIL: exact read title mismatch (expected '$expected_title', got '${rtitle:-<empty>}')" >&2
    return 1
  fi
  echo "    exact read OK id=$id title='$rtitle'"
  return 0
}

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

# Cleanup helper: remove a container + its named data volume (best-effort).
# Never masks the primary exit status of the calling script.
smoke_cleanup() {
  local name="$1"
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$name-data" >/dev/null 2>&1 || true
}