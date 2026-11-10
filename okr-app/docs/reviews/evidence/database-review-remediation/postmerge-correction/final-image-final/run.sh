#!/usr/bin/env bash
# Final-source production packaging and six live scenarios; writes only WP09.
set -euo pipefail
: "${DATABASE_URL:?Supply disposable PostgreSQL URL privately}"
APP=$(pwd)
EVIDENCE="$APP/docs/reviews/evidence/database-review-remediation/postmerge-correction/final-image-final"
TAG=localhost/ruok:postmerge-correction
{
  printf 'start=%s\n' "$(date -u +%FT%TZ)"
  printf 'source_head=%s\n' "$(git rev-parse HEAD)"
  printf 'app_source_dirty_diff_sha256='
  git diff --binary -- src scripts tests Dockerfile package.json package-lock.json | sha256sum
  printf 'build_command=podman build --format docker --pull=never -t localhost/ruok:postmerge-correction .\n'
  printf 'live_command=bash docs/reviews/evidence/database-review-remediation/postmerge-correction/final-image-final/run.sh\n'
  podman --version
  printf 'host_node='
  node --version
  curl --version
  git --version
} > "$EVIDENCE/provenance.txt"
git ls-files -z -- src scripts tests Dockerfile package.json package-lock.json | xargs -0 sha256sum > "$EVIDENCE/source-files.sha256"
set +e
podman build --format docker --pull=never -t "$TAG" . > "$EVIDENCE/build.log" 2>&1
build_status=$?
set -e
printf 'build_end=%s\nbuild_exit=%s\n' "$(date -u +%FT%TZ)" "$build_status" >> "$EVIDENCE/provenance.txt"
if [ "$build_status" -ne 0 ]; then
  echo 'Final image build failed; inspect final-image/build.log. If a required image could not be obtained, STOP ALL mission work and ask the operator.' >&2
  exit "$build_status"
fi
export RUOK_SMOKE_IMAGE
RUOK_SMOKE_IMAGE=$(podman image inspect --format '{{.Id}}' "$TAG")
printf 'image_id=%s\nidentity_kind=local-image-id-not-registry-digest\n' "$RUOK_SMOKE_IMAGE" >> "$EVIDENCE/provenance.txt"
podman image inspect --format '{{json .Config.Healthcheck}}' "$RUOK_SMOKE_IMAGE" > "$EVIDENCE/image-healthcheck.json"
podman run --rm --pull=never --entrypoint node "$RUOK_SMOKE_IMAGE" -e 'console.log(JSON.stringify({node:process.version,sqlite:require("better-sqlite3/package.json").version,pg:require("pg/package.json").version}))' > "$EVIDENCE/runtime-versions.json"
export RUOK_SMOKE_SKIP_BUILD=1 RUOK_SMOKE_READY_TIMEOUT=15
export RUOK_CONTAINER_ENGINE=/usr/bin/podman
: > "$EVIDENCE/live-results.txt"
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
    echo "Unexpected final-image result: $name; inspect redacted log" >&2
    return 1
  fi
}
run_case sqlite-positive success tests/container/smoke-sqlite.sh
run_case postgres-positive success tests/container/smoke-postgres.sh
export RUOK_CONTAINER_ENGINE="$EVIDENCE/engine-fault.sh"
export RUOK_WP08_FAULT=lost-write
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
sha256sum -c "$EVIDENCE/source-files.sha256" > "$EVIDENCE/source-stability.log"
printf 'end=%s\nsource_stability_exit=0\n' "$(date -u +%FT%TZ)" >> "$EVIDENCE/provenance.txt"
