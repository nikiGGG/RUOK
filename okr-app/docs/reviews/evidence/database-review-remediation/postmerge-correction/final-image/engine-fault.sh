#!/usr/bin/env bash
# Disposable live-container fault injector for replaying WP08 sensitivity checks.
# No application source or image is modified. Never echo command arguments.
set -euo pipefail
REAL_ENGINE="${RUOK_WP08_REAL_ENGINE:-/usr/bin/podman}"
if [ "${1:-}" = build ] && [ "${RUOK_WP08_BASELINE:-0}" = 1 ]; then
  echo 'Controlled baseline: reuse the already built production image'
  exit 0
fi
"$REAL_ENGINE" "$@"
if [ "${1:-}" = restart ]; then
  case "${RUOK_WP08_FAULT:-}" in
    lost-write)
      "$REAL_ENGINE" exec "$2" node --input-type=module -e '
        if(process.env.DATABASE_TYPE === "postgres") {
          const {Pool}=await import("pg");
          const pool=new Pool({connectionString:process.env.DATABASE_URL});
          try { await pool.query("DELETE FROM objectives"); } finally { await pool.end(); }
        } else {
          const {default:Database}=await import("better-sqlite3");
          const db=new Database(process.env.DATABASE_PATH);
          try { db.prepare("DELETE FROM objectives").run(); } finally { db.close(); }
        }
        console.error("CONTROL: objective rows deleted after restart");'
      ;;
    never-ready)
      "$REAL_ENGINE" stop --time 1 "$2" >/dev/null
      echo 'CONTROL: application stopped after restart; readiness cannot succeed' >&2
      ;;
  esac
fi
