# RUOK container smoke tests (WP09 / T036)

These scripts build the **production Docker image** from a clean build context and
run it exactly like a real deployment, recording exact commands and exit codes.

## Requirements

- Docker engine with classic `docker build` (no `buildx` required).
- `curl` and `node` on the host (used to probe the container and parse JSON).
- A free local port (default `3180`, override with `RUOK_SMOKE_PORT`).

## SQLite smoke test

Builds the image, starts it in SQLite mode with a data volume, and verifies:
liveness (`/api/health`) + readiness (`/api/ready`), the migration-only
invocation (`node build/db-migrate.mjs`) with production deps, a real goal
(objective) write, a container restart, and persistence of both the objective
and the SQLite file in the volume.

```bash
bash tests/container/smoke-sqlite.sh
```

## PostgreSQL smoke test

Builds the **same image** and starts it in PostgreSQL mode with **no SQLite
volume** (PostgreSQL does not require a SQLite filesystem). It always verifies
that the container liveness probe returns 200 and that `/api/ready` reports
503 (not ready, **no SQLite fallback**) when the external database is
unreachable.

A live PostgreSQL is normally only present in CI. When a reachable
`DATABASE_URL` is supplied, the script additionally runs the migration-only
invocation and a full goal write + restart persistence scenario:

```bash
# Reachability / no-SQLite-dependency check (no DB required):
bash tests/container/smoke-postgres.sh

# Full live flow (requires a reachable PostgreSQL):
DATABASE_URL=postgresql://user:pass@host:5432/ruok \
  bash tests/container/smoke-postgres.sh
```

### Verified TLS (optional)

Place the CA certificate in `okr-app/secrets/ca.pem` and set
`DATABASE_SSL_MODE=verify-full` + `DATABASE_SSL_CA_FILE=/run/secrets/ca.pem`.
See the `Verified TLS` section in `okr-app/compose.postgres.yml`.

## Host-level production-runtime smoke (no Docker needed)

When Docker cannot build the image (e.g. the container's outbound network is
blocked — no Alpine apk repos, no npm registry in-container), the same compiled
production runtime the image runs can be exercised directly on the host with:

```bash
npm run build   # produces build/ + build/db-migrate.mjs
bash tests/container/smoke-host-sqlite.sh
```

This verifies the migration-only invocation, `/api/health`, `/api/ready`, a real
goal write, a restart and persistence — the exact lifecycle the image runs.

## Notes on the build

- The build uses the committed `package-lock.json` (`npm ci`) and never opens
  or creates a database or requires network credentials.
- Both migration histories (`drizzle/`, `drizzle-postgres/`) and the compiled
  migration entrypoint (`build/db-migrate.mjs`) are copied into the image.
- Native modules (`better-sqlite3`, `bcrypt`) compile from source on Alpine;
  if the build fails under emulation/architecture constraints on a non-native
  host, the scripts report the failure rather than masking it.
- arm64 images require validating the native modules build and run for arm64.