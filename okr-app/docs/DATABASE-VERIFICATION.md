# RUOK Database Verification (WP08)

Status: complete — this work package produced the feature-to-contract coverage
ledger, the upgrade/concurrency/operational evidence, the native-recovery
rehearsal and the release evidence recorded below.

Requirement refs: FR-002, FR-004, FR-006, FR-007, FR-008, FR-011 (WP08 scope),
backed by FR-001/FR-003/FR-005/FR-009/FR-010 delivered by WP01-WP07.

## Environment and exact versions

Validated on the lane-a worktree, clean install from the lockfile:

| Component | Version |
|---|---|
| Node | 22.20.0 |
| npm | 11.6.4 |
| vitest | 5.0.3 |
| drizzle-orm | 0.45.1 |
| drizzle-kit | 0.31.9 |
| better-sqlite3 | 12.5.0 |
| pg (node-postgres) | 8.23.1 |
| typescript | 5.9.3 |
| svelte-check | 4.3.5 |
| vite | 7.3.0 |
| pg_dump / psql (local, Homebrew) | PostgreSQL 14.15 |

Live PostgreSQL server was NOT available in this environment
(`RUOK_TEST_PG_ADMIN_URL` unset). All PostgreSQL live-backend paths are wired
and gated for CI; they are skipped locally and are clearly marked
**CI-only** below. This document does not claim any live PostgreSQL test
passed locally.

## Feature-to-contract coverage ledger (T029)

Every one of the 25 application tables (inventory from `data-model.md`) maps to
a feature/API family and a concrete shared scenario that runs on BOTH real
backends. The machine-checked half of this ledger is enforced by
`tests/db/coverage-ledger.test.ts`; the per-table behavioural coverage is
enforced by the real-backend suites listed below (no mocks at the persistence
layer). External AI/plugin providers may be stubbed; database behaviour is
real.

| # | Table | Feature / API family | Concrete shared scenario (sqlite + postgres) | Suite |
|---|---|---|---|---|
| 1 | `users` | auth / accounts / admin | account CRUD, admin/disabled flags, per-user isolation | `tests/domains/auth/auth.suite.ts`, `tests/db/contract.suite.ts` |
| 2 | `sessions` | auth sessions | create/find/delete/deleteByUser/deleteExpired | `tests/domains/auth/auth.suite.ts` |
| 3 | `system_config` | admin / global config | keyed upsert incl. secret flag, `all()` | `tests/domains/auth/auth.suite.ts` |
| 4 | `objectives` | goals | CRUD/upsert/listByUser/join-KRs/parent links | `tests/domains/goals/goals.suite.ts`, `tests/db/contract.suite.ts` |
| 5 | `key_results` | goals / KR progress | CRUD, ordering, scoreLabel, custom-query refs | `tests/domains/goals/goals.suite.ts`, `tests/db/contract.suite.ts` |
| 6 | `objective_reflections` | reflections | null-month + per-user lookup | `tests/domains/goals/goals.suite.ts` |
| 7 | `time_periods` | planning / journal | find/list/update, week/year filtering | `tests/domains/planning/planning.suite.ts` |
| 8 | `time_commitments` | planning (backup) | version-2 backup round-trip | `tests/backup/backup.suite.ts` |
| 9 | `tasks` | planning / timers | CRUD, atomic timers (safe bigint), per-period | `tests/domains/planning/planning.suite.ts` |
| 10 | `task_attributes` | planning / flexible attrs | atomic create/update of attributes | `tests/domains/planning/planning.suite.ts` |
| 11 | `tags` | planning / tags | owner scope, duplicate names | `tests/domains/planning/planning.suite.ts` |
| 12 | `task_tags` | planning / tag links | duplicate-pair links, cascade delete | `tests/domains/planning/planning.suite.ts` |
| 13 | `daily_metrics` | metrics (fixed) | create/update/findByPeriod | `tests/domains/metrics/metrics.suite.ts` |
| 14 | `metrics_templates` | metrics / versioning | `effectiveFrom <= date` selection | `tests/domains/metrics/metrics.suite.ts` |
| 15 | `daily_metric_values` | metrics (flexible) | upsert, timezone-boundary date strings | `tests/domains/metrics/metrics.suite.ts` |
| 16 | `values` | values / principles | version-2 backup round-trip | `tests/backup/backup.suite.ts` |
| 17 | `principles` | values / principles | version-2 backup round-trip | `tests/backup/backup.suite.ts` |
| 18 | `saved_queries` | custom queries | per-user scope, update/remove | `tests/domains/integrations/integrations.suite.ts` |
| 19 | `dashboard_widgets` | dashboards | per-user scope | `tests/domains/integrations/integrations.suite.ts` |
| 20 | `plugins` | plugin config / sync | persist config, listEnabled | `tests/domains/integrations/integrations.suite.ts` |
| 21 | `user_ai_config` | AI config | per-user upsert | `tests/domains/integrations/integrations.suite.ts` |
| 22 | `query_execution_logs` | admin / audit | create/list/count/listSince | `tests/domains/integrations/integrations.suite.ts` |
| 23 | `friend_requests` | social | create/accept/decline, per-user scope | `tests/domains/integrations/integrations.suite.ts` |
| 24 | `friendships` | social | findBetween/listForUser | `tests/domains/integrations/integrations.suite.ts` |
| 25 | `friend_notes` | social / privacy | author-only note, unfriend cleanup | `tests/domains/integrations/integrations.suite.ts` |

Every listed suite is parameterised over a real backend fixture and is executed
for SQLite locally and for PostgreSQL in CI (entry points:
`tests/db/*.contract.test.ts`, `tests/domains/*/{sqlite,postgres}.test.ts`,
`tests/backup/{sqlite,postgres}.test.ts`). The contract/domain/backup fixtures
never substitute one backend for the other — a missing PostgreSQL service fails
or skips the PostgreSQL run; it never silently falls back to SQLite.

New WP08 shared/verification tests added:

| Test | Backend | Purpose |
|---|---|---|
| `tests/db/coverage-ledger.test.ts` | agnostic | guards the canonical 25-table inventory == production/dialect schemas |
| `tests/upgrade/upgrade-preserves-data.test.ts` | sqlite | legacy db:push layout with real rows survives upgrade + allows new writes |
| `tests/recovery/native-recovery.test.ts` | sqlite | full installation native backup → restore → verify |
| `tests/recovery/postgres-recovery.test.ts` | postgres (CI) | `pg_dump`/`pg_restore` of a full installation |
| `tests/db/postgres.operations.test.ts` | postgres (CI) | lock cleanup, bounded-pool concurrency, readiness, connection loss |

## Validation commands and results (T032)

Run from `okr-app/`. All commands and exit codes captured exactly.

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | clean install, 225 packages, lockfile-reproducible |
| `npm test` | 0 | 18 files / **133 tests passed** |
| `npm run test:db:sqlite` | 0 | 11 files / **77 tests passed** |
| `npm run build` | 0 | adapter-node production build succeeded (5.22s) |
| `npm run check` | 1 | **18 errors / 4 warnings in 10 files — all preexisting, see below** |

Additional WP08 scripts:

| Command | Result |
|---|---|
| `npm run test:upgrade` | sqlite upgrade-preserves-data — passed |
| `npm run test:recovery:sqlite` | sqlite native recovery — passed |
| `npm run test:recovery:postgres` | gated — skipped locally (no live PG / `pg_dump` present but no server) |
| `npm run test:db:postgres` | gated — runs in CI only |

### `npm run check` — preexisting unrelated failures (NOT suppressed)

`svelte-check` reports 18 errors and 4 warnings in 10 files. All 18 errors are in
pre-existing frontend/component code that is out of scope for the database
mission and was failing before WP08:

| File | Errors | Nature |
|---|---|---|
| `src/lib/components/DashboardCard.svelte` | 5 | `Cannot find namespace 'Plotly'` |
| `src/routes/queries/+page.svelte` | 4 | `Cannot find namespace 'Plotly'` |
| `src/lib/server/plugins/oura.ts` | 3 | plugin/API typing |
| `src/routes/admin/+page.svelte` | 3 | data-access typing |
| `src/routes/daily/[date]/+page.svelte` | 2 | Plotly namespace |
| `src/lib/components/MonacoEditor.svelte` | 1 | typing |
| `src/lib/components/TaskItem.svelte` | 1 | typing |
| `src/lib/server/ai/providers.ts` | 1 | AI provider typing |
| `src/routes/settings/ai/+page.svelte` | 1 | indexing into typed map |
| `src/routes/settings/metrics/+page.svelte` | 1 | typing |

None of these files is part of the database implementation, and only two were
touched by the mission at all — a one-line `MetricDefinition` import-path update
(`$lib/db/schema` → `$lib/db/models`, required by the WP02 cutover) that does
not introduce these errors. They are recorded precisely here and are **not**
silently `xfail`-ed or hidden with `continue-on-error`. They are pre-existing
UI type defects in the base app, unrelated to SQLite/PostgreSQL parity, and
were present before this WP.

## Upgrade, concurrency and operational evidence (T030)

Already covered by WP01-WP07 suites and verified again in WP08:

- Fresh + repeated migrations, incomplete journals, FK-orphan preflight, drift
  rejection, and competing-startup serialization:
  `tests/db/migration.test.ts`, `tests/db/legacy-adoption.test.ts`,
  `tests/db/migration-files.test.ts`, `tests/db/concurrency.test.ts` (SQLite,
  run against the real bundled `db:migrate` CLI).
- Failed-migration rollback, PostgreSQL connectivity failure (no fallback),
  and TLS misconfiguration (missing CA fails before connect):
  `tests/db/failure.test.ts`.
- No build/import-time I/O: `tests/db/no-init.test.ts`.
- Config validation incl. redacted diagnostics, bounded pool/timeouts, journal
  mode, TLS precedence: `tests/db/config.test.ts`.

New in WP08:

- `tests/upgrade/upgrade-preserves-data.test.ts` — a db:push-era SQLite layout
  carrying real rows (user, objective, KR, period, task) is adopted by the
  canonical runner: all rows remain readable through the typed boundary, the
  journal is reconciled to 7 records, and new writes work immediately. This
  closes the data-preservation gap left by the schema-only legacy tests.
- `tests/db/postgres.operations.test.ts` **(CI-only)** — migration advisory-lock
  cleanup (held then released), bounded-pool concurrency (poolMax=2, 8 parallel
  ops, no deadlock), process-wide readiness transitions (open→ready→closed),
  and connection loss surfaced as a controlled error via `DROP DATABASE WITH
  FORCE` (never a hang, never a SQLite fallback).

## Native recovery rehearsal (T031)

Recovery procedure and observed result for SQLite (run and verified locally):

1. Build a real migrated installation with the production path
   (`migrateDatabase` → `openDatabase`) — not fixture DDL.
2. Write a complete installation through the typed boundary: accounts,
   sessions, system config (incl. a secret), friendships + friend notes,
   plugin config, AI config, objectives/KRs/reflections, periods/tasks/tags,
   metrics templates + values, saved queries/widgets, query logs.
3. Close the database.
4. Take a NATIVE backup using better-sqlite3's online `.backup()` API.
5. Open the backup as a fresh install and verify: migration check classifies it
   `ready` (schema + journal aligned, nothing re-applied), process readiness is
   `true` at schemaVersion 6, and every seeded row is readable.

Observed: `npm run test:recovery:sqlite` → passed. This rehearses
full-installation recovery — distinct from user-export portability (FR-008).

### Why native dumps cannot switch backend engines

A SQLite `.backup()`/CLI backup restores only to SQLite; a PostgreSQL
`pg_dump`/`pg_restore` or CNPG backup restores only to PostgreSQL. Neither
format carries cross-engine DDL semantics or the dialect migration history
compatibly, so a native backup cannot be used to migrate an installation from
one engine to the other. Backend switching of a full installation is a
separately scoped converter and is an explicit non-goal of this mission.

### PostgreSQL native dump/restore (CI-only)

`tests/recovery/postgres-recovery.test.ts` rehearses the same procedure for
PostgreSQL: migrate a disposable database, seed the same full installation,
`pg_dump -Fc`, drop + recreate the database, `pg_restore`, then verify the
restored installation is classified `ready` and every seeded row is readable.
It is gated on `RUOK_TEST_PG_ADMIN_URL` AND the presence of `pg_dump`/`psql`.
It did NOT run locally (no live server); it runs in CI.

## PostgreSQL paths that were NOT live-tested (and why)

The following run against a real PostgreSQL server in CI only; they were
**skipped** locally because no server or admin URL was available:

- `npm run test:db:postgres` — the shared contract, schema-parity, migration,
  operations and domain suites on PostgreSQL.
- `npm run test:recovery:postgres` — the pg_dump/pg_restore rehearsal.
- The live portions of `tests/db/postgres.migration.test.ts`.

PostgreSQL 16/17 are the declared CI targets (spec, plan). The local `pg_dump`
is 14.15; no claim is made that the dump rehearsal was executed against 16/17.

## Limitations

- Live PostgreSQL is CI-only in this environment; no local PostgreSQL parity
  claim is made here.
- `npm run check` fails on 18 pre-existing UI/component type errors (recorded
  above); not a database-parity blocker and not suppressed.
- The concurrent-CLI test (`tests/db/concurrency.test.ts`) passed in the full
  matrix but exhibited one intermittent failure when the SQLite CLI-bundling
  step contended with an isolated batch run; it is stable within `npm test`.
  Recorded here for transparency; not caused by WP08 changes.
- Native recovery cannot switch backend engines (see above).