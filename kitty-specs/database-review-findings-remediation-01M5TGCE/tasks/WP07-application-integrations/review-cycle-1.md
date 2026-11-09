---
affected_files: []
cycle_number: 1
mission_slug: database-review-findings-remediation-01M5TGCE
reproduction_command:
reviewed_at: '2026-10-28T20:06:15Z'
reviewer_agent: user
wp_id: WP07
---

# WP07 Review Feedback

## Issue 1 (BLOCKER): PostgreSQL backend fails WP07's own integration suite

The acceptance criterion for WP07 is that the scheduler/query/saved-query/friend/AI
paths are verified through real application entrypoints on BOTH real databases.
A live PostgreSQL 18.6 instance is reachable at `127.0.0.1:55432` with passwordless
trust auth (role `postgres` has CREATEDB/superuser). Running the PG entry:

```
RUOK_TEST_PG_ADMIN_URL='postgres://postgres@127.0.0.1:55432/postgres' \
DB_BACKEND=postgres npx vitest run tests/application/integrations.postgres.test.ts
```

FAILS (exit 1):

```
FAIL tests/application/integrations.postgres.test.ts > QuickJS async query bridge
     via /api/queries/execute (postgres) > executes Promise-based reads with exact
     values, renders, progress and audit log
AssertionError: expected true to deeply equal 1
  → tests/application/integrations.suite.ts:230
       expect(logs[0].success).toEqual(1);
```

Root cause: the `success` column has different storage/read-back types per backend:
- SQLite schema: `integer('success', { mode: 'boolean' })` — raw read via
  `better-sqlite3` (`verify.all`) returns integer `1`.
- PostgreSQL schema: `boolean('success')` — raw read via the `pg` driver returns
  JS boolean `true`.

The WP07 test assertion `expect(logs[0].success).toEqual(1)` at
`okr-app/tests/application/integrations.suite.ts:230` is backend-specific and
only passes on SQLite. The audit-log row IS persisted correctly on both backends
(the value is truthy); only the assertion's exact-representation check is wrong.

How to fix:
- Make the assertion backend-agnostic, e.g.
  `expect(logs[0].success).toBeTruthy()` or
  `expect(Boolean(logs[0].success)).toBe(true)`.
- Re-run BOTH entry files green on their selected real backends and record the
  passing postgres run (with versions, revision, exit 0) in the WP07 evidence
  directory, since the manifest currently records the PG run as PENDING
  (no local PG admin URL) — a live PG was available and the suite did not pass.

## Assessment summary (non-blocking, all other criteria checked)

- Scheduler fix (T030): correct. `startScheduler`/`stopScheduler` now track and
  clear both the interval and the initial one-shot timeout; live-called from
  `okr-app/src/hooks.server.ts`. Stop/restart produces no duplicate timers
  (verified by test and code inspection). No dead code.
- QuickJS async bridge (T031): genuinely async via `context.resolvePromise` +
  promise pumping; per-user isolation asserted. Fails only on the backend-typed
  audit-log assertion above.
- Saved query + friend dashboard (T032), AI tools (T033): pass on both backends;
  ownership/privacy (404/403), per-author notes, foreign-ID and unauthenticated
  denials all hold.
- T034 controlled fault: evidence shows the broken bridge fails the targeted
  async assertion and the restored path passes; no fault remains in source.
- No unrelated production changes in the WP07 commit (`b646c73` touches only
  scheduler.ts + tests + evidence). No frozen/CI surfaces touched. RISK-2 stays
  operator-deferred as required.
- Required sqlite suites pass: integrations.sqlite.test.ts (8 tests, exit 0)
  and sqlite.test.ts (19 tests, exit 0).

Blocking finding: the postgres entry does not pass, so WP07 cannot be approved
until the audit-log `success` assertion is made backend-agnostic and the PG run
is re-verified green.