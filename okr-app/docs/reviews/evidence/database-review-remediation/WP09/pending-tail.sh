#!/bin/sh
# Run only pending distinct stages, after the active continuation has exited.
# A recorded green stage is not repeated. Parent must authorize any rerun after
# source changes and retain earlier logs under a distinct attempt filename.
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
const file=process.env.WP09_EVIDENCE+'/stages.jsonl';
const rows=fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const record=rows.filter(r=>r.name===process.argv[2]).at(-1);
process.exit(record&&record.code===record.expected&&!record.signal?0:1);
NODE
}
pending() {
  if passed "$1"; then printf 'Already verified, not repeated: %s\n' "$1"; else node "$RUN" "$@"; fi
}
pending production-build-after-repair 'NODE_ENV=production npm run build'
pending current-check-after-repair 'npm run check' 1
pending diagnostic-comparison-after-repair 'node docs/reviews/evidence/database-review-remediation/WP09/compare-diagnostics.cjs current-check-after-repair.log baseline-check.log diagnostic-comparison-after-repair.json'
pending focused-no-init 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/no-init.test.ts --retry=0'
pending sqlite 'npm run test:db:sqlite'
pending postgres 'npm run test:db:postgres'
pending application-sqlite 'npm run test:application:sqlite'
pending application-postgres 'npm run test:application:postgres'
pending recovery-postgres 'npm run test:recovery:postgres'
pending stability 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/concurrency.test.ts tests/db/no-init.test.ts --retry=0'
pending remaining-contracts 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --retry=0'
if [ ! -f /baseline/okr-app/tests/db/sqlite-integrity.test.ts ]; then cp tests/db/sqlite-integrity.test.ts /baseline/okr-app/tests/db/sqlite-integrity.test.ts; fi
pending baseline-sqlite-index 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --retry=0' 1 /baseline/okr-app
grep -q 'promise resolved' "$WP09_EVIDENCE/baseline-sqlite-index.log"
pending fixed-sqlite-index 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t "rejects an expected-name unique index" --retry=0'
# This is the one corrected full run after the explicit two-file test repair.
# The initial failing full.log remains untouched.
pending full-after-repair 'npm test -- --retry=0'
