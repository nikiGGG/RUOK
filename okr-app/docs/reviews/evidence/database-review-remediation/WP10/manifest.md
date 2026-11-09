# WP10 — Isolate all SQLite execution — evidence manifest

Mission: `database-review-findings-remediation-01M5TGCE`
WP: WP10 (FR-003, FR-006, FR-008 / NFR-001, NFR-002, NFR-004; U1; D-07–D-09)
Execution agent profile: node-norris (implementer)
Date: 2026-10-28 (UTC runs below)
Environment: darwin, Node v22.20.0, npm 11.6.4
Drivers: better-sqlite3 12.5.0, drizzle-orm 0.45.1, esbuild 0.27.2, vitest 5.0.3
Source revision (HEAD, lane-j before WP10 commit): `81307d67d39201c3e851b5bc1f2cac383948d556`
Dirty diff at capture: none (all changes staged below by the WP10 commit)

Source checksums (SHA-256): see `checksums.txt` (same directory).

## What changed

Isolates ALL synchronous SQLite execution — ordinary application reads/writes,
atomic operations, backup export/restore, handle open/close — off the HTTP event
loop and out of the server bundle, behind the unchanged awaitable
`DatabaseServices` facade. No better-sqlite3 call runs on the HTTP thread.

- `src/lib/db/adapters/sqlite-worker-protocol.ts` (new): typed, structured-clone
  transport (generation + requestId, allowlisted method, Date/Map/null/undefined
  preserved). Statically enumerated `REPO_METHODS` allowlist covering every
  contract method; `SERVICE_METHODS` for lifecycle/atomic/availability;
  `MAX_ORDINARY_QUEUE=128` and `AVAILABILITY_TIMEOUT_MS=3000`.
- `src/lib/db/adapters/sqlite-local.ts` (new): the worker-private synchronous
  engine (the SQL/transaction implementation moved verbatim from `sqlite.ts`,
  class renamed `SqliteLocalServices`) plus a typed `dispatch` allowlist and a
  live `checkAvailability` query. Imported ONLY by the worker threads.
- `src/lib/db/adapters/sqlite-worker.ts` (new): runtime worker thread owning the
  sole SQLite handle; serialized command execution; posts redacted errors.
- `src/lib/db/adapters/sqlite-worker-client.ts` (new): the public async
  `SqliteDatabaseServices` facade — forwards every command to the worker via
  structured clone; bounded queue; coalesced readiness with a 3s host deadline;
  generation fencing; graceful close (worker `closed` ack) that never
  force-terminates mid native call. Also exports `runSqlitePreparation` and the
  dev/Vitest on-demand worker bundler (`resolveWorkerEntry`).
- `src/lib/db/adapters/sqlite-preparation-worker.ts` (new): separate preparation
  worker that runs WP03 migrate/verify and closes before the runtime worker opens.
- `src/lib/db/adapters/sqlite.ts`: now a facade re-export (no synchronous engine;
  the old inline SQL path moved to `sqlite-local.ts`).
- `scripts/build-database-workers.ts` (new): esbuild bundling of the worker
  entries into `build/workers/*.mjs` (`packages: external` keeps better-sqlite3
  as a runtime import, never in the HTTP bundle).
- `vite.config.ts`: emits worker assets through the existing Vite build
  (`closeBundle` hook, `apply: 'build'`).
- `Dockerfile`: comment documenting that `build/` (incl. `build/workers/`) is
  copied into the production image unchanged.
- `tests/db/sqlite-worker.test.ts` (new): protocol/isolation/lock/backpressure/
  packaging regressions (13 tests).

## Executed runs

### WP10 focused suite — PASS (exit 0)

Command (workdir `okr-app/`):
```
./node_modules/.bin/vitest run tests/db/sqlite-worker.test.ts
```
Result: `13 passed (13)` — exit 0. Covers T044 protocol value-types + allowlist
denial/coverage, T045 facade parity + verify-no-file + PostgreSQL-no-worker,
T046/T048 lock isolation + readiness + overflow + shutdown, T047 packaging.

### Full SQLite DB suite (through the facade) — PASS (exit 0)

Command (workdir `okr-app/`): `DB_BACKEND=sqlite npm run test:db:sqlite`
Result: `11 passed (11)`, `77 passed (77)` — exit 0. Every existing contract,
domain, backup and atomic regression now runs through the worker facade with
unchanged SQL and data.

### Main validation `npm test` — PASS (exit 0)

Command (workdir `okr-app/`): `npm test`
Result: `18 passed (18)`, `144 passed (144)` — exit 0.

### Production build emits worker assets — PASS (exit 0)

Command (workdir `okr-app/`): `npm run build`
Result: built in 5.38s; `build/workers/runtime.mjs` + `build/workers/preparation.mjs`
emitted inside `build/`, copied by the Dockerfile with the rest of `build/`.
No database was opened during build.

### Diff-scoped type-check — PASS (no new errors)

Command (workdir `okr-app/`): `npx tsc --noEmit`
Result: 4 pre-existing errors in `src/lib/server/ai/providers.ts` and
`src/lib/server/plugins/oura.ts` (historical UI debt, not WP10 files); zero
errors in any WP10-owned file.

## Baseline / fault / fixed

The isolation property is proven by a real external write lock:
- **Baseline (pre-WP10)**: a synchronous better-sqlite3 write on the HTTP thread
  blocks event-loop timers for the whole busy timeout.
- **Fixed (WP10)**: a worker-owned write blocked by the same lock leaves host
  `setTimeout` timers responsive (measured delay ~100 ms on a 100 ms timer,
  asserted < 500 ms) and readiness times out truthfully (~3 s) then recovers
  immediately after lock release. See `lock-regression-capture.json`.

## Isolation proof (grep)

- `better-sqlite3` static import exists ONLY in `sqlite-local.ts`.
- `sqlite-local.ts` is imported ONLY by `sqlite-worker.ts` (worker bundle).
- The HTTP/server bundle never imports `sqlite-local`; `sqlite.ts` is a facade
  re-export of `sqlite-worker-client.ts`.
- `build/workers/runtime.mjs` (external import `import Database from "better-sqlite3"`).

## PENDING (live-only, requires infra not present)

None for WP10's runtime-isolation contract. The PostgreSQL-side availability and
the same-PID HTTP probe trace (health/readiness via actual HTTP with unchanged
PID) are owned by WP04/WP06, which run after WP10; no Docker image pull is
required by WP10 and no live PostgreSQL server was needed for the executed
SQLite-isolation runs above.