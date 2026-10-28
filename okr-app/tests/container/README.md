# RUOK container smoke tests (WP08 / T035-T038)

These scripts build the **production Docker image** from a clean build context and
run it exactly like a real deployment, recording exact commands, exit codes and
image identity so the result is auditable and reproducible.

## Requirements

- Docker engine with classic `docker build` (no `buildx` required).
- `curl` and `node` on the host (used to probe the container and parse JSON).
- A free local port (default `3180`, override with `RUOK_SMOKE_PORT`).
- For the PostgreSQL smoke: an explicit, reachable `DATABASE_URL` (see below).

## Exit semantics

Every script is a **truthful oracle**. It exits **nonzero** whenever:

- readiness (`/api/ready`) does not become HTTP 200 within
  `RUOK_SMOKE_READY_TIMEOUT` (default 120s) — a **never-ready** control;
- an HTTP request fails or times out (every request is bounded by
  `RUOK_SMOKE_CURL_MAX_TIME`, default 5s);
- a JSON response cannot be parsed or yields an empty objective id;
- an objective write does not return the expected status;
- the objective is **lost or drifted after restart** — persistence is proven by
  an exact authenticated read of the **original id + title**. A warning is never
  followed by PASS; any of the above aborts the run with a clear, redacted
  diagnostic.

No password, session cookie jar or credential-bearing URL is ever printed.

## Probe expectations

| Endpoint | Behavior |
|---|---|
| `GET /api/health` | Liveness. HTTP 200 `{status:"ok", uptime}` regardless of database state. |
| `GET /api/ready` | Readiness. HTTP 200 `{ready:true, dialect, open, schemaVersion}` only when the selected backend is open **and** migrated/verified and answers a bounded live query; otherwise HTTP 503 `{ready:false, ...}`. |

When the backend cannot become ready (e.g. an unreachable database), `/api/ready`
stays at 503 and the script exits nonzero after the readiness timeout.

## SQLite smoke test

Builds the image, starts it in SQLite mode with a data volume, and verifies:
liveness + readiness, the migration-only invocation (`node build/db-migrate.mjs`)
with production deps, a real objective write, a container restart, a re-login
with the same account (no re-create), and **exact persistence** of the objective
(id + title) plus the SQLite file in the volume.

```bash
bash tests/container/smoke-sqlite.sh
```

## PostgreSQL smoke test

Builds the **same image** and starts it in PostgreSQL mode with **no SQLite
volume**. It asserts there is **no SQLite file/volume dependency**, then runs a
full objective write → restart → exact-read persistence journey against the live
database.

A live `DATABASE_URL` is **required** for the full run. If it is absent the script
exits nonzero as a missing prerequisite — it never degrades to a warning-then-PASS
reachability probe.

```bash
DATABASE_URL=postgresql://user:pass@host:5432/ruok \
  bash tests/container/smoke-postgres.sh
```

### Reaching a database from inside the container

The smoke container runs on the default bridge network. To reach a PostgreSQL
published on the host loopback, add a host-gateway mapping and target
`host.docker.internal`:

```bash
DATABASE_URL=postgresql://postgres@host.docker.internal:55432/ruok_smoke \
  bash tests/container/smoke-postgres.sh
```

(The scripts run `docker run` without a host-gateway flag by default; pass the
mapping through the container run if your database is only reachable via the
host network.)

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
objective write, a restart, a re-login and **exact persistence** — the lifecycle
the image runs.

## Image identity

Each run records the **local image id** (`docker inspect .Id`) separately from
any **registry digest** (`RepoDigests`, empty when the image was only built
locally). A registry digest is only reported when the image actually has one;
never conflate a local id with a published digest.

## Stop rule (image download blocker)

If **any** Docker image required to build or run a check cannot be downloaded
(e.g. a base image pulled during `docker build`), stop all mission work
immediately, report the exact image/tag/digest, registry, attempted command and
redacted error, and ask the operator for help. Never substitute an image or
alter proxy/TLS/network settings; record the check blocked rather than PASS.

## Notes on the build

- The build uses the committed `package-lock.json` (`npm ci`) and never opens
  or creates a database or requires network credentials.
- Both migration histories (`drizzle/`, `drizzle-postgres/`) and the compiled
  migration entrypoint (`build/db-migrate.mjs`) are copied into the image.
- Native modules (`better-sqlite3`, `bcrypt`) compile from source on Alpine;
  if the build fails under emulation/architecture constraints on a non-native
  host, the scripts report the failure rather than masking it.
- arm64 images require validating the native modules build and run for arm64.