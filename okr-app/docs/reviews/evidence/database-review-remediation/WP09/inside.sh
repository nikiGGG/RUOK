#!/bin/sh
# Disposable Node22/musl verifier; no product sources are modified.
set -eu
cd /workspace/okr-app
export WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09
RUN="$WP09_EVIDENCE/run-command.cjs"
export RUOK_TEST_PG_ADMIN_URL
RUOK_TEST_PG_ADMIN_URL=$(node -e 'const u=new URL(process.env.DATABASE_URL);u.pathname="/postgres";console.log(u.toString())')
unset DATABASE_URL DATABASE_PATH DB_BACKEND MIGRATION_MODE
# Runtime image defaults to production; verification needs committed dev tools.
export NODE_ENV=development
node "$RUN" setup 'apk add --no-cache bash build-base python3 postgresql18-client'
node "$RUN" environment 'node --version && npm --version && pg_dump --version && pg_restore --version && psql --version && uname -a'
node "$RUN" install 'npm ci --include=dev'
node "$RUN" versions 'node -e '\''for(const n of ["better-sqlite3","pg","vitest","drizzle-orm"])console.log(n+" "+JSON.parse(require("node:fs").readFileSync("node_modules/"+n+"/package.json")).version)'\'''
node "$RUN" build 'npm run build'
node "$RUN" full 'npm test'
node "$RUN" sqlite 'npm run test:db:sqlite'
node "$RUN" postgres 'npm run test:db:postgres'
node "$RUN" application-sqlite 'npm run test:application:sqlite'
node "$RUN" application-postgres 'npm run test:application:postgres'
node "$RUN" recovery-postgres 'npm run test:recovery:postgres'
# Both stability tests themselves execute ten independent runs with no retries.
node "$RUN" stability 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/concurrency.test.ts tests/db/no-init.test.ts --retry=0'
node "$RUN" remaining-contracts 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --retry=0'
node "$RUN" current-check 'npm run check' 1
# Baseline and current lockfiles are identical. Share the exact installed tools
# while keeping generated baseline files and controlled tests isolated.
ln -s /workspace/okr-app/node_modules /baseline/okr-app/node_modules
node "$RUN" baseline-check 'npm run check' 1 /baseline/okr-app
cp tests/db/sqlite-integrity.test.ts /baseline/okr-app/tests/db/sqlite-integrity.test.ts
node "$RUN" baseline-sqlite-index 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --retry=0' 1 /baseline/okr-app
# Require the intended old behavior (resolved migration), not a fixture/import error.
grep -q 'promise resolved' "$WP09_EVIDENCE/baseline-sqlite-index.log"
node "$RUN" fixed-sqlite-index 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --retry=0'
