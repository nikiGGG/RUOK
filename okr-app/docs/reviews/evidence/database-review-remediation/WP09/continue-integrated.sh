#!/usr/bin/env bash
# Retain the disposable verifier on failure for diagnosis, not hidden retries.
set -euo pipefail
: "${DATABASE_URL:?Supply disposable PostgreSQL URL privately}"
APP=$(pwd)
EVIDENCE="$APP/docs/reviews/evidence/database-review-remediation/WP09"
BASELINE=$(mktemp -d /tmp/ruok-wp09-baseline-continue-XXXXXX)
git -C "$APP/.." archive 0572599edc3e79dded5893aaaaef6867394a5288 okr-app | tar -x -C "$BASELINE"
printf 'baseline_temp=%s\n' "$BASELINE" > "$EVIDENCE/continuation-setup.txt"
podman run --detach --pull=never --name ruok-wp09-verify --user 0 \
  --env DATABASE_URL --env NODE_ENV=test \
  --volume "$APP/..:/workspace" --volume "$BASELINE:/baseline" \
  --workdir /workspace/okr-app --entrypoint sleep localhost/ruok:wp08 infinity
podman exec ruok-wp09-verify sh docs/reviews/evidence/database-review-remediation/WP09/inside-remaining.sh
# Parent removes verifier/baseline explicitly after inspection and final checks.
