#!/usr/bin/env bash
# Fault-only replay: normal 15s setup, unchanged 5s post-restart control.
# IMAGE=<corrected-image> DATABASE_URL=<private-disposable-url> bash <script> <new-output-dir>
set -euo pipefail
: "${IMAGE:?Supply the already-built corrected production image}"
: "${DATABASE_URL:?Supply the disposable PostgreSQL URL privately}"
[[ $# -eq 1 ]] || { echo 'Usage: never-ready-controls.sh <new-output-dir>' >&2; exit 2; }
CONTROL_HOME=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(git -C "$CONTROL_HOME" rev-parse --show-toplevel)
APP="$ROOT/okr-app"
FAULT_ENGINE="$APP/docs/reviews/evidence/database-review-remediation/postmerge-correction/final-image-final/engine-fault.sh"
[[ -x "$FAULT_ENGINE" ]] || { echo 'Fault engine must exist and be executable' >&2; exit 2; }
mkdir -- "$1" # Preserve earlier attempts; refuse any existing output directory.
OUTPUT=$(cd -- "$1" && pwd)
exec > >(tee "$OUTPUT/run.log") 2>&1
finish() { result=$?; printf 'end=%s\nexit=%s\n' "$(date -u +%FT%TZ)" "$result"; }
trap finish EXIT
printf 'start=%s\nsource_head=%s\nrequested_image=%s\nsetup_deadline_s=15\npost_fault_deadline_s=5\n' \
  "$(date -u +%FT%TZ)" "$(git -C "$ROOT" rev-parse HEAD)" "$IMAGE"
export RUOK_SMOKE_SKIP_BUILD=1 RUOK_SMOKE_IMAGE="$IMAGE"
export RUOK_CONTAINER_ENGINE="$FAULT_ENGINE" RUOK_WP08_REAL_ENGINE=/usr/bin/podman RUOK_WP08_FAULT=never-ready
# Retain the intended 15-second normal setup from the original final-image run.
export RUOK_SMOKE_READY_TIMEOUT=15
/usr/bin/podman image inspect "$IMAGE" --format '{{.Id}}' > "$OUTPUT/image-id.txt"
sha256sum "$CONTROL_HOME/never-ready-controls.sh" "$APP/tests/container/lib.sh" "$FAULT_ENGINE" > "$OUTPUT/harness-sha256.txt"

run_case() (
  set -euo pipefail
  backend=$1
  # Reuse the actual smoke request/auth/write/read/timeout helpers, unmodified.
  source "$APP/tests/container/lib.sh"
  NAME="ruok-never-ready-$backend-$$-$RANDOM"
  VOL="$NAME-data"
  COOKIE_JAR=$(mktemp)
  cleanup_case() {
    result=$?
    trap - EXIT
    set +e
    engine logs "$NAME" > "$OUTPUT/$backend.server.log" 2>&1
    rm -f -- "$COOKIE_JAR"
    smoke_cleanup "$NAME"
    exit "$result"
  }
  trap cleanup_case EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  smoke_build
  if [[ "$backend" == sqlite ]]; then
    engine run -d --pull=never --name "$NAME" -v "$VOL":/app/data \
      -e DATABASE_TYPE=sqlite -e DATABASE_PATH=/app/data/okr.db -e NODE_ENV=production \
      -p 127.0.0.1::3000 "$IMAGE_ID"
  else
    engine run -d --pull=never --name "$NAME" \
      -e DATABASE_TYPE=postgres -e DATABASE_URL -e DATABASE_CONNECT_TIMEOUT_MS=3000 \
      -e NODE_ENV=production -p 127.0.0.1::3000 "$IMAGE_ID"
  fi
  binding=$(engine port "$NAME" 3000/tcp)
  SMOKE_PORT=${binding##*:}
  printf 'SETUP: backend=%s readiness_deadline_s=%s\n' "$backend" "$READY_TIMEOUT"
  wait_ready "$SMOKE_PORT"
  echo 'SETUP: initial readiness succeeded before fault injection'
  http_json GET /api/health 200 >/dev/null
  engine exec "$NAME" node build/db-migrate.mjs
  smoke_account
  smoke_write # Includes the real exact-ID/title read assertion before restart.
  if [[ "$backend" == sqlite ]]; then
    engine exec "$NAME" test -f /app/data/okr.db
    engine run --rm --pull=never -v "$VOL":/app/data --entrypoint sh "$IMAGE_ID" -c 'test -f /app/data/okr.db'
  else
    engine exec "$NAME" test ! -e /app/data/okr.db
  fi
  # The unchanged engine wrapper restarts, then stops the real app and emits its
  # CONTROL marker. Only this shell's second wait receives the five-second bound.
  engine restart "$NAME" >/dev/null
  running=$(engine inspect "$NAME" --format '{{.State.Running}}')
  [[ "$running" == false ]] || { echo 'FAIL fault did not stop the app'; exit 2; }
  echo 'CONTROL: real stopped-container state verified'
  READY_TIMEOUT=5
  printf 'POST_FAULT: readiness_deadline_s=%s\n' "$READY_TIMEOUT"
  set +e
  wait_ready "$SMOKE_PORT"
  readiness_status=$?
  set -e
  if [[ "$readiness_status" == 0 ]]; then
    echo 'FAIL never-ready control unexpectedly reached readiness'
    exit 0 # The outer runner rejects a successful smoke result.
  fi
  [[ "$readiness_status" == 1 ]] || exit 2
  echo 'CONTROL: intended post-fault readiness deadline rejected stopped app'
  exit 1 # Preserve the smoke script's required failure result under this fault.
)

for backend in sqlite postgres; do
  printf 'case=%s start=%s\n' "$backend" "$(date -u +%FT%TZ)"
  set +e
  run_case "$backend" > "$OUTPUT/$backend-never-ready.log" 2>&1
  status=$?
  set -e
  printf 'case=%s end=%s exit=%s expected=1\n' "$backend" "$(date -u +%FT%TZ)" "$status"
  [[ "$status" == 1 ]] || { echo 'FAIL unexpected control exit'; exit 1; }
  log=$(cat "$OUTPUT/$backend-never-ready.log")
  for marker in \
    'SETUP: initial readiness succeeded before fault injection' \
    'exact objective verified:' \
    'CONTROL: application stopped after restart; readiness cannot succeed' \
    'CONTROL: real stopped-container state verified' \
    'POST_FAULT: readiness_deadline_s=5' \
    'FAIL readiness deadline exceeded (5s)' \
    'CONTROL: intended post-fault readiness deadline rejected stopped app'; do
    [[ "$log" == *"$marker"* ]] || { printf 'FAIL missing phase proof: %s\n' "$marker"; exit 1; }
  done
done
printf 'result=PASS both fault scenarios failed only after setup and real injection\n'
