#!/bin/sh
# PostgreSQL adapter/availability source changed; retain unaffected green stages.
set -eu
. /workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09/tmpfs-common.sh
export RUOK_TEST_PG_ADMIN_URL
RUOK_TEST_PG_ADMIN_URL=$(node -e 'const u=new URL(process.env.DATABASE_URL);u.pathname="/postgres";console.log(u.toString())')
unset DATABASE_URL DATABASE_PATH DB_BACKEND MIGRATION_MODE
pending_tmpfs production_build_after_pg_close 'NODE_ENV=production npm run build'
pending_tmpfs current_check_after_pg_close 'npm run check' 1
pending_tmpfs diagnostic_comparison_after_pg_close 'node docs/reviews/evidence/database-review-remediation/WP09/compare-diagnostics.cjs current_check_after_pg_close.log baseline-check.log diagnostic-comparison-after-pg-close.json'
pending_tmpfs focused_pg_close_tmpfs 'DB_BACKEND=postgres node_modules/.bin/vitest run tests/db/availability.test.ts -t "safely repeats/concurrently closes then reopens" --maxWorkers=1 --retry=0'
pending_tmpfs postgres_after_close_tmpfs 'npm run test:db:postgres -- --maxWorkers=1 --retry=0'
pending_tmpfs application_postgres_after_close_tmpfs 'npm run test:application:postgres -- --maxWorkers=1 --retry=0'
pending_tmpfs recovery_postgres_after_close_tmpfs 'npm run test:recovery:postgres -- --maxWorkers=1 --retry=0'
pending_tmpfs remaining_contracts_after_close_tmpfs 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --maxWorkers=1 --retry=0'
if [ ! -f /baseline/okr-app/tests/db/sqlite-integrity.test.ts ]; then cp tests/db/sqlite-integrity.test.ts /baseline/okr-app/tests/db/sqlite-integrity.test.ts; fi
pending_tmpfs baseline_sqlite_index_tmpfs 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --maxWorkers=1 --retry=0' 1 /baseline/okr-app
grep -q 'promise resolved' "$WP09_EVIDENCE/baseline_sqlite_index_tmpfs.log"
pending_tmpfs fixed_sqlite_index_tmpfs 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --maxWorkers=1 --retry=0'
pending_tmpfs full_after_pg_close_tmpfs 'npm test -- --maxWorkers=1 --retry=0'
node "$RUN" tmpfs-matrix-df-after 'df -k /tmp /dev/shm/ruok-wp09-tests'
