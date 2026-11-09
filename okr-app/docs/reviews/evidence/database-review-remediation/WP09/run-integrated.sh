#!/usr/bin/env bash
# Invoke from lane-i/okr-app after privately exporting DATABASE_URL.
set -euo pipefail
: "${DATABASE_URL:?Supply disposable PostgreSQL URL privately}"
APP=$(pwd)
EVIDENCE="$APP/docs/reviews/evidence/database-review-remediation/WP09"
BASELINE=$(mktemp -d /tmp/ruok-wp09-baseline-XXXXXX)
trap 'rm -rf "$BASELINE"' EXIT
git -C "$APP/.." archive 0572599edc3e79dded5893aaaaef6867394a5288 okr-app | tar -x -C "$BASELINE"
{
  printf 'start=%s\n' "$(date -u +%FT%TZ)"
  printf 'source_revision=%s\n' "$(git rev-parse HEAD)"
  printf 'baseline_revision=0572599edc3e79dded5893aaaaef6867394a5288\n'
  printf 'source_diff_sha256='
  git diff --binary | sha256sum
  printf 'lockfile_sha256='
  sha256sum package-lock.json
  printf 'image_id='
  podman image inspect --format '{{.Id}}' localhost/ruok:wp08
  podman --version
} > "$EVIDENCE/provenance.txt"
: > "$EVIDENCE/stages.jsonl"
podman run --rm --pull=never --name ruok-wp09-verify --user 0 \
  --env DATABASE_URL --env NODE_ENV=development \
  --volume "$APP/..:/workspace" \
  --volume "$BASELINE:/baseline" \
  --workdir /workspace/okr-app \
  --entrypoint sh localhost/ruok:wp08 \
  docs/reviews/evidence/database-review-remediation/WP09/inside.sh
printf 'end=%s\n' "$(date -u +%FT%TZ)" >> "$EVIDENCE/provenance.txt"
