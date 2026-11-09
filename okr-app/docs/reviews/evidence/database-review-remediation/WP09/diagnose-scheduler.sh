#!/bin/sh
set -eu
cd /workspace/okr-app
export WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09
export NODE_ENV=test
unset DATABASE_URL DATABASE_PATH DB_BACKEND MIGRATION_MODE
node "$WP09_EVIDENCE/run-command.cjs" auth-scheduler-diagnostic 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/domains/auth/sqlite.test.ts -t "system config upserts and masks nothing at the boundary" --maxWorkers=1 --retry=0'
