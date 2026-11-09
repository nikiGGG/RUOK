#!/bin/sh
set -eu
. /workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09/tmpfs-common.sh
unset DATABASE_URL DATABASE_PATH DB_BACKEND MIGRATION_MODE
node "$WP09_EVIDENCE/tmpfs-snapshot.cjs" diagnostic-setup
node "$RUN" tmpfs-df-before 'df -k /tmp /dev/shm/ruok-wp09-tests'
pending_tmpfs tmpfs-diagnostic 'DB_BACKEND=sqlite node_modules/.bin/vitest run tests/backup/sqlite.test.ts tests/upgrade/upgrade-preserves-data.test.ts -t "round-trips complete supported content|adopts a db:push-era layout" --maxWorkers=1 --retry=0'
node "$RUN" tmpfs-df-after 'df -k /tmp /dev/shm/ruok-wp09-tests'
