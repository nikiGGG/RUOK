#!/usr/bin/env bash
# RUOK SQLite container smoke test (WP08 / T035-T038).
#
# Builds the production image from a clean context and verifies, in SQLite mode:
#   1. Image builds WITHOUT database access.
#   2. Container starts; /api/health (liveness) and /api/ready (readiness) 200.
#   3. Migration-only invocation runs with production dependencies.
#   4. A real objective (goal) write persists EXACTLY across a container restart
#      (authenticated exact id+title read on the SAME account).
#   5. The SQLite database file is written to the data volume.
#
# Truthful-oracle semantics (WP08):
#   * Readiness timeout, a failed health check, a missing objective, an empty
#     id, a non-201 create or a lost/drifted objective is FATAL (nonzero).
#   * After restart we RE-LOGIN with the same account (allowed), but we NEVER
#     re-create the objective. Persistence is proven by an exact read of the
#     ORIGINAL id+title — a recreation would mask a lost write.
#   * Local image id is labeled separately from any registry digest.
#
# Usage:
#   bash tests/container/smoke-sqlite.sh
# Env overrides: RUOK_SMOKE_IMAGE, RUOK_SMOKE_PORT, RUOK_SMOKE_READY_TIMEOUT.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_cmds

NAME="ruok-smoke-sqlite"
VOL="$NAME-data"
COOKIE_JAR="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$BODY"; smoke_cleanup "$NAME"' EXIT

OBJECTIVE_TITLE="WP08 SQLite Persistence Objective"
USERNAME="wp08sqlite"
PASSWORD="smokepass123"

echo "### [sqlite] building production image"
smoke_build
echo "    local image id=$(image_id) digest=$(image_digest)"

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
HEALTH=$(curl -s --connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time "$CURL_MAX_TIME" \
  -w '\n%{http_code}' "http://127.0.0.1:${SMOKE_PORT}/api/health")
HEALTH_CODE=$(printf '%s' "$HEALTH" | tail -n1)
[ "$HEALTH_CODE" = "200" ] || { echo "    FAIL health code=$HEALTH_CODE" >&2; exit 1; }
echo "    /api/health -> 200 ($(printf '%s' "$HEALTH" | head -n1))"

echo "### [sqlite] migration-only invocation (production deps)"
docker exec "$NAME" node build/db-migrate.mjs
echo "    migration-only invocation exit=0"

echo "### [sqlite] registering a user + creating an objective"
api_call POST "http://127.0.0.1:${SMOKE_PORT}/api/auth/register" "$COOKIE_JAR" "$BODY" \
  "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}"
assert_status 200 "register" || exit 1

api_call POST "http://127.0.0.1:${SMOKE_PORT}/api/objectives" "$COOKIE_JAR" "$BODY" \
  "{\"title\":\"$OBJECTIVE_TITLE\",\"level\":\"yearly\",\"year\":2026}"
assert_status 201 "objective create" || exit 1
OBJ_ID="$(json_field_file "$BODY" 'JSON.parse(s).objective.id' 2>/dev/null || true)"
[ -n "$OBJ_ID" ] || { echo "    FAIL could not create objective (empty id)" >&2; exit 1; }
echo "    created objective id=$OBJ_ID title='$OBJECTIVE_TITLE'"

echo "### [sqlite] confirming SQLite DB file exists in the data volume"
docker exec "$NAME" sh -c 'test -f /app/data/okr.db && echo "    /app/data/okr.db present"'

echo "### [sqlite] restarting container and verifying EXACT persistence"
docker restart "$NAME" >/dev/null
wait_ready "$SMOKE_PORT"

# Re-login with the same account after restart (allowed). We do NOT recreate the
# objective — persistence is proven by the exact id+title read below.
api_call POST "http://127.0.0.1:${SMOKE_PORT}/api/auth/login" "$COOKIE_JAR" "$BODY" \
  "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}"
assert_status 200 "re-login after restart" || exit 1

exact_read_objective "http://127.0.0.1:${SMOKE_PORT}" "$COOKIE_JAR" "$OBJ_ID" "$OBJECTIVE_TITLE"

echo "### [sqlite] PASS"
echo "    image=$IMAGE_NAME port=$SMOKE_PORT local_image_id=$(image_id)"