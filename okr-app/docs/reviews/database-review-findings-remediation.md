# Database review findings remediation

Mission: `database-review-findings-remediation-01M5TGCE`.
Target: `plan/sqlite-postgresql-support`.
Inspected baseline: `0572599edc3e79dded5893aaaaef6867394a5288`.
The [historical review](sqlite-postgresql-support-2026-10-26.md) is unchanged.

**All six in-scope application findings have executed closure evidence.**
RISK-2 remains unresolved and explicitly deferred to the operator's separate
CI/CD review. Required suites have zero failures and mandatory skips in the
recorded final environment; the final corrected-source image passed both
backend persistence positives and all four intended failure controls.
Independent review and governed acceptance still determine workflow readiness;
this report does not claim deployment or publication.

## Finding dispositions

| Finding / requirement | Changed behavior and regression oracle | Before / controlled fault | Fixed execution and durable artifacts | Disposition |
|---|---|---|---|---|
| DRIFT-1 / FR-001 | Runtime pool and migration client preserve canonical verification/CA after URL parsing and reject contradictory/duplicate/unsupported TLS controls | Actual raw `pg` parser downgrade/CA-loss reproduction; [original matrix](evidence/database-review-remediation/WP01/effective-ssl-matrix.md) | [Six live TLS cases](evidence/database-review-remediation/WP09/tls-proof/README.md): trusted real SQL/TLS on both paths; foreign-CA and hostname rejection on both; exact source/image/UTC and seven artifact checksums | Closed |
| DRIFT-2 / FR-002 | SQLite rejects incompatible index/column/FK/constraint/journal definitions without mutating rejected storage, while supported layouts remain adoptable | [Original-source wrong-index test fails at intended resolved-migration oracle](evidence/database-review-remediation/WP09/baseline_sqlite_index_tmpfs.log) | [Same test passes on fixed source](evidence/database-review-remediation/WP09/fixed_sqlite_index_tmpfs.log), [full semantic/live focused suite](evidence/database-review-remediation/WP09/remaining_contracts_after_close_tmpfs.log), [owner matrix](evidence/database-review-remediation/WP02/manifest.md) | Closed |
| DRIFT-3 / FR-003 | `verify` routes to read-only inspection before object creation; a data-only role needs no CREATE or ownership | Empty/outdated/incompatible storage rejection with zero attempted DDL and unchanged catalog/journal | [Statement/inventory captures](evidence/database-review-remediation/WP03/live-capture.json), [current restricted-role/no-DDL execution](evidence/database-review-remediation/WP09/remaining_contracts_after_close_tmpfs.log), [HTTP verify startup/recovery](evidence/database-review-remediation/WP09/postgres-probe-proof/cycle.log) | Closed |
| DRIFT-4 / FR-004 | Operational fixtures migrate before use; required PG commands enforce native-tool/server preflight; image scripts require real PostgreSQL and fail lost state/readiness | [Original PostgreSQL script falsely passes after actual row deletion](evidence/database-review-remediation/WP08/baseline-postgres-lost-write.log) | [PostgreSQL backend](evidence/database-review-remediation/WP09/postgres_after_close_tmpfs.log), [native recovery](evidence/database-review-remediation/WP09/recovery_postgres_after_close_tmpfs.log), [initial WP08 image proof](evidence/database-review-remediation/WP08/manifest.md); [final-source six-case image proof](evidence/database-review-remediation/WP09/final-image/README.md) | Closed |
| DRIFT-5 / FR-005 | Real sessions/admin/ownership and scheduler/query/friend/AI entrypoints use selected real storage on both backends | [Admin guard fault](evidence/database-review-remediation/WP06/fault1-failing.txt), [ownership fault](evidence/database-review-remediation/WP06/fault2-failing.txt), [broken bridge fault](evidence/database-review-remediation/WP07/fault1-failing.txt) reach intended failing assertions | [SQLite application 27/27](evidence/database-review-remediation/WP09/application_sqlite_tmpfs.log), [PostgreSQL application 25/25](evidence/database-review-remediation/WP09/application_postgres_after_close_tmpfs.log); restored owner runs and both full backend packages | Closed |
| RISK-1 / FR-006 | Failed initialization retries; live readiness detects outage/recovery while health remains live, without PID change; SQLite work is isolated from HTTP | [Lifecycle negative controls](evidence/database-review-remediation/WP04/manifest.md), [external SQLite lock proof](evidence/database-review-remediation/WP10/lock-regression-capture.json), real unavailable PostgreSQL startup and later terminated idle connection | [SQLite timed HTTP cycle](evidence/database-review-remediation/WP09/application_sqlite_tmpfs.log), [complete PostgreSQL same-PID cycle](evidence/database-review-remediation/WP09/postgres-probe-proof/cycle.log), [worker/isolation record](evidence/database-review-remediation/WP10/manifest-cycle2.md) | Closed |
| RISK-2 / FR-007 | Current CI/CD/workflow/publication behavior is preserved | No CI/CD fix, gate implementation or severity waiver is authorized | Explicit operator-owned later review; no deployment, publication or repository-settings write in this mission | **Unresolved — deferred to operator** |

## Final integration and validation

The [machine-readable stage ledger](evidence/database-review-remediation/WP09/stages.jsonl)
and [final matrix](evidence/database-review-remediation/WP09/result-matrix.md)
record exact commands, UTC intervals and actual exits. All listed required test
runs use `--maxWorkers=1 --retry=0` with every test and explicit in-test
concurrency preserved; all have zero mandatory skips.

| Required proof | Result |
|---|---|
| Full declared SQLite suite | 173/173 tests passed, 21 files |
| SQLite backend | 79/79 passed |
| PostgreSQL backend | 93/93 passed, matching native-tool/server preflight |
| SQLite / PostgreSQL application commands | 27/27 and 25/25 passed |
| Standalone PostgreSQL native recovery | 1/1 passed; actual dump/drop/recreate/restore/typed reads |
| No-init / concurrent startup stability | 3 tests passed; ten independent attempts inside each stability case, no retries |
| Additional semantic/no-DDL/availability/worker/command contracts | 62/62 passed |
| Production build after final PostgreSQL close repair | Exit 0 |
| `npm run check` | Exit 1 for both baseline and current: same 18 errors / 4 warnings; zero added/resolved diagnostic identities |
| Supplemental TLS | Six actual endpoint cases plus raw-parser/fixed-policy proof, exit 0 |
| Supplemental PostgreSQL HTTP recovery | Complete verify-mode startup/recovery/outage/recovery cycle, actual idle error, retained objective and one PID, exit 0 |
| Final-source image | Build exit 0, both persistence positives exit 0, four intended negatives exit 1, source stability exit 0 |

The PostgreSQL HTTP proof retains PID 8108, detects the later outage in roughly
26 ms and recovers in roughly 14 ms; initial schema-availability recovery takes
about 1.02 seconds. Every request including body remains below five seconds,
health stays 200 and the original objective ID/title survives. The first probe
attempt failed its idle-event observation because an immediate readiness
checkout reclassified the terminated connection as active. That attempt is
preserved; the revised control observes the actual new idle-event marker before
checkout while keeping the original ten-second detection deadline. No product
assertion or timing bound was weakened.

## Scope, environment and provenance

WP09 explicitly coordinated six integration exceptions: the SQLite worker-private
availability return type; PostgreSQL shared open/close lifecycle; no-init and
composed HTTP probe budgets with strict individual bounds; deterministic query-log
cutoff assertions; and the live repeated/concurrent close/reopen case with
server-side connection counts. Canonical planning amendments and individual repair
notes are in [WP09 evidence](evidence/database-review-remediation/WP09/manifest.md).
The PostgreSQL close regression observes real runtime connections 0 → 1 → 0;
fixture teardown cannot conceal a leaked pool. No unrelated SQL, TLS policy,
dependency version, workflow, migration history or earlier owner evidence changed.

Functional SQLite tests use real files in the verifier's private tmpfs with
actual locking, WAL, transactions, native backup and process reopen; the recorded
filesystem/free-space guard rejects less than 16 MiB available. This corrects
FUSE-overlay temporary-storage overhead and does **not** claim power-loss or
production disk latency. Final production SQLite image scenarios still require
disk-backed named volumes. Earlier parallel/FUSE failures, the invalid cutoff
oracle and original double-close failure remain in their original logs; they are
not hidden baseline allowances or successful tests. See the
[filesystem assessment](evidence/database-review-remediation/WP09/tmpfs-assessment.md).

The verifier uses Node 22.23.4, npm 10.9.9, better-sqlite3 12.5.0, pg 8.23.1,
Vitest 5.0.3 and PostgreSQL/native clients 18.6. The identical baseline/current
lockfile SHA-256 is `66f8ca8e9383a41e1f318082d9b5b3d7eadfaa623fc72d0a51ce723f2ee17eae`.
Source HEAD plus dirty-diff and actual source-file hashes identify the executed
integration state. Final image `76851d5c343ef90ab57a6313db88d73a341e0f53c7380d6052f7cfd87d1fb06d`
binds that source, retains HEALTHCHECK and was reused for all six scenarios.
A local image ID is not a registry manifest digest.

The initial WP08 image was
`51c54a4ee944c18485d06576c008b00cbb7e82b85bf3c1ca6465085b3971c7a9`.
Its seven-case proof remains valid historical evidence. The new final-source
image proof completed 2026-11-09T19:35:51Z after both adapter repairs; tracked
source/test hashes matched before and after the entire run.

## Acceptance reconciliation

| Criterion | Assessment |
|---|---|
| SC-001 — six in-scope closures | All six have linked before/after proof; RISK-2 explicitly deferred |
| SC-002 — required execution/stability | Required suites, ten-run stability and mandatory live scenarios passed with zero mandatory skips |
| SC-003 — production restart persistence | Final corrected-source image: both positives and four intended fault negatives passed |
| SC-004 — bounded outage/recovery | SQLite and PostgreSQL actual same-PID cycles passed within 5/10/30-second bounds |
| SC-005 — unchanged delivery policy | Frozen-surface diff empty; no settings, deployment or publication writes; RISK-2 deferred |
| SC-006 — reproducible closure | Complete linked artifacts, exact provenance, final checksums and safe-evidence checks; earlier records preserved |
| SC-007 — image-download stop rule | No image download failure occurred during WP09; required cached-image replay uses `--pull=never` |

The [historical review](sqlite-postgresql-support-2026-10-26.md), historical
migrations, lockfile and `.github/workflows/` remain unchanged against the
inspected baseline. The generic Spec Kitty `<gate-coverage-junit>` missing-Python-
helper/XML record is not an application test failure or allowance; actual required
commands above executed independently.

Updated operating/replay instructions are in [DATABASES.md](../DATABASES.md),
[DATABASE-VERIFICATION.md](../DATABASE-VERIFICATION.md) and the
[isolated replay guide](evidence/database-review-remediation/WP09/REPLAY.md).
Independent review and governed acceptance follow this evidence handoff. The
prepared postmerge runner separately verifies the actual target checkout after
local merge. No deployment or publication is authorized by this report.
