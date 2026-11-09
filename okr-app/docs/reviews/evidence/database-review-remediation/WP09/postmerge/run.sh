#!/usr/bin/env bash
# Execute only after the governed local merge, against the actual target checkout.
set -euo pipefail
ROOT=/home/nikg/Develop/RUOK
APP="$ROOT/okr-app"
LANE_APP="$ROOT/.worktrees/database-review-findings-remediation-01M5TGCE-lane-i/okr-app"
EVIDENCE="$APP/docs/reviews/evidence/database-review-remediation/WP09/postmerge"
FINAL="$APP/docs/reviews/evidence/database-review-remediation/WP09/final-image"
BRANCH=$(git -C "$ROOT" branch --show-current)
[ "$BRANCH" = plan/sqlite-postgresql-support ] || { echo 'Postmerge verification requires the actual target branch checkout' >&2; exit 1; }
[ -d "$LANE_APP/node_modules" ] || { echo 'Keep lane-i worktree and its exact-lock development modules through merge' >&2; exit 1; }
[ ! -e "$EVIDENCE/provenance.txt" ] || { echo 'Preserve the existing postmerge attempt before an explicitly justified rerun' >&2; exit 1; }
IMAGE_ID=$(sed -n 's/^image_id=//p' "$FINAL/provenance.txt")
[[ "$IMAGE_ID" =~ ^(sha256:)?[0-9a-f]{64}$ ]] || { echo 'Final verified immutable image ID unavailable' >&2; exit 1; }
cmp "$APP/package-lock.json" "$LANE_APP/package-lock.json"
cd "$APP"
git ls-files -z -- src scripts tests Dockerfile package.json package-lock.json | xargs -0 sha256sum > "$EVIDENCE/target-source-before.sha256"
cmp "$FINAL/source-files.sha256" "$EVIDENCE/target-source-before.sha256"
{
  printf 'start=%s\n' "$(date -u +%FT%TZ)"
  printf 'target_checkout=%s\ntarget_branch=%s\ntarget_head=%s\n' "$ROOT" "$BRANCH" "$(git -C "$ROOT" rev-parse HEAD)"
  printf 'image_id=%s\nidentity_kind=local-image-id-not-registry-digest\n' "$IMAGE_ID"
  printf 'source_match=exact final-image source/test manifest; no extra tracked files in captured scopes\n'
  printf 'node_modules_source=%s\n' "$LANE_APP/node_modules"
  printf 'lockfile_sha256='
  sha256sum package-lock.json
  printf 'command=bash docs/reviews/evidence/database-review-remediation/WP09/postmerge/run.sh\n'
  podman --version
} > "$EVIDENCE/provenance.txt"
: > "$EVIDENCE/stages.jsonl"
set +e
podman run --rm --pull=never --name ruok-wp09-postmerge --user 0 \
  --tmpfs /tmp:rw,size=256m \
  --volume "$ROOT:/workspace" \
  --volume "$LANE_APP/node_modules:/workspace/okr-app/node_modules" \
  --workdir /workspace/okr-app --env NODE_ENV=test \
  --env WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09/postmerge \
  --entrypoint sh "$IMAGE_ID" \
  docs/reviews/evidence/database-review-remediation/WP09/postmerge/inside.sh > "$EVIDENCE/container.log" 2>&1
status=$?
set -e
printf 'end=%s\nexit=%s\n' "$(date -u +%FT%TZ)" "$status" >> "$EVIDENCE/provenance.txt"
cat "$EVIDENCE/container.log"
[ "$status" -eq 0 ] || exit "$status"
git ls-files -z -- src scripts tests Dockerfile package.json package-lock.json | xargs -0 sha256sum > "$EVIDENCE/target-source-after.sha256"
cmp "$FINAL/source-files.sha256" "$EVIDENCE/target-source-after.sha256"
printf 'source_stability_exit=0\n' >> "$EVIDENCE/provenance.txt"
cd "$EVIDENCE"
find . -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS
sha256sum -c SHA256SUMS
