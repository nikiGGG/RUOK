# SQLite and PostgreSQL support for RUOK

**Status:** Specified for planning; application implementation has not started.
**Source:** Vikunja task 115, comments 179 and 212, and user clarification on 2026-10-23 (Europe/Samara).
**Baseline:** `975a92fd2b9903f1bf18ad8c27822ddea516c247`.

## Goal and scope

RUOK must remain easy to deploy with SQLite and optionally connect to PostgreSQL, including an existing CloudNativePG cluster. Both backends must support the same existing application features and API behavior. Each deployment uses exactly one configured backend; switching configuration does not transfer data. SQLite remains the default. This clarification supersedes any PostgreSQL-only interpretation of comment 212.

The mission includes research, the database implementation, upgrade paths, portable user backup/restore, real backend verification, container packaging/publication workflow, and deployment instructions. This request delivers planning artifacts and implementation tasks only. Publication and live cluster changes happen during later execution, with actual repository/registry/cluster details then confirmed.

## Stakeholders and terminology

- SQLite deployment: one RUOK application instance using a persistent local/block-storage database file, suitable for small installations.
- PostgreSQL deployment: RUOK connecting through a pool to an externally managed PostgreSQL server; CNPG is one target, not an application dependency.
- Feature parity: equivalent user-visible results, access control, stored values and atomicity, allowing documented backend-specific operational differences.
- User backup: existing authenticated version-2 JSON export/import; excludes some installation-wide data and credentials.
- Installation backup: complete recovery of accounts, secrets, friendships, configuration and data using backend-native procedures; distinct from user export.
- Task 115 still covers evaluating personal goal workflows and deploying the selected application; this database mission does not declare those broader criteria completed.

## User stories and acceptance scenarios

### US1 — Simple SQLite installation (P1)
Given no backend setting, when a user starts RUOK with its existing DATABASE_PATH, then SQLite is selected, data persists after restart, and the annual goal → monthly key result → weekly/daily task workflow works.
Given a supported existing SQLite file, including a known db:push-era layout, when the release is upgraded, then data is preserved and required migrations execute once. An unknown or incompatible layout fails with an actionable message before serving requests.

### US2 — PostgreSQL installation (P1)
Given DATABASE_TYPE=postgres and valid PostgreSQL credentials, when RUOK starts against an empty database, then its schema is migrated and every existing feature works without SQLite file access.
Given invalid credentials, missing configuration, migration failure or loss of connectivity, startup/readiness fails visibly; the app never silently creates a SQLite fallback database.

### US3 — Equivalent behavior and privacy (P1)
Given the same fixtures on both backends, when users exercise authentication, goals, periods, journals, tasks, timers, metrics, dashboards, custom JavaScript queries, AI persistence, plugins, admin operations and friends, then normalized API results and access decisions match.
Given a second independent account, every query, export, restore and friend view preserves existing ownership and sharing boundaries; no new sharing policy is introduced.

### US4 — Portable backups (P1)
Given a valid legacy version-2 user export, when it is restored into either backend, then supported fields and remapped references are preserved, excluded installation data stays excluded, and other users remain unchanged.
Given a failure after restore has deleted existing rows, when any insert fails, then the complete restore rolls back on both backends.
Given a SQLite export restored into PostgreSQL or the reverse, normalized content matches within the explicitly documented version-2 backup scope.

### US5 — Reusable deployment artifact (P2)
Given a clean checkout and no reachable database, when a container builds, then it succeeds reproducibly and contains both runtime drivers and migration histories.
Given a published release image, operators can pull an immutable digest and run the same image in either mode. PostgreSQL mode does not need a SQLite data volume.

## Functional requirements

- **FR-001**: Explicit DATABASE_TYPE=sqlite|postgres; omitted means sqlite. Preserve DATABASE_PATH and default data/okr.db; PostgreSQL requires DATABASE_URL. Reject invalid types and missing PostgreSQL URL; document unused settings and never auto-detect/fallback.
- **FR-002**: Support all 25 current tables, fields, relationships and defaults with canonical application types, explicit dialect codecs and constraint parity; retain text IDs and JSON strings.
- **FR-003**: Provide an awaitable, typed persistence boundary; remove application dependence on SQLite-only terminals, raw handles and dialect query types. Preserve API payloads, errors and missing-row behavior.
- **FR-004**: Maintain independent, versioned dialect migration histories. Preserve existing SQLite migration files. Upgrade supported legacy SQLite layouts through explicit fingerprinted adoption; reject unknown drift and never mark unapplied migrations as applied.
- **FR-005**: Initialize and migrate once before requests/jobs; separate migration execution from build. Bound connection waits and pool use, serialize concurrent migration attempts, and close connections/jobs on shutdown.
- **FR-006**: Preserve authentication, permissions, private notes, friend dashboards, admin restrictions and per-user isolation on both backends.
- **FR-007**: Preserve goals/KRs/progress, periods/journals/reflections, tasks/timers/attributes/tags, fixed/flexible metrics, saved queries/widgets, AI tools/configuration, plugin configuration/sync and query logs.
- **FR-008**: Read existing version-2 user backups on both backends; retain existing format compatibility and explicit field coverage. Restore is validated before mutation and atomic, including preferences, child deletes and reference remapping. Export uses a consistent snapshot.
- **FR-009**: Provide PostgreSQL pool limits/timeouts and verified TLS with custom CA support for CNPG. Redact credentials and connection URLs from errors/logs. No superuser or database creation requirement.
- **FR-010**: SQLite retains its simple file-based setup; enable foreign-key enforcement with a legacy integrity preflight, bounded busy timeout and supported journal configuration. WAL requires suitable local/block storage; no claim of NFS correctness.
- **FR-011**: Run the same behavioral contract suite against real SQLite and PostgreSQL; test migrations, upgrades, rollback, cross-backend backups, privacy, timestamp/boolean/numeric codecs and production startup.
- **FR-012**: Produce a reproducible non-root Node container for both modes; health/readiness accurately reflects database availability without requiring login.
- **FR-013**: Add GitHub Actions validation and GHCR publication for trusted branches/releases, immutable tags/digests and pull-request build-only checks. Registry owner and public visibility are execution-time settings; no publication is performed by this planning request.
- **FR-014**: Document both setups, upgrades, native backup/recovery, migration execution, TLS and a CNPG deployment handoff referencing external infrastructure PR 11. No live cluster changes in this repository mission.

## Non-goals

MySQL, remote SQLite/libSQL, automatic replication or bidirectional synchronization, simultaneous dual writes, hot backend switching, generic multi-database plugins, ORM replacement, product redesign, new sharing capabilities, full-installation conversion through the user-export endpoint, automatic production deployment, and multi-replica application correctness. PostgreSQL storage support alone does not make the in-memory scheduler, events, caches and rate limits distributed; default deployment remains one application replica.

## Success criteria

1. A fresh and supported legacy SQLite deployment and fresh PostgreSQL deployment pass the same required scenarios; upgrades are repeatable and fail without partial unknown-schema mutation.
2. All FR-001 through FR-014 map to implementation packages and observable checks. Both backends pass CI; neither is optional or allowed to fail.
3. All four source/target user-backup pairs pass round-trip and injected-failure checks. Native recovery is documented and rehearsed independently.
4. The production image builds without connecting to or creating a database and starts against each backend with verified readiness and restart persistence.
5. Container publishing can provide a pullable digest; deployment handoff documents remaining external inputs instead of inventing them.

## Explicit assumptions and execution inputs

Retain Drizzle 0.45.x / Kit 0.31.x initially; verify exact installed versions and lockfile during implementation. Plan PostgreSQL 16 and 17 as initial CI targets, and verify the actual CNPG major version before deployment; do not claim support beyond tested versions. Deployment remains single-replica. The user has not supplied registry ownership, target architecture, CNPG service/database/secret names, CA material or the external infrastructure checkout. These are deployment inputs, not blockers to producing this plan. No external deployment files were inspected here.
