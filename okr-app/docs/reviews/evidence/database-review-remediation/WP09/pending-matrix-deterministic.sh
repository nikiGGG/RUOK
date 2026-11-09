#!/bin/sh
# Explicit scheduler correction: preserve tests, strict deadlines and concurrency
# inside each test. No source edits, timeout increases or automatic retries.
set -eu
cd /workspace/okr-app
export WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09
RUN="$WP09_EVIDENCE/run-command.cjs"
export RUOK_TEST_PG_ADMIN_URL
RUOK_TEST_PG_ADMIN_URL=$(node -e 'const u=new URL(process.env.DATABASE_URL);u.pathname="/postgres";console.log(u.toString())')
unset DATABASE_URL DATABASE_PATH DB_BACKEND MIGRATION_MODE
export NODE_ENV=test
passed() {
  node - "$1" <<'NODE'
const fs=require('fs');
const rows=fs.readFileSync(process.env.WP09_EVIDENCE+'/stages.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const record=rows.filter(r=>r.name===process.argv[2]).at(-1);
process.exit(record&&record.code===record.expected&&!record.signal?0:1);
NODE
}
pending() {
  if passed "$1"; then printf 'Already verified, not repeated: %s\n' "$1"; else node "$RUN" "$@"; fi
}
passed diagnostic-comparison-after-repair || { echo 'Diagnostic comparison is not green' >&2; exit 2; }
passed scheduling-diagnostic || { echo 'Scheduler diagnostic has not passed; parent must assess the evidence before authorizing this matrix' >&2; exit 2; }
printf '%s\n' 'Deterministic file scheduler: --maxWorkers=1; --retry=0; no global or per-test deadline increases; all package entrypoints and in-test concurrency retained.' > "$WP09_EVIDENCE/scheduler-policy.txt"
pending sqlite-deterministic 'npm run test:db:sqlite -- --maxWorkers=1 --retry=0'
pending postgres-deterministic 'npm run test:db:postgres -- --maxWorkers=1 --retry=0'
pending application-sqlite-deterministic 'npm run test:application:sqlite -- --maxWorkers=1 --retry=0'
pending application-postgres-deterministic 'npm run test:application:postgres -- --maxWorkers=1 --retry=0'
pending recovery-postgres-deterministic 'npm run test:recovery:postgres -- --maxWorkers=1 --retry=0'
pending stability-deterministic 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/concurrency.test.ts tests/db/no-init.test.ts --maxWorkers=1 --retry=0'
pending remaining-contracts-deterministic 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --maxWorkers=1 --retry=0'
if [ ! -f /baseline/okr-app/tests/db/sqlite-integrity.test.ts ]; then cp tests/db/sqlite-integrity.test.ts /baseline/okr-app/tests/db/sqlite-integrity.test.ts; fi
pending baseline-sqlite-index 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --maxWorkers=1 --retry=0' 1 /baseline/okr-app
grep -q 'promise resolved' "$WP09_EVIDENCE/baseline-sqlite-index.log"
pending fixed-sqlite-index 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --maxWorkers=1 --retry=0'
pending full-after-repair-deterministic 'npm test -- --maxWorkers=1 --retry=0'
