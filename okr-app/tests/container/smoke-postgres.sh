#!/usr/bin/env bash
# RUOK PostgreSQL container smoke test (WP08 / T035-T038).
#
# Builds the production image from a clean context and verifies, in PostgreSQL
# mode, that a real objective write persists EXACTLY across a container restart:
#   1. Image builds WITHOUT database access (same image as SQLite).
#   2. The container starts with NO SQLite data volume and creates NO SQLite
#      file — PostgreSQL does not require a SQLite filesystem (no-SQLite-
#      dependency assertion via absence of /app/data/okr.db).
#   3. Given an explicit live `DATABASE_URL`, migrations + a real objective
#      write/restart/exact-read persistence scenario run.
#
# Truthful-oracle semantics (WP08):
#   * A live `DATABASE_URL` is REQUIRED for the full run. If it is absent the
#     script exits NONZERO as a missing prerequisite — it never degrades to a
#     warning-then-PASS reachability probe.
#   * Readiness timeout, non-201 create, empty id, and a lost/drifted objective
#     are FATAL (nonzero). After restart we RE-LOGIN (allowed) but NEVER re-
#     create the objective; persistence is proven by exact id+title read.
#   * Local image id is labeled separately from any registry digest.
#
# Usage:
#   DATABASE_URL=postgresql://... bash tests/container/smoke-postgres.sh
# Env overrides: RUOK_SMOKE_IMAGE, RUOK_SMOKE_PORT, RUOK_SMOKE_READY_TIMEOUT.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_cmds

# A live PostgreSQL URL is a hard prerequisite for the full run.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "    FAIL: DATABASE_URL is required for the PostgreSQL smoke run." >&2
  echo "    Set DATABASE_URL=postgresql://user:pass@host:5432/ruok (no password will be printed)." >&2
  exit 1
fi

NAME="ruok-smoke-postgres"
COOKIE_JAR="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$BODY"; smoke_cleanup "$NAME"' EXIT

OBJECTIVE_TITLE="WP08 Postgres Persistence Objective"
USERNAME="wp08pg"
PASSWORD="smokepass123"

echo "### [postgres] building production image (same image as SQLite)"
smoke_build
echo "    local image id=$(image_id) digest=$(image_digest)"

echo "### [postgres] starting container (NO SQLite volume, external DB)"
smoke_cleanup "$NAME"
docker run -d --name "$NAME" \
  -e DATABASE_TYPE=postgres \
  -e DATABASE_URL="$DATABASE_URL" \
  -e DATABASE_CONNECT_TIMEOUT_MS=3000 \
  -e NODE_ENV=production \
  -p "$SMOKE_PORT":3000 \
  "$IMAGE_NAME"

echo "### [postgres] verifying NO SQLite filesystem dependency"
if docker exec "$NAME" sh -c 'test ! -e /app/data/okr.db'; then
  echo "    /app/data/okr.db ABSENT — no SQLite file/volume required"
else
  echo "    FAIL: SQLite file present in postgres mode" >&2
  exit 1
fi

echo "### [postgres] waiting for readiness (/api/ready)"
wait_ready "$SMOKE_PORT"

echo "### [postgres] migration-only invocation (production deps)"
docker exec "$NAME" node build/db-migrate.mjs
echo "    migration-only invocation exit=0"

echo "### [postgres] registering a user + creating an objective"
api_call POST "http://127.0.0.1:${SMOKE_PORT}/api/auth/register" "$COOKIE_JAR" "$BODY" \
  "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}"
assert_status 200 "register" || exit 1

api_call POST "http://127.0.0.1:${SMOKE_PORT}/api/objectives" "$COOKIE_JAR" "$BODY" \
  "{\"title\":\"$OBJECTIVE_TITLE\",\"level\":\"yearly\",\"year\":2026}"
assert_status 201 "objective create" || exit 1
OBJ_ID="$(json_field_file "$BODY" 'JSON.parse(s).objective.id' 2>/dev/null || true)"
[ -n "$OBJ_ID" ] || { echo "    FAIL could not create objective (empty id)" >&2; exit 1; }
echo "    created objective id=$OBJ_ID title='$OBJECTIVE_TITLE'"

echo "### [postgres] restarting container and verifying EXACT persistence"
docker restart "$NAME" >/dev/null
wait_ready "$SMOKE_PORT"

# Re-login with the same account after restart (allowed). We do NOT recreate the
# objective — persistence is proven by the exact id+title read below.
api_call POST "http://127.0.0.1:${SMOKE_PORT}/api/auth/login" "$COOKIE_JAR" "$BODY" \
  "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}"
assert_status 200 "re-login after restart" || exit 1

exact_read_objective "http://127.0.0.1:${SMOKE_PORT}" "$COOKIE_JAR" "$OBJ_ID" "$OBJECTIVE_TITLE"

echo "### [postgres] PASS"
echo "    image=$IMAGE_NAME port=$SMOKE_PORT local_image_id=$(image_id)"