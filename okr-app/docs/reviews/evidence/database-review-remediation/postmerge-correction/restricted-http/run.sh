#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Supply disposable PostgreSQL fixture URL privately}"
: "${IMAGE:?Supply corrected immutable local image identity}"
[[ $# == 1 ]] || { echo 'Usage: run.sh <new-output-directory>' >&2; exit 2; }
ROOT=$(git rev-parse --show-toplevel)
mkdir -- "$1"
OUTPUT=$(cd "$1" && pwd)
RELATIVE=$(realpath --relative-to="$ROOT" "$OUTPUT")
case "$RELATIVE" in ../*|..) echo 'Output must be inside the checkout' >&2; exit 2;; esac
export REVIEW_IMAGE_ID="$IMAGE" RUOK_TEST_PG_ADMIN_URL="$DATABASE_URL"
podman run --rm --pull=never --no-healthcheck --user 0 \
  --env RUOK_TEST_PG_ADMIN_URL --env REVIEW_IMAGE_ID \
  --env "WP09_EVIDENCE=/workspace/$RELATIVE" \
  --volume "$ROOT:/workspace" \
  --volume /home/nikg/Develop/RUOK/.worktrees/database-review-findings-remediation-01M5TGCE-lane-i/okr-app/node_modules:/workspace/okr-app/node_modules \
  --workdir /workspace/okr-app --entrypoint sh "$IMAGE" -c '
    node docs/reviews/evidence/database-review-remediation/WP09/run-command.cjs proof "node_modules/.bin/esbuild docs/reviews/evidence/database-review-remediation/postmerge-correction/restricted-http/proof.ts --bundle --platform=node --format=esm --packages=external --outfile=node_modules/.cache/review-restricted-http.mjs && node node_modules/.cache/review-restricted-http.mjs"
  '
