#!/bin/sh
set -eu
cd /workspace/okr-app
export NODE_ENV=test TMPDIR=/tmp/ruok-wp09-postmerge-tests
unset DATABASE_URL DATABASE_PATH MIGRATION_MODE RUOK_TEST_PG_ADMIN_URL DB_BACKEND
mkdir -p "$TMPDIR"
RUN=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09/run-command.cjs
node "$RUN" environment 'node --version && npm --version && df -k /tmp'
node "$RUN" versions 'node -e '\''for(const n of ["better-sqlite3","pg","vitest","drizzle-orm"])console.log(n+" "+JSON.parse(require("node:fs").readFileSync("node_modules/"+n+"/package.json")).version)'\'''
node "$RUN" production-build 'NODE_ENV=production npm run build'
node "$RUN" full 'npm test -- --maxWorkers=1 --retry=0'
