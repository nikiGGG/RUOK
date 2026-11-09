#!/bin/sh
# Helpers for explicit real-file functional tests on a private tmpfs directory.
set -eu
cd /workspace/okr-app
export WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09
export TMPDIR=/dev/shm/ruok-wp09-tests NODE_ENV=test
mkdir -p "$TMPDIR"
chmod 700 "$TMPDIR"
RUN="$WP09_EVIDENCE/run-command.cjs"
passed() {
  node - "$1" <<'NODE'
const fs=require('fs');
const rows=fs.readFileSync(process.env.WP09_EVIDENCE+'/stages.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const record=rows.filter(r=>r.name===process.argv[2]).at(-1);
process.exit(record&&record.code===record.expected&&!record.signal?0:1);
NODE
}
pending_tmpfs() {
  if passed "$1"; then printf 'Already verified in this tmpfs environment, not repeated: %s\n' "$1"; return 0; fi
  node "$WP09_EVIDENCE/tmpfs-snapshot.cjs" "before-$1"
  if node "$RUN" "$@"; then stage_status=0; else stage_status=$?; fi
  if ! node "$WP09_EVIDENCE/tmpfs-snapshot.cjs" "after-$1"; then stage_status=1; fi
  return "$stage_status"
}
