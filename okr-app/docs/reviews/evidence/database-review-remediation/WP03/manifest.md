# WP03 — Honor no-DDL runtime verification — evidence manifest

Mission: `database-review-findings-remediation-01M5TGCE`
WP: WP03 (FR-003 / FR-008 / NFR-001 / NFR-004; DRIFT-3)
Execution agent profile: node-norris (implementer)
Date: 2026-10-28 (UTC runs below)
Environment: darwin, Node v22.20.0, npm 11.6.4
Drivers: better-sqlite3 12.5.0, pg 8.23.1, vitest 5.0.3
Source revision (HEAD): `7e289ca7743be73d84ec010de9901b949277fca4` (lane-c, before WP03 commit)
Dirty diff at capture: none (all changes staged below by the WP03 commit)

Source checksums (SHA-256): see `checksums.txt` (same directory).

## What changed

- `src/lib/db/migration-mode.ts` (new): shared side-effect-free `parseMigrationMode`
  parser (absent/empty -> migrate; invalid -> redacted error). Published from
  `src/lib/db/index.ts` for the WP04 lifecycle handoff. Wired into
  `scripts/db-migrate.ts` (T010).
- `src/lib/db/migrations/postgres-verify.ts` (new): read-only `runPostgresVerify`
  — consistent `REPEATABLE READ READ ONLY` snapshot, journal presence + complete
  known journal (exact `when` set, no unknown/duplicate/corrupt records), and
  physical catalog shape validation (tables + column types parsed from the
  checked migration SQL). No `createJournal`, no advisory lock, zero DDL (T011).
- `src/lib/db/migrations/postgres-migrator.ts`: removed the old `verifyOnly`
  path that called `createJournal` before verifying; it is now privileged
  migration only (T011).
- `src/lib/db/migrations/migrate.ts`: verify branches BEFORE object creation —
  SQLite verify opens `readonly` + `fileMustExist` without `mkdir`; PostgreSQL
  verify routes to `runPostgresVerify` (T011/T012).
- `src/lib/db/migrations/index.ts`: exports `runPostgresVerify`/`parsePostgresTables`.
- Tests: `tests/db/runtime-mode.test.ts` (T010/T012), `tests/db/postgres-no-ddl.test.ts`
  (T011/T013), updated `tests/db/postgres.migration.test.ts`, `tests/db/migration.test.ts`.

## Executed runs

### Focused suite (WP03 + impacted) — PASS

Command (workdir `okr-app/`):
```
./node_modules/.bin/vitest run \
  tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts \
  tests/db/postgres.migration.test.ts tests/db/migration.test.ts \
  tests/db/sqlite-integrity.test.ts
```
Result: `5 passed (5)`, `33 passed | 5 skipped` — exit 0.
The 5 skipped are the live-PostgreSQL integration cases (guarded on
`RUOK_TEST_PG_ADMIN_URL`, absent here) — see PENDING below.

### Full SQLite suite — PASS

Command (workdir `okr-app/`): `npm test`
Result: `18 passed (18)`, `144 passed (144)` — exit 0.

### CLI delegation + mode parsing — PASS

Commands (workdir `okr-app/`, disposable `/tmp/ruok-cli-test`):
- `DATABASE_PATH=... npm run db:migrate` -> `OK classification=fresh applied=7 recorded=7 schemaVersion=6`
- `MIGRATION_MODE=verify npm run db:migrate` -> `OK classification=ready applied=7 recorded=0 schemaVersion=6`
- `MIGRATION_MODE=push npm run db:migrate` -> `Unexpected error: Invalid MIGRATION_MODE 'push'. Expected 'migrate' or 'verify' (absent means migrate).` exit 1
- `MIGRATION_MODE=verify` on a missing path -> `Migration failed: Cannot open database because the directory does not exist` exit 1; path NOT created (T012).

### Diff-scoped type-check — no new errors

`./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Changed/new files: 0 errors. The 4 total `tsc` errors are pre-existing baseline
debt in unrelated files (`src/lib/server/ai/providers.ts`,
`src/lib/server/plugins/oura.ts`) — not introduced by WP03.

## PENDING (live-PostgreSQL restricted-role runs)

`RUOK_TEST_PG_ADMIN_URL` is not set in this environment, so the live
restricted-role no-DDL integration tests in `tests/db/postgres-no-ddl.test.ts`
(guarded on that URL) SKIP here. They are fully implemented and will execute in
CI/a live-PG environment. Each case provisions a least-privilege runtime role
(owns no objects, PUBLIC CREATE revoked), runs `runPostgresVerify` on
migrated/empty/outdated/incompatible storage, and asserts zero attempted DDL via
statement capture + unchanged object inventories. These runs must be executed
to close DRIFT-3's live boundary claim; they are recorded as PENDING, not PASS.
No Docker image was required or pulled for any WP03 check.

## No-DDL contract notes

- PostgreSQL verify branches before `createJournal` and never takes the
  advisory lock; a data-only role needs no CREATE.
- SQLite verify never `mkdir`s and opens with `fileMustExist`; a missing
  path/dir remains absent; a rejected existing DB is left unchanged.
- `verifyOnly` option removed from `runPostgresMigrations` (old privileged
  path); grep confirms zero remaining references.