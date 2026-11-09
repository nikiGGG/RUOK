# WP10 — Cycle 2 evidence manifest (review remediation: wire SQLite into worker lifecycle)

Mission: `database-review-findings-remediation-01M5TGCE`
WP: WP10 (isolation of all SQLite execution off the HTTP/main thread)
Cycle: 2 (review remediation for reviewer-feedback-1, verdict REJECT)
Date: 2026-10-28
Environment: darwin, Node v22.20.0, npm 11.6.4
Drivers: better-sqlite3 12.5.0, drizzle-orm 0.45.1, esbuild 0.27.2, vitest 5.0.3
Base commit (cycle 1, lane-j): `768b59067d754f2a716066dcc13cca156580be5b`
Dirty diff at capture: none (all changes below staged by the WP10 cycle-2 commit)

Source checksums (SHA-256): see `checksums-cycle2.txt` (same directory).

## Issue 1 — Main-thread SQLite migration/init now runs in the preparation worker

Previously the production startup path `src/lib/server/database.ts` →
`openDatabase()` (`src/lib/db/lifecycle.ts`) → `migrateDatabase(...)`
(`src/lib/db/migrations/migrate.ts`) → `new Database(config.path)` ran
better-sqlite3 synchronously on the HTTP/main thread, and `runSqlitePreparation`
was dead code in production.

Changes:
- `src/lib/db/lifecycle.ts`: `openDatabase` no longer statically imports or calls
  `migrateDatabase`. For BOTH backends it routes the migrate/verify step through
  the existing preparation worker via the new generic `runPreparation(...)`, the
  single lifecycle boundary through which migrations are reached. The main/HTTP
  thread never runs the SQLite driver or the dialect migration runners.
- `src/lib/db/adapters/sqlite-worker-client.ts`: added generic
  `runPreparation(config: DatabaseConfig, options)` (SQLite + PostgreSQL) and
  kept `runSqlitePreparation` as a thin SQLite-only alias (tests unchanged).
- `src/lib/db/adapters/sqlite-preparation-worker.ts`: preparation command now
  accepts a generic `DatabaseConfig` (it already invoked the canonical
  `migrateDatabase`, which handles both backends).
- `src/lib/db/adapters/sqlite.ts`: re-exports `runPreparation` alongside the
  facade.
- `src/lib/db/migrations/migrate.ts`: the `better-sqlite3` value import became a
  lazy `await import('better-sqlite3')` inside the SQLite branches only, so the
  module never pulls the driver into a bundle that runs only the postgres path.
- `src/lib/db/migrations/expected-sqlite.ts`: the `better-sqlite3` value import
  became a lazy `createRequire`-based resolution inside `buildReferenceDb`
  (kept synchronous; behavior unchanged).

Build proof (see `bundle-isolation-grep.txt`): `better-sqlite3`, `new Database(`,
`runSqliteMigrations` and `fileMustExist` are ABSENT from every file under
`.svelte-kit/output/server/` (grep -rl exit 1 = no matches), and present only in
the worker bundles `build/workers/preparation.mjs` and `build/workers/runtime.mjs`
(as `packages: external` runtime imports). The four main-thread bundles the
reviewer flagged — `chunks/lifecycle.js`, `chunks/database.js`,
`entries/hooks.server.js`, `entries/endpoints/api/ready/_server.ts.js` — each
have 0 matches for `better-sqlite3`/`new Database(`.

## Issue 2 — Real lifecycle-path regression test added

`tests/db/lifecycle-isolation.test.ts` (new): exercises the REAL `openDatabase`
startup path with a SQLite backend and asserts the isolation contract holds
end-to-end:
- `vi.mock('better-sqlite3', () => { throw ... })` — if any regression routes
  migration back through `migrateDatabase` on the calling thread, importing the
  driver on the main thread throws and fails the test. Worker threads load the
  real driver, so the test is unaffected by the mock.
- openDatabase returns ready: `getReadiness().ready === true`, `dialect ===
  'sqlite'`, `schemaVersion > 0` (proves migration ran through the worker), DB
  file exists.
- openDatabase is idempotent; readiness stays true while open; close works.

`package.json` was updated so this regression test runs in the standard CI
suites: `tests/db/lifecycle-isolation.test.ts` was added to the `test` and
`test:db:sqlite` scripts, plus a dedicated `test:db:isolation` script.

## Executed runs (cycle 2)

All PASS (exit 0). See `validation-transcript-cycle2.txt` for raw output.

- `npx vitest run tests/db/sqlite-worker.test.ts` — 13 passed (13).
- `DB_BACKEND=sqlite npm run test:db:sqlite` — 12 files / 79 passed.
- `npm test` — 19 files / 146 passed.
- `npm run build` — exit 0; emits `build/workers/runtime.mjs` +
  `build/workers/preparation.mjs`.
- `npx tsc --noEmit` — 0 errors in any changed file (4 pre-existing errors remain
  in `src/lib/server/ai/providers.ts` and `src/lib/server/plugins/oura.ts`,
  unrelated historical UI debt).

## Residual notes

- PostgreSQL migration also now runs through the preparation worker (same worker
  boundary). Postgres integration tests are `describe.skip` without a live PG
  (`RUOK_TEST_PG_ADMIN_URL`) and are not part of the validation commands above;
  the SQLite isolation contract is unchanged and fully exercised.