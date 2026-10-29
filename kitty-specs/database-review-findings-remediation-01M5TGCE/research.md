# Planning research and decision record

**Date**: 2026-10-28, Europe/Samara. **Revision inspected**:
`0572599edc3e79dded5893aaaaef6867394a5288`.

This is repository inspection, not executed regression or live acceptance evidence.
Authority: [spec.md](spec.md) and the immutable historical
[review](../../okr-app/docs/reviews/sqlite-postgresql-support-2026-10-26.md).
The original [persistence contract](../sqlite-postgresql-support-01M5JP6Y/contracts/persistence.md)
continues to apply. No library upgrade or new dependency is proposed.

## D-01 — TLS must survive the driver boundary

**Observed**: `okr-app/src/lib/db/config.ts` passes the original connectionString
and explicit SSL object together. Existing builder tests do not establish effective
pg Client settings. The historical review reproduced verification/CA loss.
**Decision**: Resolve URL controls into canonical policy, reject contradictions
and duplicates, strip consumed controls before pg parsing, then set SSL explicitly.
Use the same builder for migration Client and pool.
**Rationale**: One normalized source removes driver merge ambiguity.
**Alternatives**: Original URL plus object repeats defect; reject all URL hints
would break valid supported configuration unnecessarily.
**Implementation research checkpoint**: Inspect the installed pg-connection-string
source to enumerate its entire accepted SSL surface and aliases. Effective Client
matrix plus live TLS is the acceptance oracle, not recalled parser behavior.
This bounded inventory does not block design or permit undocumented TLS options.

## D-02 — Structural schema recognition with supported historical variants

**Observed**: `migrations/contracts.ts` models columns as names and journal entries
as timestamps; `fingerprint.ts` checks index names but ignores definitions.
`sqlite-migrator.ts` sets persistent journal mode before classification.
`sqlite-verify.ts` duplicates incomplete inspection. `migration-fixtures.ts`
explicitly supports fresh, journal-managed, db:push, missing-additive and incomplete
journal layouts; those positives must survive.
**Decision**: Shared semantic inspector/classifier, migration-derived expected
metadata plus explicit supported variants, journal hashes and timestamps, and
no mutation before rejection. Keep serialized classification/adoption.
**Rationale**: Both modes must reject the same incompatible definition while
accepting harmless formatting. Migration files remain frozen.
**Alternatives**: Index-only repair leaves types/FKs/constraints/journal unchecked;
whole-SQL string comparison mistakes formatting for drift. A general-purpose SQL
parser dependency is not justified; constrain unsupported constructs and compare
only the repository's enumerated checked constraint grammar.
**Checkpoint**: Independently assert descriptor semantics and historical variants;
shared expected/actual inspector alone can hide a shared bug. Unknown layouts
remain rejected; new functional ambiguity returns to specify.

## D-03 — Runtime verification is a different execution path

**Observed**: `server/database.ts` calls openDatabase without options;
`scripts/db-migrate.ts` alone reads MIGRATION_MODE. `postgres-migrator.ts` calls
createJournal before checking verifyOnly. SQLite orchestration creates missing
parent directories/file before verification.
**Decision**: Share mode parsing, preserve default migrate, branch into read-only
verification before object creation, open SQLite verify with fileMustExist/read-only
semantics, and validate PostgreSQL physical catalog/history in a read-only snapshot.
**Alternatives**: Revoking runtime CREATE alone only makes startup fail; allowing
CREATE contradicts the no-DDL contract; changing default startup mode is unnecessary.
**Proof**: Real data-only role, attempted-statement capture and object inventories
for success and empty/outdated/incompatible rejection. No new schema version.

## D-04/D-05 — Own initialization and probe live availability

**Observed**: `server/database.ts` caches rejected opening; hooks cache rejected
initializing and await it for health/ready. lifecycle.ts stores lastMigrationVersion
and checks `_open`; PostgreSQL open runs SELECT 1 and lacks an idle pool error
listener. Scheduler tracks interval but its initial timeout is not tracked.
**Decision**: One lifecycle attempt/state owner, failure reset, generation fencing,
cleanup, exact probe bypass, async live readiness and scheduler-once startup.
Use a 3-second probe budget, <=1-second retry cooldown and 1-second test polling.
**Alternatives**: Cached booleans cannot show outage; Promise.race without driver
cleanup leaks work; a second pool can claim availability while application pool
is exhausted. Probe the actual application service/pool.
**SQLite boundary (amended for U1)**: Synchronous runtime writes also block
probes, so startup-only isolation is insufficient. Keep all SQLite driver work
behind a worker facade, with the existing awaitable repositories and transaction
semantics unchanged. Configured busy timeouts remain effective inside the worker;
host readiness has its own bounded queue-inclusive wait and cannot replay writes.
See D-07 below for ownership, protocol and concrete simultaneous-write regression.
**Proof**: Same HTTP process across failed startup, recovery, later outage and
second recovery; saturated pool, held SQLite lock, concurrent opening, idle error
and shutdown races. Measure event-loop responsiveness, not just route unit tests.

## D-06 — Extend proof at real application boundaries

**Observed**: Domain fixtures exercise repositories and handwritten proof DDL,
not actual login/session/admin/scheduler/QuickJS paths. PostgreSQL operations
creates fresh databases but pool/outage cases omit migrations. Container PostgreSQL
script tolerates restart readiness failure and missing objective before PASS.
Recovery preflight checks pg_dump/psql but invokes pg_restore and can skip entirely.
**Decision**: Keep repository suites; add built-server HTTP and real application
suites on both migrated backends, required prerequisite checks, corrected fixtures
and manually run truthful image scenarios. No workflow changes.
**Alternatives**: Mocked repositories/locals cannot prove cookie or ownership
boundaries; existing data persistence tests cannot prove application invocation.
**Proof**: Targeted controlled faults demonstrate guards and bridge tests fail;
all six finding rows need durable before/after evidence. RISK-2 stays unresolved.

## Planning limits and prerequisites

No live PostgreSQL, Docker image build/pull, native recovery, dependency install,
application test or typecheck was run during planning. No network availability or
PASS is inferred. Runtime/tool versions and the UI diagnostic baseline must be
captured during implementation. Existing historical counts are observations only.
A required Docker image download failure immediately stops ALL mission work and
requires exact redacted blocker details plus explicit operator direction to resume.
Do not substitute images/registries or alter proxy/TLS/network configuration.

No unresolved product/design question remains. Environmental prerequisites do not
prevent task authoring but do prevent acceptance when unavailable. The existing
charter is absent; no charter compliance pass is invented. No dependency security
decision was made, so a dependency adversarial challenge is not applicable here.

## Authorized consistency-analysis remediation

The operator authorized all recommendations from the blocked analysis of
`9d1f9ef139859d4325a014598528172f953a465a`. Changes here affect planning only;
requirements, probe bounds, application APIs, timeout settings and CI freeze remain.

### D-07 / U1 — Isolate ordinary SQLite work as well as startup

**Decision**: New WP10 follows WP03 and precedes WP04. It moves existing SQL
unchanged to a worker-private engine, with a typed async facade retaining every
DatabaseServices repository/atomic/backup method. Structured clone preserves
Date/Map and optional values. Preparation runs in its own worker and closes
before runtime handle open; import/build never start a worker or open storage.

**Rationale**: A 5000ms (or larger configured) synchronous runtime lock wait can
starve the HTTP event loop even when the probe's own query has a shorter deadline.
All driver work belongs off that thread. The SQLite dependency and SQL remain.

**Alternatives rejected**: Clamp busy timeout silently (configuration behavior
change, still no general event-loop isolation); move only readiness/startup to a
worker (ordinary writes still block health); kill/replay writes when a probe times
out (uncertain commit outcome and duplicate write risk).

**Bounds**: At most 128 queued ordinary requests and one coalesced readiness command;
readiness gets next-slot priority after active work, with a 3s host wait including
queue time. Timeout marks unavailable without cancelling an active transaction
or pretending its slot is free. Late replies are generation/request-fenced; worker
crash does not imply rollback of an operation that may have committed.

**Proof**: Real adapter/domain/backup/atomic parity and lock tests in WP10;
WP06 actual authenticated write under external lock while concurrently probing
same-PID HTTP at busy timeouts 0/5000/30000ms, overlapping probes, queue bounds and
release recovery. No runtime PASS is claimed until these execute.

### D-08 / I1 — Activate commands only after their files exist

**Decision**: WP10 emits worker assets through existing Vite build hook without
package.json edits. WP06 provides auth/probe backend entry files; WP07 provides
separate integration backend entry files and imports only the earlier fixture.
WP05 directly verifies executable preflight and recovery. New WP11 depends on
WP05/WP07 and exclusively owns package.json, explicitly wiring both entry pairs
and preflight only once all exist. WP08 depends on WP11; WP09 consumes all evidence.

**Alternatives rejected**: Forward import/command paths, placeholder tests,
passWithNoTests, conditional suite omission and later unowned package.json edits.
Each earlier package uses direct installed-Vitest/build/helper commands and is
independently verifiable. All current full/backend file coverage must be preserved.

### D-09 / H1 — Qwen execution instructions, preserved provenance

**Decision**: Active prompt examples/instructions and handoff select Qwen CLI
(`qwen`), matching .kittify/config.yaml available agents and operator direction.
Historical Codex authorship and analyzer identity stay unchanged. Finalizer-owned
claim fields may be normalized out; prompt instructions and runtime selection
remain authoritative for the handoff. No Qwen process is launched here.

The other device must verify its own Spec Kitty/Qwen versions, profile resolution,
branch/report freshness and execution prerequisites. This is an explicit handoff
check, not a claim that the remote environment was inspected.
