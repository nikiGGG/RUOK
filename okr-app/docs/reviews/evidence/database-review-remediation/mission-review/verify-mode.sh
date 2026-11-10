#!/usr/bin/env bash
set -euo pipefail
ROOT=/home/nikg/Develop/RUOK
EVIDENCE="$ROOT/okr-app/docs/reviews/evidence/database-review-remediation/mission-review"
IMAGE=76851d5c343ef90ab57a6313db88d73a341e0f53c7380d6052f7cfd87d1fb06d
PRIVATE=$(mktemp -d /tmp/ruok-mode-review.XXXXXX)
NAME="ruok-mode-review-$RANDOM-$$"
cleanup() {
  status=$?
  trap - EXIT
  podman logs "$NAME" > "$EVIDENCE/verify-mode-server.log" 2>&1 || true
  podman rm -f "$NAME" >/dev/null 2>&1 || true
  case "$PRIVATE" in /tmp/ruok-mode-review.*) rm -rf -- "$PRIVATE";; esac
  exit "$status"
}
trap cleanup EXIT
printf 'start=%s\nsource_head=%s\nimage_id=%s\nmode=verify\n' "$(date -u +%FT%TZ)" "$(git -C "$ROOT" rev-parse HEAD)" "$IMAGE"
podman run -d --pull=never --user 0 --name "$NAME" --env MIGRATION_MODE=verify --env DATABASE_TYPE=sqlite --env DATABASE_PATH=/data/fresh/app.db --publish 127.0.0.1::3000 --volume "$PRIVATE:/data" "$IMAGE" >/dev/null
BASE="http://$(podman port "$NAME" 3000/tcp)"
healthy=0
for attempt in $(seq 1 20); do
  if curl -fsS --connect-timeout 1 --max-time 2 "$BASE/api/health" > "$EVIDENCE/verify-mode-health.json"; then healthy=1; break; fi
  sleep 1
done
[ "$healthy" -eq 1 ] || { echo 'BLOCKED: built application failed to start'; exit 2; }
if [ -e "$PRIVATE/fresh/app.db" ]; then echo 'before_first_ready_file_exists=true'; else echo 'before_first_ready_file_exists=false'; fi
status=000
for attempt in $(seq 1 12); do
  status=$(curl -sS --connect-timeout 1 --max-time 5 --output "$EVIDENCE/verify-mode-ready-$attempt.json" --write-out '%{http_code}' "$BASE/api/ready")
  printf 'ready_sample=%s status=%s\n' "$attempt" "$status"
  if [ "$status" = 200 ]; then break; fi
  sleep 1
done
podman exec "$NAME" node -e 'const fs=require("fs");const p="/data/fresh/app.db";const exists=fs.existsSync(p);let tables=[];if(exists){const D=require("better-sqlite3");const db=new D(p,{readonly:true,fileMustExist:true});tables=db.prepare("SELECT name FROM sqlite_master WHERE type=? ORDER BY name").all("table").map(r=>r.name);db.close()}console.log(JSON.stringify({mode:"verify",file_created:exists,tables,unexpected_mutation:exists}));'
printf 'final_ready_status=%s\nend=%s\n' "$status" "$(date -u +%FT%TZ)"
