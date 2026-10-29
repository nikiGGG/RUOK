# WP10 Review Feedback 1 — SQLite execution isolation (REJECT)

Verdict: **Changes requested.** Commit `768b590` (lane-j) implements the worker
infrastructure well, but the core isolation contract is NOT met: synchronous
SQLite migration/initialization still executes on the HTTP/main thread and the
SQLite driver is statically bundled into the main-thread server bundle.

## Issue 1 (BLOCKING): Migration/initialization path still runs better-sqlite3 on the HTTP/main thread

The production startup path is `src/lib/server/database.ts` →
`openDatabase()` (`src/lib/db/lifecycle.ts`) → `migrateDatabase(resolved, opts)`
(`src/lib/db/migrations/migrate.ts`) → `new Database(config.path)` (better-sqlite3)
+ `runSqliteMigrations(...)`, all **synchronously on the calling (HTTP/main) thread**.

WP10's own `runSqlitePreparation` (the separate preparation worker required by
T045) is never wired into this lifecycle path. It is **dead code in production** —
its only call sites are tests (`tests/db/sqlite-worker.test.ts`).

Evidence (from a real `npm run build` of this branch):
- `better-sqlite3` and `new Database(` call sites are statically present in the
  main-thread server bundle: `.svelte-kit/output/server/chunks/lifecycle.js`,
  `.svelte-kit/output/server/chunks/database.js`,
  `.svelte-kit/output/server/entries/hooks.server.js`,
  `.svelte-kit/output/server/entries/endpoints/api/ready/_server.ts.js`.
- `lifecycle.js` also contains the migration code (`runSqliteMigrations`,
  `fileMustExist`), i.e. the SQLite migrate/verify runner is reachable from the
  main thread.

This violates the core contract of this review and WP10's objective
("Keep every synchronous SQLite operation, including ... **initialization**,
off the HTTP event loop") and T045's boundary ("no SQLite I/O occurs on import
or HTTP thread").

Required fix: route the SQLite migrate/verify step in `openDatabase` through
`runSqlitePreparation` (so it runs in the preparation worker), and ensure
better-sqlite3 / `migrations/migrate.ts` + `migrations/expected-sqlite.ts` are
NOT statically reachable from the main-thread server bundle. Coordinate file
ownership if `lifecycle.ts` is not WP10-owned (note the `ACTIVE_WP_SCOPE_VIOLATION`
advisory already flagged for `sqlite-preparation-worker.ts`); either wire it here
with a coordination note, or explicitly hand the wiring to WP04 and add a
lifecycle-path regression test that proves no driver call occurs on the main
thread.

Note: the review-task premise "`sqlite-local.ts` is the only better-sqlite3
importer" is incorrect. `src/lib/db/migrations/migrate.ts` and
`src/lib/db/migrations/expected-sqlite.ts` also import better-sqlite3 at runtime
and are statically reachable from the main-thread lifecycle. `sqlite-local.ts`
itself is correctly imported only by the worker (`sqlite-worker.ts`).

## Issue 2 (BLOCKING): No test exercises the real lifecycle/openDatabase isolation

The passing tests (`sqlite-worker.test.ts`, `DB_BACKEND=sqlite` suite) exercise
the facade directly via `runSqlitePreparation(...)` + `SqliteDatabaseServices.open()`,
bypassing `openDatabase()`/`migrateDatabase()`. Therefore they do NOT catch the
Issue-1 violation (the very thing WP10 exists to guarantee). Add a test that goes
through the real `openDatabase`/lifecycle path with a SQLite config and asserts
no better-sqlite3 synchronous call runs on the main thread / is bundled in the
server output.

## Anti-pattern checklist summary

1. Dead code — **FAIL**: `runSqlitePreparation` has no production caller.
2. Synthetic-fixture — PASS: tests invoke real facade→worker code.
3. Silent empty return — PASS: availability `false` on timeout/closed is documented.
4. FR coverage — **PARTIAL**: NFR-001/NFR-002 (isolation off the event loop) not
   tested through the real lifecycle path.
5. Frozen surface — PASS: no frozen files modified.
6. Locked decision — **FAIL**: main-thread SQLite migration contradicts the
   MUST-NOT isolation contract.
7. Shared-file ownership — the worker files are in `owned_files`; `lifecycle.ts`
   wiring needs ownership coordination.
8. Production fragility — PASS for worker side; the un-isolated migrate path is
   the residual risk (see Issue 1).

## What is good (keep on rebase)

- Worker protocol: typed allowlist (`REPO_METHODS`), structured-clone value
  preservation (Date/Map/null/undefined), generation fencing, redacted errors.
- Runtime worker: serialized execution, preserved busy timeout (>5s), stale
  generation rejection, graceful close.
- Client facade: bounded ordinary queue (MAX_ORDINARY_QUEUE=128), coalesced
  availability with 3s host deadline, generation fence + no replay on close/crash.
- `sqlite-local.ts` imported only by worker files.
- Tests pass: `vitest run tests/db/sqlite-worker.test.ts` → 13 passed (exit 0);
  `DB_BACKEND=sqlite` suite → 76 passed (exit 0).
- `npm run build` → exit 0, emits `build/workers/runtime.mjs` +
  `build/workers/preparation.mjs`.
- Dockerfile change is comment-only; no workflow/CI/repo-setting changes.