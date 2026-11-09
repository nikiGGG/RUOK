#!/usr/bin/env bash
# Replay only against disposable local containers and database.
# DATABASE_URL must already be exported privately and reachable inside the image.
set -euo pipefail
EVIDENCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$(cd "$EVIDENCE/../../../../.." && pwd)"
cd "$APP"
: "${DATABASE_URL:?Supply a disposable live PostgreSQL URL privately}"
export RUOK_SMOKE_IMAGE
RUOK_SMOKE_IMAGE=$(/usr/bin/podman image inspect --format '{{.Id}}' "${RUOK_SMOKE_IMAGE:-localhost/ruok:wp08}")
export RUOK_SMOKE_SKIP_BUILD=1 RUOK_SMOKE_READY_TIMEOUT=15
export RUOK_CONTAINER_ENGINE=/usr/bin/podman
RUN_DIR=$(mktemp -d)
trap 'rm -rf "$RUN_DIR"' EXIT
ln -s "$EVIDENCE/engine-fault.sh" "$RUN_DIR/docker"
mkdir "$RUN_DIR/baseline"
git show 0c6119f9f5b4a06aa386fe906b05034121054545:okr-app/tests/container/lib.sh > "$RUN_DIR/baseline/lib.sh"
git show 0c6119f9f5b4a06aa386fe906b05034121054545:okr-app/tests/container/smoke-postgres.sh > "$RUN_DIR/baseline/smoke-postgres.sh"
run_case() {
  local name="$1" expected="$2" script="$3" status start end
  start=$(date -u +%FT%TZ)
  set +e
  bash "$script" > "$EVIDENCE/$name.log" 2>&1
  status=$?
  set -e
  end=$(date -u +%FT%TZ)
  printf '%s start=%s end=%s exit=%s expected=%s\n' "$name" "$start" "$end" "$status" "$expected" | tee -a "$EVIDENCE/live-results.txt"
  if { [ "$expected" = success ] && [ "$status" -ne 0 ]; } || { [ "$expected" = failure ] && [ "$status" -eq 0 ]; }; then
    echo "Unexpected result: $name; inspect redacted log" >&2
    return 1
  fi
}
{
  printf 'helper-contract start='; date -u +%FT%TZ
  node "$EVIDENCE/helper-contract.cjs" > "$EVIDENCE/helper-contract.log" 2>&1
  printf 'helper-contract exit=0 end='; date -u +%FT%TZ
  set +e
  env -u DATABASE_URL bash tests/container/smoke-postgres.sh > "$EVIDENCE/missing-url.log" 2>&1
  missing_status=$?
  set -e
  printf 'missing-url exit=%s expected=nonzero\n' "$missing_status"
  [ "$missing_status" -ne 0 ]
  bash -n tests/container/lib.sh tests/container/smoke-sqlite.sh tests/container/smoke-postgres.sh tests/container/smoke-host-sqlite.sh
  echo 'diff-scoped bash -n: exit=0'
  git diff --check
  echo 'git diff --check: exit=0'
} > "$EVIDENCE/validation.log" 2>&1
: > "$EVIDENCE/live-results.txt"
run_case sqlite-positive success tests/container/smoke-sqlite.sh
run_case postgres-positive success tests/container/smoke-postgres.sh
export RUOK_WP08_FAULT=lost-write
export RUOK_WP08_BASELINE=1
PATH="$RUN_DIR:$PATH" run_case baseline-postgres-lost-write success "$RUN_DIR/baseline/smoke-postgres.sh"
grep -Eq 'created objective id=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' "$EVIDENCE/baseline-postgres-lost-write.log"
grep -q 'CONTROL: objective rows deleted after restart' "$EVIDENCE/baseline-postgres-lost-write.log"
grep -q 'NOTE: objective persistence could not be confirmed' "$EVIDENCE/baseline-postgres-lost-write.log"
grep -q 'PASS (no-SQLite-dependency checks)' "$EVIDENCE/baseline-postgres-lost-write.log"
unset RUOK_WP08_BASELINE
export RUOK_CONTAINER_ENGINE="$EVIDENCE/engine-fault.sh"
run_case sqlite-lost-write failure tests/container/smoke-sqlite.sh
run_case postgres-lost-write failure tests/container/smoke-postgres.sh
for backend in sqlite postgres; do
  grep -q 'CONTROL: objective rows deleted after restart' "$EVIDENCE/$backend-lost-write.log"
  grep -q 'FAIL original objective ID/title missing or changed' "$EVIDENCE/$backend-lost-write.log"
done
export RUOK_WP08_FAULT=never-ready RUOK_SMOKE_READY_TIMEOUT=5
run_case sqlite-never-ready failure tests/container/smoke-sqlite.sh
run_case postgres-never-ready failure tests/container/smoke-postgres.sh
for backend in sqlite postgres; do
  grep -q 'CONTROL: application stopped after restart' "$EVIDENCE/$backend-never-ready.log"
  grep -q 'FAIL readiness deadline exceeded' "$EVIDENCE/$backend-never-ready.log"
done
