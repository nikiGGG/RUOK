# Work Packages: SQLite and PostgreSQL support

**Mission:** `sqlite-postgresql-support-01M5JP6Y`

**Inputs:** [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/persistence.md](contracts/persistence.md), [quickstart.md](quickstart.md).

**Delivery status:** Planning only. All implementation subtasks remain unchecked. Both real backends are required because data integrity and feature parity are the user’s core acceptance criteria. No agents or implementation jobs have been dispatched.

**Execution:** Use the installed Spec Kitty implement/review workflow; preserve single-branch topology unless deliberately re-planned. Do not begin implementation in this planning session.

## Work Package WP01: Typed persistence proof and real database harness

**Goal**: Both concrete adapter prototypes compile without type erasure and pass real DB CRUD, codec and injected rollback tests. Default application behavior is still the existing SQLite runtime.
**Prompt**: [tasks/WP01-typed-persistence-proof-and-real-database-harness.md](tasks/WP01-typed-persistence-proof-and-real-database-harness.md)
**Requirement Refs**: FR-001, FR-003, FR-009, FR-011
Depends on None

### Included Subtasks

- [ ] T001 Pin reproducible dependencies and record baseline checks
- [ ] T002 Prove the adapter boundary with exact Drizzle versions
- [ ] T003 Create isolated real-backend fixture lifecycle
- [ ] T004 Prove rollback and codec behavior before broad conversion

## Work Package WP02: Dialect schemas, configuration and adapter lifecycle

**Goal**: Both schemas represent every current table/field and the factory selects exactly one backend. Config/lifecycle tests pass, including no SQLite file in PostgreSQL mode and trusted/untrusted CA cases.
**Prompt**: [tasks/WP02-dialect-schemas-configuration-and-adapter-lifecycle.md](tasks/WP02-dialect-schemas-configuration-and-adapter-lifecycle.md)
**Requirement Refs**: FR-001, FR-002, FR-003, FR-009, FR-010
Depends on WP01

### Included Subtasks

- [ ] T005 Define all dialect schemas and canonical codecs
- [ ] T006 Validate explicit database configuration
- [ ] T007 Implement selected-backend connection ownership
- [ ] T008 Verify schema and lifecycle contracts on both backends

## Work Package WP03: Versioned migrations, legacy adoption and readiness

**Goal**: Fresh and supported legacy migrations converge correctly; unknown layouts are unchanged and rejected. Both backend readiness paths fail correctly on migration/connectivity errors. Tests prove no build-time initialization.
**Prompt**: [tasks/WP03-versioned-migrations-legacy-adoption-and-readiness.md](tasks/WP03-versioned-migrations-legacy-adoption-and-readiness.md)
**Requirement Refs**: FR-002, FR-004, FR-005, FR-009, FR-010, FR-012
Depends on WP02

### Included Subtasks

- [ ] T009 Establish independent checked migration histories
- [ ] T010 Implement fingerprinted SQLite legacy adoption
- [ ] T011 Serialize initialization and expose readiness
- [ ] T012 Verify migrations and probes under failure

## Work Package WP04: Authentication, configuration and goal persistence

**Goal**: Identical fixtures yield equivalent auth/config/goal API results on both backends, with no cross-user reads/mutations. Changed consumers import no dialect schema/handle.
**Prompt**: [tasks/WP04-authentication-configuration-and-goal-persistence.md](tasks/WP04-authentication-configuration-and-goal-persistence.md)
**Requirement Refs**: FR-003, FR-006, FR-007, FR-011
Depends on WP03

### Included Subtasks

- [ ] T013 Migrate account, session and admin persistence
- [ ] T014 Migrate bootstrap-independent system settings
- [ ] T015 Migrate objectives, key results and reflections
- [ ] T016 Verify goal journey and access contracts

## Work Package WP05: Periods, tasks, timers, tags and metrics persistence

**Goal**: Both modes pass the same periods/tasks/timers/tags/metrics contract cases, including persistence and numeric edge cases. No SQLite-only terminal remains in owned application paths.
**Prompt**: [tasks/WP05-periods-tasks-timers-tags-and-metrics-persistence.md](tasks/WP05-periods-tasks-timers-tags-and-metrics-persistence.md)
**Requirement Refs**: FR-003, FR-007, FR-011
Depends on WP04

### Included Subtasks

- [ ] T017 Migrate periods, journals and commitment calculations
- [ ] T018 Migrate tasks, attributes and timers
- [ ] T019 Migrate tags and fixed/flexible metrics
- [ ] T020 Verify full productivity fixture on both backends

## Work Package WP06: Portable version-2 backup and atomic restore

**Goal**: All four backup pairs pass complete supported-field comparison; injected failures leave no partial restore and preserve other accounts. No raw SQLite restore route or temporary PostgreSQL limitation remains.
**Prompt**: [tasks/WP06-portable-version-2-backup-and-atomic-restore.md](tasks/WP06-portable-version-2-backup-and-atomic-restore.md)
**Requirement Refs**: FR-006, FR-008, FR-011
Depends on WP05

### Included Subtasks

- [ ] T021 Audit and validate the legacy backup contract
- [ ] T022 Implement canonical snapshot and restore command planning
- [ ] T023 Implement genuine atomic execution in both adapters
- [ ] T024 Verify every source-target pair and rollback boundary

## Work Package WP07: Social, queries, plugins, AI and application cutover

**Goal**: All application domains, including backup/restore, use the selected backend and readiness precedes jobs. PostgreSQL does not open SQLite. No raw driver imports remain in application consumers; no existing feature is disabled.
**Prompt**: [tasks/WP07-social-queries-plugins-ai-and-application-cutover.md](tasks/WP07-social-queries-plugins-ai-and-application-cutover.md)
**Requirement Refs**: FR-003, FR-005, FR-006, FR-007, FR-011
Depends on WP06

### Included Subtasks

- [ ] T025 Migrate social views, dashboards and custom-query host
- [ ] T026 Migrate plugin, AI and administration persistence
- [ ] T027 Cut over application imports and startup ordering
- [ ] T028 Verify integration flows and cutover completeness

## Work Package WP08: Complete parity, upgrades and recovery evidence

**Goal**: Every required behavior has observed passing evidence on both backends; upgrades, four user-backup pairs and native recovery are verified. PostgreSQL support cannot be released with skipped domains or fallback SQLite tests.
**Prompt**: [tasks/WP08-complete-parity-upgrades-and-recovery-evidence.md](tasks/WP08-complete-parity-upgrades-and-recovery-evidence.md)
**Requirement Refs**: FR-002, FR-004, FR-006, FR-007, FR-008, FR-011
Depends on WP07

### Included Subtasks

- [ ] T029 Complete feature-to-contract coverage ledger
- [ ] T030 Exercise upgrades, concurrency and operational failures
- [ ] T031 Rehearse full installation native recovery
- [ ] T032 Record release evidence and close scoped regressions

## Work Package WP09: Production image, migration command and local deployment

**Goal**: One image builds from clean checkout without DB access and passes both backend production startup, migrate, readiness and restart tests. PostgreSQL does not require a SQLite filesystem.
**Prompt**: [tasks/WP09-production-image-migration-command-and-local-deployment.md](tasks/WP09-production-image-migration-command-and-local-deployment.md)
**Requirement Refs**: FR-001, FR-005, FR-009, FR-010, FR-012
Depends on WP08

### Included Subtasks

- [ ] T033 Make the production build reproducible and database-free
- [ ] T034 Run the same non-root image in both modes
- [ ] T035 Provide clean local SQLite and PostgreSQL examples
- [ ] T036 Smoke-test build, runtime and persistence

## Work Package WP10: Required CI matrix and trusted GHCR publication

**Goal**: Both backend checks gate publication; PR jobs cannot push. Trusted release job can produce an immutable pullable digest with no embedded secrets. Record any registry-ownership/visibility prerequisite explicitly.
**Prompt**: [tasks/WP10-required-ci-matrix-and-trusted-ghcr-publication.md](tasks/WP10-required-ci-matrix-and-trusted-ghcr-publication.md)
**Requirement Refs**: FR-011, FR-013
Depends on WP09

### Included Subtasks

- [ ] T037 Add required reproducible backend jobs
- [ ] T038 Validate container changes on pull requests
- [ ] T039 Publish trusted branch/release images after checks
- [ ] T040 Verify workflow and release access contract

## Work Package WP11: Operating documentation and CNPG deployment handoff

**Goal**: A reviewer can deploy either mode and recover disposable data using the docs. The CNPG handoff is actionable with explicit missing environment inputs; task 115 is not falsely marked deployed or complete.
**Prompt**: [tasks/WP11-operating-documentation-and-cnpg-deployment-handoff.md](tasks/WP11-operating-documentation-and-cnpg-deployment-handoff.md)
**Requirement Refs**: FR-001, FR-004, FR-009, FR-010, FR-014
Depends on WP10

### Included Subtasks

- [ ] T041 Document both database modes and migration operations
- [ ] T042 Document and validate native backup and recovery
- [ ] T043 Prepare concrete external PR 11 handoff checklist
- [ ] T044 Review rollout and remaining task-115 scope

## Dependency & Execution Summary

WP01 → WP02 → WP03 → WP04 → WP05 → WP06 (backup) → WP07 (final cutover) → WP08 → WP09 → WP10 → WP11. Packages run sequentially because application conversions share adapter and model files. No parallel agent work is requested by this planning task.

The database feature requires WP01–WP09. Published-image readiness and operating handoff require WP10–WP11. No partial PostgreSQL cutover is a release.

## Requirements Coverage Summary

| Requirement ID | Covered By Work Package(s) |
|---|---|
| FR-001 | WP01, WP02, WP09, WP11 |
| FR-002 | WP02, WP03, WP08 |
| FR-003 | WP01, WP02, WP04, WP05, WP07 |
| FR-004 | WP03, WP08, WP11 |
| FR-005 | WP03, WP07, WP09 |
| FR-006 | WP04, WP06, WP07, WP08 |
| FR-007 | WP04, WP05, WP07, WP08 |
| FR-008 | WP06, WP08 |
| FR-009 | WP01, WP02, WP03, WP09, WP11 |
| FR-010 | WP02, WP03, WP09, WP11 |
| FR-011 | WP01, WP04, WP05, WP06, WP07, WP08, WP10 |
| FR-012 | WP03, WP09 |
| FR-013 | WP10 |
| FR-014 | WP11 |
