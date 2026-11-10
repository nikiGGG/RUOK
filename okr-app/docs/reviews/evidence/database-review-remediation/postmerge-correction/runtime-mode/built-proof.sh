#!/usr/bin/env bash
# Execute from any directory: IMAGE=<corrected-local-image> bash built-proof.sh <new-output-dir>
set -euo pipefail
: "${IMAGE:?Set IMAGE to the corrected production image; downloads are forbidden}"
[[ $# -eq 1 ]] || { echo 'Usage: IMAGE=<local-image> built-proof.sh <new-output-dir>' >&2; exit 2; }
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)
# mkdir without -p deliberately refuses to overwrite any existing evidence.
mkdir -- "$1"
OUTPUT=$(cd -- "$1" && pwd)
DATA="$OUTPUT/storage"
mkdir -- "$DATA"
NAMES=()
BASE=''
STATUS=''
cleanup() {
  result=$?
  trap - EXIT
  set +e
  for name in "${NAMES[@]}"; do
    podman logs "$name" > "$OUTPUT/$name.server.log" 2>&1
    podman inspect "$name" --format '{{.State.Pid}} {{.State.StartedAt}} {{.State.Status}}' > "$OUTPUT/$name.final-process.txt" 2>&1
    podman rm -f "$name" >/dev/null 2>&1
  done
  # DATA is created by this run under the newly-created output directory only.
  rm -rf -- "$DATA"
  printf 'end=%s\nexit=%s\n' "$(date -u +%FT%TZ)" "$result"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
exec > >(tee "$OUTPUT/run.log") 2>&1
printf 'start=%s\nsource_head=%s\nrequested_image=%s\n' "$(date -u +%FT%TZ)" "$(git -C "$ROOT" rev-parse HEAD)" "$IMAGE"
podman image inspect "$IMAGE" --format '{{.Id}}' > "$OUTPUT/image-id.txt"
podman image inspect "$IMAGE" --format '{{json .Config.Healthcheck}}' > "$OUTPUT/image-healthcheck.json"
sha256sum "$ROOT/okr-app/src/lib/db/lifecycle.ts" "$ROOT/okr-app/tests/db/readiness-mode.test.ts" "$SCRIPT_DIR/built-proof.sh" > "$OUTPUT/source-sha256.txt"
filesystem=$(stat -f -c %T "$DATA")
printf 'storage_filesystem=%s\n' "$filesystem"
case "$filesystem" in tmpfs|ramfs) echo 'FAIL: HTTP proof requires disk-backed storage'; exit 2;; esac
token="ruok-mode-corrected-$$-$RANDOM"

fail() { printf 'FAIL: %s\n' "$*"; exit 1; }

request() {
  local label=$1 route=$2 start elapsed
  start=$(date +%s%3N)
  STATUS=$(curl --silent --show-error --connect-timeout 1 --max-time 5 \
    --output "$OUTPUT/$label.json" --write-out '%{http_code}' "$BASE$route")
  elapsed=$(( $(date +%s%3N) - start ))
  printf 'request=%s status=%s elapsed_ms=%s\n' "$label" "$STATUS" "$elapsed"
  (( elapsed <= 5000 )) || fail "$label exceeded 5-second probe bound"
}

assert_absent() {
  local mode=$1
  [[ ! -e "$DATA/$mode/app.db" && ! -e "$DATA/$mode" ]] || fail "$mode created database file or parent"
  printf 'mode=%s file_exists=false parent_exists=false\n' "$mode"
}

start_server() {
  local mode=$1 name="$token-$1" start
  NAMES+=("$name")
  # Disable scheduled health checks only for this harness so the first readiness
  # request is controlled. The image's original healthcheck is recorded above.
  if [[ "$mode" == default ]]; then
    podman run -d --pull=never --no-healthcheck --user 0 --name "$name" \
      --env DATABASE_TYPE=sqlite --env DATABASE_PATH="/data/$mode/app.db" \
      --publish 127.0.0.1::3000 --volume "$DATA:/data" "$IMAGE" \
      sh -c 'unset MIGRATION_MODE; exec node build' > "$OUTPUT/$mode.container-id.txt"
  else
    podman run -d --pull=never --no-healthcheck --user 0 --name "$name" \
      --env "MIGRATION_MODE=$mode" --env DATABASE_TYPE=sqlite --env DATABASE_PATH="/data/$mode/app.db" \
      --publish 127.0.0.1::3000 --volume "$DATA:/data" "$IMAGE" > "$OUTPUT/$mode.container-id.txt"
  fi
  BASE="http://$(podman port "$name" 3000/tcp)"
  podman inspect "$name" --format '{{.State.Pid}} {{.State.StartedAt}}' > "$OUTPUT/$mode.initial-process.txt"
  start=$(date +%s)
  while true; do
    if request "$mode-health-start" /api/health && [[ "$STATUS" == 200 ]]; then break; fi
    (( $(date +%s) - start < 20 )) || fail "$mode server failed to become live"
    sleep 0.25
  done
  assert_absent "$mode"
}

# Verify remains unavailable and noncreating over repeated requests and cooldowns.
start_server verify
first_ready_start=$(date +%s%3N)
for sample in 1 2 3 4 5 6; do
  request "verify-ready-$sample" /api/ready
  [[ "$STATUS" == 503 ]] || fail "fresh verify readiness was $STATUS"
  if [[ "$sample" == 1 ]]; then
    detection_ms=$(( $(date +%s%3N) - first_ready_start ))
    (( detection_ms <= 10000 )) || fail 'unavailability detection exceeded 10 seconds'
    printf 'verify_unready_detection_ms=%s\n' "$detection_ms"
  fi
  assert_absent verify
  request "verify-health-$sample" /api/health
  [[ "$STATUS" == 200 ]] || fail 'liveness failed during verify refusal'
  sleep 1.1
done

# A separate same-image CLI process migrates the shared disk volume. The original
# server must recover in verify mode, keeping its original PID and start time.
printf 'external_migration_start=%s\n' "$(date -u +%FT%TZ)"
NAMES+=("$token-external-migrate")
timeout 60 podman run --rm --pull=never --no-healthcheck --user 0 --name "$token-external-migrate" \
  --env MIGRATION_MODE=migrate --env DATABASE_TYPE=sqlite --env DATABASE_PATH=/data/verify/app.db \
  --volume "$DATA:/data" "$IMAGE" node build/db-migrate.mjs > "$OUTPUT/external-migration.log" 2>&1
catalog_snapshot() {
  podman exec "$token-verify" node -e '
    const D=require("better-sqlite3");
    const db=new D("/data/verify/app.db",{readonly:true,fileMustExist:true});
    const catalog=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all();
    const journal=db.prepare("SELECT * FROM __drizzle_migrations ORDER BY created_at,id").all();
    console.log(JSON.stringify({catalog,journal})); db.close();
  '
}
catalog_snapshot > "$OUTPUT/verify.catalog-before-recovery.json"
start=$(date +%s%3N)
sample=0
while true; do
  sample=$((sample + 1))
  request "verify-recovery-$sample" /api/ready
  elapsed=$(( $(date +%s%3N) - start ))
  (( elapsed <= 30000 )) || fail 'verify recovery exceeded 30 seconds'
  [[ "$STATUS" == 200 ]] && break
  [[ "$STATUS" == 503 ]] || fail "unexpected recovery response $STATUS"
  sleep 0.25
done
printf 'verify_recovery_ms=%s\n' "$elapsed"
podman inspect "$token-verify" --format '{{.State.Pid}} {{.State.StartedAt}}' > "$OUTPUT/verify.recovered-process.txt"
cmp "$OUTPUT/verify.initial-process.txt" "$OUTPUT/verify.recovered-process.txt" || fail 'verify server restarted'
[[ -e "$DATA/verify/app.db" ]] || fail 'external migration did not create storage'
request verify-health-recovered /api/health
[[ "$STATUS" == 200 ]] || fail 'recovered server is not live'
printf 'verify_same_process=true\n'
catalog_snapshot > "$OUTPUT/verify.catalog-after-recovery.json"
cmp "$OUTPUT/verify.catalog-before-recovery.json" "$OUTPUT/verify.catalog-after-recovery.json" || fail 'verify changed catalog or migration journal'
printf 'verify_catalog_and_journal_unchanged=true\n'

# Invalid mode must refuse before creating storage, including after retries.
start_server verify-only
for sample in 1 2 3; do
  request "invalid-ready-$sample" /api/ready
  [[ "$STATUS" == 503 ]] || fail "invalid mode readiness was $STATUS"
  assert_absent verify-only
  request "invalid-health-$sample" /api/health
  [[ "$STATUS" == 200 ]] || fail 'invalid-mode liveness failed'
  sleep 1.1
done

# Unset mode must retain automatic migration and become ready.
start_server default
start=$(date +%s%3N)
sample=0
while true; do
  sample=$((sample + 1))
  request "default-ready-$sample" /api/ready
  elapsed=$(( $(date +%s%3N) - start ))
  (( elapsed <= 30000 )) || fail 'default readiness exceeded 30 seconds'
  [[ "$STATUS" == 200 ]] && break
  [[ "$STATUS" == 503 ]] || fail "unexpected default response $STATUS"
  sleep 0.25
done
[[ -e "$DATA/default/app.db" ]] || fail 'default mode did not migrate storage'
printf 'default_ready_ms=%s\nresult=PASS\n' "$elapsed"
