#!/bin/sh
# Execute in the retained Node22 verification container after the matrix finishes.
set -eu
cd /workspace/okr-app
export WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09/postgres-probe-proof
PRIVATE=$(mktemp -d /tmp/ruok-wp09-probes-XXXXXX)
trap 'rm -rf "$PRIVATE"' EXIT
{
  printf 'start=%s\n' "$(date -u +%FT%TZ)"
  printf 'command=podman exec ruok-wp09-verify sh docs/reviews/evidence/database-review-remediation/WP09/postgres-probe-proof/run.sh\n'
  grep '^source_revision=' "$WP09_EVIDENCE/../provenance.txt"
  printf 'source_revision_note=initial integrated-run revision; current executed product/build input hashes below capture subsequent owned repairs\n'
  printf 'image_provenance=../provenance.txt (retained verifier base image; application executes mounted current workspace build)\n'
  node --version
  node -p '"pg="+require("pg/package.json").version'
  node_modules/.bin/esbuild --version
  sha256sum docs/reviews/evidence/database-review-remediation/WP09/postgres-probe-proof/cycle.ts docs/reviews/evidence/database-review-remediation/WP09/postgres-probe-proof/run.sh tests/application/http-fixture.ts build/index.js /app/build/db-migrate.mjs src/lib/db/lifecycle.ts src/lib/db/adapters/postgres.ts
  printf 'workspace_build_files_manifest_sha256='
  find build -type f -exec sha256sum '{}' \; | LC_ALL=C sort | sha256sum
} > "$WP09_EVIDENCE/provenance.txt"
node_modules/.bin/esbuild docs/reviews/evidence/database-review-remediation/WP09/postgres-probe-proof/cycle.ts \
  --bundle --platform=node --format=cjs --external:pg-native \
  --define:import.meta.url='"file:///workspace/okr-app/tests/application/http-fixture.ts"' \
  --outfile="$PRIVATE/cycle.cjs" > "$WP09_EVIDENCE/compile.log" 2>&1
set +e
node docs/reviews/evidence/database-review-remediation/WP09/run-command.cjs cycle "node $PRIVATE/cycle.cjs"
status=$?
set -e
printf 'end=%s\nexit=%s\n' "$(date -u +%FT%TZ)" "$status" >> "$WP09_EVIDENCE/provenance.txt"
cat "$WP09_EVIDENCE/cycle.log"
exit "$status"
