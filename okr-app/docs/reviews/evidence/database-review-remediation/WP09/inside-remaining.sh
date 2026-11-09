#!/bin/sh
# Continue distinct pending stages without retrying the failed full suite.
set -eu
cd /workspace/okr-app
export WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09
RUN="$WP09_EVIDENCE/run-command.cjs"
export RUOK_TEST_PG_ADMIN_URL
RUOK_TEST_PG_ADMIN_URL=$(node -e 'const u=new URL(process.env.DATABASE_URL);u.pathname="/postgres";console.log(u.toString())')
unset DATABASE_URL DATABASE_PATH DB_BACKEND MIGRATION_MODE
export NODE_ENV=test
node "$RUN" setup-continuation 'apk add --no-cache bash build-base python3 postgresql18-client'
node "$RUN" production-build 'NODE_ENV=production npm run build'
node "$RUN" current-check 'npm run check' 1
ln -s /workspace/okr-app/node_modules /baseline/okr-app/node_modules
node "$RUN" baseline-check 'npm run check' 1 /baseline/okr-app
node "$RUN" diagnostic-comparison 'node docs/reviews/evidence/database-review-remediation/WP09/compare-diagnostics.cjs'
node "$RUN" sqlite 'npm run test:db:sqlite'
node "$RUN" postgres 'npm run test:db:postgres'
node "$RUN" application-sqlite 'npm run test:application:sqlite'
node "$RUN" application-postgres 'npm run test:application:postgres'
node "$RUN" recovery-postgres 'npm run test:recovery:postgres'
node "$RUN" stability 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/concurrency.test.ts tests/db/no-init.test.ts --retry=0'
node "$RUN" remaining-contracts 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --retry=0'
cp tests/db/sqlite-integrity.test.ts /baseline/okr-app/tests/db/sqlite-integrity.test.ts
node "$RUN" baseline-sqlite-index 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --retry=0' 1 /baseline/okr-app
grep -q 'promise resolved' "$WP09_EVIDENCE/baseline-sqlite-index.log"
node "$RUN" fixed-sqlite-index 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --retry=0'
