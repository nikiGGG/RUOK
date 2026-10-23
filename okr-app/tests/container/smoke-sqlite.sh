#!/usr/bin/env bash
# RUOK SQLite container smoke test (WP09 / T036).
#
# Builds the production image from a clean context and verifies, in SQLite mode:
#   1. Image builds WITHOUT database access.
#   2. Container starts; /api/health (liveness) and /api/ready (readiness) 200.
#   3. Migration-only invocation runs with production dependencies.
#   4. A real goal (objective) write persists across a container restart.
#   5. The SQLite database file is written to the data volume.
#
# Usage:
#   bash tests/container/smoke-sqlite.sh
# Env overrides: RUOK_SMOKE_IMAGE, RUOK_SMOKE_PORT, RUOK_SMOKE_READY_TIMEOUT.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

NAME="ruok-smoke-sqlite"
VOL="$NAME-data"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"; smoke_cleanup "$NAME"' EXIT

echo "### [sqlite] building production image"
smoke_build

echo "### [sqlite] starting container (no SQLite filesystem pre-seeded)"
smoke_cleanup "$NAME"
docker run -d --name "$NAME" \
  -v "$VOL":/app/data \
  -e DATABASE_TYPE=sqlite \
  -e DATABASE_PATH=/app/data/okr.db \
  -e NODE_ENV=production \
  -p "$SMOKE_PORT":3000 \
  "$IMAGE_NAME"

echo "### [sqlite] waiting for readiness (/api/ready)"
wait_ready "$SMOKE_PORT"

echo "### [sqlite] liveness probe (/api/health)"
HEALTH=$(curl -s -w '\n%{http_code}' "http://127.0.0.1:${SMOKE_PORT}/api/health")
HEALTH_CODE=$(printf '%s' "$HEALTH" | tail -n1)
[ "$HEALTH_CODE" = "200" ] || { echo "FAIL health code=$HEALTH_CODE" >&2; exit 1; }
echo "    /api/health -> 200 ($(printf '%s' "$HEALTH" | head -n1))"

echo "### [sqlite] migration-only invocation (production deps)"
docker exec "$NAME" node build/db-migrate.mjs
echo "    migration-only invocation exit=0"

echo "### [sqlite] registering a user + creating an objective"
curl -sS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"smokeuser","password":"smokepass123"}' \
  "http://127.0.0.1:${SMOKE_PORT}/api/auth/register" >/dev/null
OBJECTIVE_RESP=$(curl -sS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"title":"WP09 Smoke Objective","level":"yearly","year":2026}' \
  "http://127.0.0.1:${SMOKE_PORT}/api/objectives")
OBJ_ID=$(json_field "$OBJECTIVE_RESP" 'JSON.parse(s).objective.id')
echo "    created objective id=$OBJ_ID"
[ -n "$OBJ_ID" ] || { echo "FAIL could not create objective" >&2; exit 1; }

echo "### [sqlite] confirming SQLite DB file exists in the data volume"
docker exec "$NAME" sh -c 'test -f /app/data/okr.db && echo "    /app/data/okr.db present"'
docker run --rm -v "$VOL":/data -e VOL="$VOL" alpine \
  sh -c 'test -f /data/okr.db && echo "    DB file persisted in volume '$VOL'"'

echo "### [sqlite] restarting container and verifying persistence"
docker restart "$NAME" >/dev/null
wait_ready "$SMOKE_PORT"
LIST_RESP=$(curl -sS -b "$COOKIE_JAR" "http://127.0.0.1:${SMOKE_PORT}/api/objectives")
if printf '%s' "$LIST_RESP" | grep -q "$OBJ_ID"; then
  echo "    objective $OBJ_ID persisted across restart"
else
  echo "FAIL objective $OBJ_ID NOT found after restart" >&2
  exit 1
fi

echo "### [sqlite] PASS"
echo "    image=$IMAGE_NAME port=$SMOKE_PORT"