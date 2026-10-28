---
affected_files: []
cycle_number: 1
mission_slug: database-review-findings-remediation-01M5TGCE
reproduction_command:
reviewed_at: '2026-10-28T04:51:11Z'
reviewer_agent: user
wp_id: WP03
---

# WP03 Review Feedback — Honor no-DDL runtime verification

**Verdict: REQUEST CHANGES (blocking)**

## Summary
The core production code is correct and well-structured: `parseMigrationMode` (shared,
side-effect-free parser), `runPostgresVerify` (REPEATABLE READ READ ONLY, no `createJournal`,
no advisory lock, zero DDL), the verify-before-create branching in `migrate.ts` (SQLite
`readonly` + `fileMustExist`, no `mkdir`; Postgres routes to the read-only path), and removal of
the old `verifyOnly` branch. Non-live unit tests pass, there is no dead code, and the out-of-map
edits (`src/lib/db/index.ts`, `src/lib/db/migrations/index.ts`, `tests/db/migration.test.ts`) are
within the authoritative surface and justified.

However, the **live restricted-role no-DDL integration tests (T013)** — the primary evidence for
the no-DDL runtime contract and DRIFT-3 closure — **FAIL when actually run against a live
PostgreSQL**. They were never executed by the implementer (honestly marked PENDING because
`RUOK_TEST_PG_ADMIN_URL` was unset), and the harness has a setup defect that prevents every live
case from reaching its assertions.

## Blocking Issue 1 — provision() never reconnects admin to the newly-created database
File: `okr-app/tests/db/postgres-no-ddl.test.ts` (`provision`).

`provision()` connects the `admin` client once to `RUOK_TEST_PG_ADMIN_URL`, then runs
`CREATE DATABASE ${dbName}` and — for the migrated cases — migrates the new DB via a *separate*
connection. It then issues the least-privilege grants (`GRANT USAGE ON SCHEMA public`,
`GRANT USAGE ON SCHEMA drizzle`, `GRANT SELECT ON TABLE drizzle.__drizzle_migrations`, ...)
**through the original `admin` connection, which is still attached to the admin URL's database**
(the `postgres` database), NOT the freshly created database. Because `drizzle` schema/table exist
only in the new database, every `GRANT` on `drizzle` throws `schema "drizzle" does not exist`, and
all 4 live tests abort inside `provision` at line 103.

Reproduced against a live PostgreSQL 18.6:
- `drizzle` schema exists in the NEW database (count 1) after migration.
- `GRANT USAGE ON SCHEMA drizzle TO <role>` via the admin connection FAILS with
  `schema "drizzle" does not exist`.
- `drizzle` schema count in the admin URL's original database is 0.

Result: `vitest run tests/db/postgres-no-ddl.test.ts` with `RUOK_TEST_PG_ADMIN_URL` set →
`4 failed | 2 passed` (the 2 unit tests pass; all 4 live cases fail in provision).

Fix: after `CREATE DATABASE`, reconnect the admin client to the new database (e.g. re-point the
admin URL pathname to `/${dbName}` and reconnect) before running schema/table/sequence grants, so
grants target the correct database.

## Blocking Issue 2 — drizzle grants are unconditional, breaking the empty-storage case
File: `okr-app/tests/db/postgres-no-ddl.test.ts` (`provision`, lines ~102-104).

The grants on `drizzle` (`GRANT USAGE ON SCHEMA drizzle`, `GRANT SELECT ON TABLE
drizzle.__drizzle_migrations`) are executed unconditionally, outside the `if (migrated)` guard.
For the empty/unmigrated storage case (`migrated === false`), the `drizzle` schema does not exist,
so even after Issue 1 is fixed these grants will still throw and the "rejects empty storage with
zero DDL" case can never reach its assertion. Guard the `drizzle` grants with `if (migrated)` (or
create the schema/grants conditionally per case).

## What is NOT blocking (verified correct)
- **Dead code:** `runPostgresVerify` is invoked from `migrate.ts` (verify branch, dynamic import)
  which is reached from production `lifecycle.ts` and `scripts/db-migrate.ts`; `parseMigrationMode`
  is called from `scripts/db-migrate.ts` and published from the public db barrel for WP04. Zero
  production hits = none.
- **verifyOnly removal:** `grep verifyOnly src/` returns zero references; `runPostgresMigrations`
  no longer exposes/uses the verify-only path.
- **No-DDL / locked decision:** `runPostgresVerify` issues only `SELECT` + `BEGIN … READ ONLY` +
  `ROLLBACK`; no `createJournal`, no advisory lock, no `mkdir` for SQLite verify; verify branches
  before object creation in `migrate.ts`. Matches FR-003 / T011 / T012 / contract.
- **Synthetic fixture:** the `postgres-no-ddl` unit test parses the real `drizzle-postgres`
  migration SQL via `readMigrationFolder` and asserts 25 tables + spot-checked column types; it
  exercises the real `parsePostgresTables` path.
- **Non-live suites:** `runtime-mode.test.ts`, `postgres.migration.test.ts`, `migration.test.ts`
  pass (16 passed, 1 pre-existing admin-gated skip), exit 0.
- **Out-of-map edits:** `src/lib/db/index.ts` + `migrations/index.ts` publish
  `parseMigrationMode`/`runPostgresVerify` as the public API for the WP04 handoff; the
  `migration.test.ts` one-line fix (pre-create an empty file) is a correct consequence of T012's
  `fileMustExist` change. Both are within `okr-app/src/lib/db/` and justified.

## Required before re-approval
1. Fix the `provision()` harness (reconnect admin to the new DB; guard drizzle grants) so the
   live restricted-role no-DDL tests actually run.
2. Execute the live suite against a real PostgreSQL and record the PASS (with versions/revision)
   as durable evidence to close DRIFT-3's live boundary claim. The manifest currently records these
   as PENDING; the mission's verification section states "Missing live execution remains incomplete
   and blocks acceptance."