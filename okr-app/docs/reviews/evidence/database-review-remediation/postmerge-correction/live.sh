#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Supply disposable PostgreSQL fixture URL privately}"
ROOT=$(git rev-parse --show-toplevel)
APP="$ROOT/okr-app"
EVIDENCE="$APP/docs/reviews/evidence/database-review-remediation/postmerge-correction"
IMAGE=cc1cffc284fbb78bd0338d36883ca82ff3e38f33f560291e63525cc889b0a1aa
export IMAGE REVIEW_IMAGE_ID="$IMAGE" RUOK_TEST_PG_ADMIN_URL="$DATABASE_URL"
bash "$EVIDENCE/runtime-mode/built-proof.sh" "$EVIDENCE/runtime-mode/built-final"
podman run --rm --pull=never --no-healthcheck --user 0 \
  --env RUOK_TEST_PG_ADMIN_URL --env REVIEW_IMAGE_ID \
  --volume "$ROOT:/workspace" \
  --volume /home/nikg/Develop/RUOK/.worktrees/database-review-findings-remediation-01M5TGCE-lane-i/okr-app/node_modules:/workspace/okr-app/node_modules \
  --workdir /workspace/okr-app --entrypoint sh "$IMAGE" -c '
    export WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/postmerge-correction/restricted-http
    node docs/reviews/evidence/database-review-remediation/WP09/run-command.cjs proof "node_modules/.bin/esbuild docs/reviews/evidence/database-review-remediation/postmerge-correction/restricted-http/proof.ts --bundle --platform=node --format=esm --packages=external --outfile=node_modules/.cache/review-restricted-http.mjs && node node_modules/.cache/review-restricted-http.mjs"
  '
