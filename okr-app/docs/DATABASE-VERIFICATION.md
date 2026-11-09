# Database verification

This guide describes reproducible verification for the database-remediation
mission. The historical review remains unchanged; current finding dispositions
and execution status are in [the remediation report](reviews/database-review-findings-remediation.md).
Raw commands, UTC times, exits, source identities and versions belong to the
linked evidence, rather than to a permanent historical test-count allowance.

## Required command matrix

Run from `okr-app/` using the committed lockfile and supported Node build
runtime. Use disposable databases and isolated ports. Never point destructive
fixtures at production or paste credentials into logs.

| Command | What must execute | Prerequisites |
|---|---|---|
| `npm test` | Full SQLite database/domain/backup suite plus HTTP/auth/probes and application integrations | Exact-lock dependencies; production build is created when needed |
| `npm run test:db:sqlite` | SQLite contract, schemas, lifecycle isolation, domains, upgrade and native recovery | Real writable temporary SQLite storage |
| `npm run test:db:postgres` | PostgreSQL contract, migrations, operations, domains, backup and native recovery | Live disposable PostgreSQL 18+, DBA/CREATEDB admin URL, native client tools |
| `npm run test:application:sqlite` | Both SQLite HTTP and integrations entrypoints | Built server, native SQLite module |
| `npm run test:application:postgres` | Both PostgreSQL HTTP and integrations entrypoints | Built server and PostgreSQL preflight |
| `npm run test:recovery:postgres` | Native full-installation dump/drop/recreate/restore/typed reads | PostgreSQL preflight, `pg_dump`, `pg_restore`, `psql` |
| `npm run build` | Adapter-node production output plus preparation/runtime workers | Exact-lock dependencies |
| `npm run check` | Svelte/TypeScript diagnostics | Same dependency lock and diagnostic comparison against the inspected baseline |

Supply `RUOK_TEST_PG_ADMIN_URL` privately. `preflight:postgres` precedes every
required PostgreSQL command and exits nonzero for an absent admin URL,
unreachable/older server or missing/incompatible native tools. `pg_dump` and
`pg_restore` must support the server major; `psql` must be present. A tool inside
some unrelated container does not satisfy the preflight's PATH checks. Required
runs do not substitute SQLite or silently skip missing prerequisites.

For a reproducible Linux environment, the WP09 replay uses the already-built
production image as a disposable Node 22 runtime with exact-lock development
dependencies and PostgreSQL 18 client packages installed only inside that
verification container. This does not change the production image or dependency
versions. Its volume-mounted generated outputs are disposable. Host Node and
client versions are not silently claimed as the versions used by the tests.

### Additional focused gates

```bash
DB_BACKEND=sqlite node_modules/.bin/vitest run \
  tests/db/sqlite-integrity.test.ts tests/db/runtime-mode.test.ts \
  tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts \
  tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --retry=0
DB_BACKEND=sqlite node_modules/.bin/vitest run \
  tests/db/concurrency.test.ts tests/db/no-init.test.ts --retry=0
```

The last two stability tests each perform ten independent attempts internally,
with fresh storage and isolated bundle paths. A failure stops the series; do
not retry until green or weaken timing/child-process assertions. Supplying the
live admin URL also executes the focused no-DDL and availability cases that
older owner records accurately labelled pending.

`tests/verification/command-coverage.test.ts` guards package entrypoints, missing
files, zero-test failure and fail-closed preflight. The generic Spec Kitty Python
coverage helper is unavailable in this TypeScript repository; its
`<gate-coverage-junit>` missing-artifact record is not an application test result.
The normal review transition still runs that gate and records the limitation;
actual application checks above must execute independently.

## Diagnostic comparison

Archive inspected revision `0572599edc3e79dded5893aaaaef6867394a5288` into an
isolated directory, use the same lockfile/toolchain, then record `npm run check`
for baseline and current source. Compare diagnostic identities: relative file,
severity, message and source context; line numbers may shift when legitimate
imports/comments change. Do not accept a current failure simply because a
historical document counted 18 or 19 errors. Any new database/worker diagnostic
is a blocker for its owner. Preserve the nonzero check statuses in the record;
comparison is an explicit scope assessment, not suppression.

The latest [same-lock comparison](reviews/evidence/database-review-remediation/WP09/diagnostic-comparison-after-pg-close.json)
records 22 baseline/current identities with zero added or resolved diagnostics
after correcting the worker-private availability return type. Both actual check
commands retain exit 1. The earlier failed comparison and original suite failures
remain in the evidence; the final report separately tracks remaining verification.

## Feature-to-contract coverage ledger

The canonical 25-table inventory is machine-checked by
`tests/db/coverage-ledger.test.ts`. Shared scenarios use real selected backend
fixtures; external provider responses may be stubbed, but storage is real.

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


## Live boundary evidence

| Boundary | Executable proof | Evidence |
|---|---|---|
| Effective TLS | Real pg parser baseline and trusted/untrusted/hostname endpoint cases through runtime and migration builders | [WP01](reviews/evidence/database-review-remediation/WP01/manifest.md), [WP09 six-case live TLS proof](reviews/evidence/database-review-remediation/WP09/tls-proof/README.md) |
| SQLite semantics | Wrong-column/nonunique expected-name index, altered definitions/journal records, unchanged rejected storage and supported adoption | [WP02](reviews/evidence/database-review-remediation/WP02/manifest.md), WP09 original/fixed index replay |
| No-DDL runtime | Data-only PostgreSQL role, zero attempted DDL and unchanged catalog on success and rejection | [WP03 live capture](reviews/evidence/database-review-remediation/WP03/live-capture.json), focused current run |
| Recoverable process | Health 200 while ready 503, first recovery, later outage and recovery on same PID; SQLite lock with overlapping probes | [WP06](reviews/evidence/database-review-remediation/WP06/manifest.md), [WP10 lock capture](reviews/evidence/database-review-remediation/WP10/lock-regression-capture.json), current HTTP suites |
| Application boundaries | Real session/admin/ownership handlers, scheduler, QuickJS query bridge, saved query/friends/AI tools; intended fault sensitivity | [WP06](reviews/evidence/database-review-remediation/WP06/manifest.md), [WP07](reviews/evidence/database-review-remediation/WP07/manifest.md) |
| Production packaging | Same immutable local image, exact original objective ID/title before/after restart on both backends, lost-write/never-ready failures | [WP08](reviews/evidence/database-review-remediation/WP08/manifest.md) |

Older manifests remain historical records. A pending item in an older record
is superseded only by a linked later executed proof, never by rewriting the
record or inferring execution from test source. The final report must say
incomplete whenever a required live run, provenance field or assertion is missing.
In particular, the existing PostgreSQL application probe cases cover healthy and
unreachable-startup baselines; the generic complete HTTP recovery cycle is
SQLite-only. A separate PostgreSQL same-process full cycle with idle pool error,
timed health/readiness transitions and retained data is required before closing
RISK-1. That supplemental [executed PostgreSQL proof](reviews/evidence/database-review-remediation/WP09/postgres-probe-proof/README.md) now passes on the final source, including both recoveries, the actual idle error marker and retained objective in the same process. A green package count alone does not close that gap.

## Manual production images

See [the container guide](../tests/container/README.md) for the current commands.
With Podman, build using `--format docker` to retain the declared HEALTHCHECK.
Resolve one `RUOK_SMOKE_IMAGE` to an immutable local image ID and reuse it with
`RUOK_SMOKE_SKIP_BUILD=1` for both scripts. PostgreSQL requires a live
`DATABASE_URL` reachable from inside the application container. A local image ID
is not a registry digest.

Both scripts require readiness/liveness, bundled migration, actual account and
objective creation, restart and exact read under the original account. Missing
or changed data, invalid JSON/status and readiness deadlines fail nonzero.
Controlled lost-write and never-ready cases must reach their intended assertions;
fixture setup errors cannot count as valid negatives. Host-only SQLite checks
are supplemental and do not replace production-image verification.

If any required image cannot be downloaded, stop **all** mission work, report
image/registry/attempted command/redacted error and wait for explicit operator
direction. Do not substitute registries/images or alter proxy/TLS/network settings.

## Recovery and closure

Version-2 user backup portability and native installation recovery are separate
contracts. Native SQLite backup restores only to SQLite; PostgreSQL dumps restore
only to PostgreSQL. The recovery fixtures seed full installation data, restore
it into fresh storage and verify schema/history plus typed reads; native dumps
are not a backend conversion mechanism.

RISK-2 remains **unresolved and deferred to the operator's separate CI/CD review**.
This mission does not modify workflows, publication gates or repository settings
and does not deploy or publish. Review/acceptance requires all six in-scope
finding rows, complete redacted before/after evidence, green required/backend
suites, the ten-run stability proof and explicit diagnostic comparison.
