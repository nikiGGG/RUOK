#!/usr/bin/env bash
# Shared helpers for RUOK container smoke tests (WP09 / T036).
#
# These scripts build the production image from a CLEAN build context and run it
# the way a real deployment would. They record the exact docker commands and
# exit codes so the result is auditable.
set -uo pipefail

# Directory of the okr-app package (two levels up from tests/container/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OKR_APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Image name/tag used for the smoke build.
IMAGE_NAME="${RUOK_SMOKE_IMAGE:-ruok:smoke}"

# Local port the container is published on (default 3180).
SMOKE_PORT="${RUOK_SMOKE_PORT:-3180}"

# How long (seconds) to wait for readiness before giving up.
READY_TIMEOUT="${RUOK_SMOKE_READY_TIMEOUT:-120}"

# Build the production image from a clean context. Fails loudly if the build
# cannot complete (e.g. emulation/arch limits) — never fabricates success.
smoke_build() {
  echo "==> docker build -t ${IMAGE_NAME} .  (context: ${OKR_APP_DIR})"
  (cd "$OKR_APP_DIR" && docker build -t "$IMAGE_NAME" .)
}

# Wait until GET /api/ready returns HTTP 200 (i.e. backend open AND migrated).
wait_ready() {
  local port="$1"
  local deadline=$(( $(date +%s) + READY_TIMEOUT ))
  while :; do
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/api/ready" || true)
    if [ "$code" = "200" ]; then
      echo "    /api/ready -> 200"
      return 0
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "    /api/ready never returned 200 within ${READY_TIMEOUT}s (last code=${code})" >&2
      return 1
    fi
    sleep 2
  done
}

# Extract a JSON field with node (host node is required).
json_field() {
  local json="$1"
  local path="$2"
  printf '%s' "$json" | node -e \
    "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const v=${path};console.log(v??'')}catch(e){process.exit(1)}})"
}

# Cleanup helper: remove a container (best-effort).
smoke_cleanup() {
  local name="$1"
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$name-data" >/dev/null 2>&1 || true
}