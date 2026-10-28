# WP07 — Verify scheduler query friend and AI paths

Evidence manifest for WP07 (`database-review-findings-remediation-01M5TGCE`).

- WP: WP07 (phase: Application remediation)
- Focus: scheduler persistence + lifecycle, QuickJS async query bridge, saved
  queries, friend dashboard and AI-tool persistence exercised through REAL
  application entrypoints on both real databases; a controlled broken-bridge
  fault that demonstrably fails the targeted async test.
- Requirement refs: FR-005, FR-008, NFR-001, NFR-004.
- Inspected baseline: `0572599edc3e79dded5893aaaaef6867394a5288`
  (historical review `okr-app/docs/reviews/sqlite-postgresql-support-2026-10-26.md`).
- Source revision at implementation time: `2c74063af99e155dee4e933f2256831ea6b294e7`.

## Environment (all runs)

| Item | Value |
|---|---|
| Node | v22.20.0 |
| npm | 11.6.4 |
| Vitest | 5.0.3 |
| better-sqlite3 | 12.5.0 |
| pg | 8.23.1 |
| drizzle-orm | 0.45.1 |
| OS | darwin-arm64 |
| Backend (executed) | real SQLite through the WP10 worker facade + real migrated in-process SQLite; real PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2 on aarch64) on `127.0.0.1:55432` |
| Docker | none pulled (C-007 image rule respected); PG18 container already running, re-used unchanged |
| PostgreSQL live closure | `RUOK_TEST_PG_ADMIN_URL=postgres://postgres@127.0.0.1:55432/postgres` (passwordless trust auth) — PASS below |

## Code changes (this WP)

- `okr-app/src/lib/server/plugins/scheduler.ts` — T030 lifecycle repair: the
  initial one-shot sync timeout is now tracked (`schedulerTimeout`) and cleared
  by `stopScheduler`, and `startScheduler` clears any stale pending one-shot on
  (re)start so shutdown/recovery creates no duplicate timers. `startScheduler`
  gained an optional `initialDelayMs` so the scheduled callback can be driven
  deterministically in tests (no public trigger-test endpoint was added).
- `okr-app/tests/application/plugin-fixture.ts` — deterministic `DataImportPlugin`.
- `okr-app/tests/application/integrations.suite.ts` — the integration suite.
- `okr-app/tests/application/integrations.sqlite.test.ts` /
  `okr-app/tests/application/integrations.postgres.test.ts` — live entry points
  (backend selection mandatory). Postgres entry was structurally complete but
  recorded PENDING (no local PG admin URL at the time), never SQLite-substituted.
- `okr-app/tests/application/integrations.suite.ts` — cycle-2 fix: the audit-log
  assertion `expect(logs[0].success).toEqual(1)` was backend-specific. `success`
  is an `integer(...,{mode:'boolean'})` column: the raw `better-sqlite3` driver
  reads it back as integer `1` on SQLite, while the `pg` driver returns JS
  `true` on Postgres. Changed to `expect(logs[0].success).toBeTruthy()` — the
  row is persisted correctly on both backends and the assertion still verifies a
  successful query was recorded. This makes both backend entries pass.

## Runs

### Fixed run — SQLite application integration suite (exit 0)

Command (from `okr-app/`): `DB_BACKEND=sqlite npx vitest run tests/application/integrations.sqlite.test.ts`
Result: 1 file passed, 8 tests passed, exit 0. Full output: `run-transcript.txt`.

Coverage (real HTTP against the BUILT server + real in-process DB):

- **T030 scheduler**: the real scheduled callback (`runScheduledSync` via the
  initial one-shot) drove the deterministic plugin through the manager into the
  typed repositories on a real migrated SQLite DB — imported
  `testimport.steps=12345` daily metric value and `plugins.last_sync` set.
  Lifecycle: start → double-start guarded → stop → restart works, no duplicate
  timers; stop clears both the interval and the pending one-shot.
- **T031 QuickJS async**: `POST /api/queries/execute` ran Promise-based
  `await q.objectives({year})` against seeded data, returning exact `result`
  `['Query Target']`, `progressValue 0.5`, a `table` render, and a persisted
  `query_execution_logs` row (`success=1`). Isolation: a second user's identical
  query returned `[]` (no foreign data).
- **T032 saved queries + friends**: create/list/update/run of a saved query via
  real routes with durable stored code; ownership denials (Bob 404 / empty list);
  friend request → accept → dashboard 200; stranger dashboard/notes 403; notes
  are per-author.
- **T033 AI tools**: `POST /api/ai/tool` `create_objective` persisted (visible
  via objectives route and DB); foreign-ID `create_key_result` and
  `update_objective` denied (400) with other accounts unchanged; unauthenticated
  call denied (401).
- **T034 bridge sensitivity**: controlled fault below.

### Fixed run — PostgreSQL application integration suite (exit 0)

Command (from `okr-app/`):
```
RUOK_TEST_PG_ADMIN_URL='postgres://postgres@127.0.0.1:55432/postgres' \
DB_BACKEND=postgres npx vitest run tests/application/integrations.postgres.test.ts
```
Result: 1 file passed, 8 tests passed, exit 0. Full output:
`postgres-run-transcript.txt`. Revision exercised: `b646c73`.

PostgreSQL version under test: `PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2) on
aarch64-unknown-linux-gnu` (passwordless trust auth, role `postgres` =
superuser/CREATEDB, container at `127.0.0.1:55432` already running and re-used
unchanged — no image pulled, substituted, or substituted-back, C-007).

The exact same 8 application scenarios (T030 scheduler persistence + lifecycle,
T031 QuickJS async bridge, T032 saved queries + friends, T033 AI tools, T034
fault sensitivity) run green against the built server + real migrated Postgres:

- T031 audit-log row `query_execution_logs.success` reads back as JS `true` on
  Postgres (`pg` driver) vs integer `1` on SQLite (`better-sqlite3`). The
  assertion is now backend-agnostic (`expect(logs[0].success).toBeTruthy()`),
  so it passes on both without weakening the intent — the row still records a
  successful query.
- T030 scheduler drove the deterministic plugin through the manager into real
  migrated Postgres repositories (`testimport.steps=12345`, `last_sync` set);
  stop clears both interval and one-shot, restart creates no duplicate timers.
- T032 ownership/privacy (404/403), per-author notes, foreign-ID and
  unauthenticated denials all hold on Postgres.

This closes the previously-PENDING live-Postgres entry to PASS.

### Controlled fault — broken async bridge (T034)

Performed on an isolated source copy of `executor.ts` (`fetchObjectives`
always resolves `[]`), then restored and re-run green. `fault1-bridge.patch`,
`fault1-failing.txt`, `fault1-passing.txt`.

| Fault | Removed behavior | Intended failing test | Before | After |
|---|---|---|---|---|
| 1 | `q.objectives()` async bridge always resolves empty | `executes Promise-based reads with exact values` → `expect(result).toEqual(['Query Target'])` | FAIL (result `[]` vs `['Query Target']`, exit 1) | PASS (result `['Query Target']`, exit 0) |

No fault code remains in the final source (verified: `grep -c "CONTROLLED FAULT"` = 0 in `executor.ts`).

## Type check

Command (from `okr-app/`): `npm run check`
- svelte-check reports the same pre-existing baseline: 19 errors / 4 warnings in
  11 files, NONE in any WP07-owned file (`grep -c "tests/application|plugins/scheduler"` = 0).
  No new TS errors.

## Impacted existing suites

Command (from `okr-app/`): `DB_BACKEND=sqlite npx vitest run tests/application/sqlite.test.ts`
Result: 1 file passed, 19 tests passed, exit 0 (WP06 HTTP/auth/probe suite
unaffected by the scheduler lifecycle change).

## Integration verification (no dead code)

- `integrations.sqlite.test.ts` / `integrations.postgres.test.ts` are live entry
  points: each calls `integrationsSuite(...)` directly.
- The suite imports and executes `startServer` (http-fixture), `testImportPlugin`
  (plugin-fixture), `registerPlugin`, `getDatabase`, and
  `startScheduler`/`stopScheduler`/`isSchedulerRunning`. The scheduler module is
  also the production path used by `hooks.server.ts`.
- The SQLite run above proves the new code is reached; `executor.ts` needed no
  old-path redirection (it was already the `/api/queries/execute` path).

## PENDING items (not fabricated, not claimed PASS)

1. ~~**Live PostgreSQL integration suites** (`integrations.postgres.test.ts`,
   plus the postgres branch of the in-process scheduler test)~~ — **RESOLVED
   PASS** (see the PostgreSQL run above). A live PostgreSQL 18.6 was available
   at `127.0.0.1:55432` with passwordless trust auth; the postgres entry passes
   green (8/8, exit 0) after the audit-log assertion was made backend-agnostic.
2. **RISK-2** remains unresolved/operator-deferred (per WP safeguards).

## Artifacts (this directory)

- `manifest.md` — this manifest.
- `run-transcript.txt` — fixed-run transcript (SQLite integration suite, exit 0).
- `postgres-run-transcript.txt` — fixed-run transcript (PostgreSQL integration
  suite, exit 0).
- `fault1-bridge.patch` / `fault1-failing.txt` / `fault1-passing.txt` — T034.
- `checksums.txt` — SHA-256 checksums of evidence artifacts and changed sources.

Source of truth for implementation: `spec-kitty-implement-database-review-findings-remediation-01M5TGCE-WP07.md`.