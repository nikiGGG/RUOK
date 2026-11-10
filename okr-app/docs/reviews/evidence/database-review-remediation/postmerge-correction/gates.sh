#!/bin/sh
set -eu
cd /workspace/okr-app
export NODE_ENV=test TMPDIR=/tmp/ruok-corrective-tests
: "${WP09_EVIDENCE:=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/postmerge-correction}"
export WP09_EVIDENCE
mkdir -p "$TMPDIR"
RUN=docs/reviews/evidence/database-review-remediation/WP09/run-command.cjs
# Credentials are inherited privately by Podman and redacted by the recorder.
node "$RUN" environment 'node --version && npm --version && pg_dump --version && df -k /tmp'
node "$RUN" production-build 'NODE_ENV=production npm run build'
node "$RUN" current-check 'npm run check' 1
node "$RUN" supplemental 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/readiness-mode.test.ts tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --maxWorkers=1 --retry=0'
node "$RUN" sqlite 'npm run test:db:sqlite -- --maxWorkers=1 --retry=0'
node "$RUN" postgres 'npm run test:db:postgres -- --maxWorkers=1 --retry=0'
node "$RUN" application-postgres 'npm run test:application:postgres -- --maxWorkers=1 --retry=0'
node "$RUN" full 'npm test -- --maxWorkers=1 --retry=0'
