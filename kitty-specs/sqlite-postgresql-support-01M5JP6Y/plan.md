# Implementation plan: SQLite and PostgreSQL

## Summary

Preserve SQLite as RUOK's default and add PostgreSQL with equal application behavior. Move persistence behind typed domain ports, retain concrete Drizzle adapters, repair migration lifecycle and restore atomicity, then validate and package the same app for both backends. Source requirements: [spec.md](spec.md); evidence and alternatives: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 22; Svelte 5 / SvelteKit 2.49.
**Primary Dependencies**: Drizzle ORM 0.45.x, Drizzle Kit 0.31.x, better-sqlite3 12.x, proposed node-postgres pg with pinned tested version; adapter-node 5.4.
**Storage**: SQLite persistent local/block file by default; external PostgreSQL, initially test majors 16 and 17.
**Testing**: Introduce Vitest server integration tests and shared real-database fixtures; production Node/container smoke tests; npm run check/build. Browser tests only for essential goal/privacy flows where HTTP coverage is insufficient.
**Target Platform**: Node 22 Linux; Docker local/Compose and one RUOK replica in Kubernetes with CNPG.
**Project Type**: Existing SvelteKit full-stack app under okr-app; planning-only changes in this request.
**Constraints**: Preserve current SQLite file/path and user APIs, no database build side effects, no broad type erasure, no multi-replica promise, no production data changes during planning.

## Component boundaries

Application routes, AI tools, plugin orchestration and custom-query hosts depend on typed domain repository operations and canonical models. A database factory owns backend validation, lifecycle and adapter selection. Adapters own dialect tables, SQL, codecs, transactions, migration execution and health probes. Application code never imports a raw connection or dialect schema. One canonical ownership/access contract is exercised against both adapters.

Proposed layout under `okr-app/src/lib/db/`:

- `config.ts`, `contracts.ts`, `models.ts`: validated settings, shared domain row/input types and repository interfaces.
- `index.ts`, `lifecycle.ts`: lazy singleton, ready/close/health and domain repository access.
- `schema/sqlite.ts`, `schema/postgres.ts`: concrete schemas, equivalent constraints; shared field/type descriptions where useful without building a generic ORM.
- `adapters/sqlite/`, `adapters/postgres/`: concrete query implementations grouped by auth, goals, planning, metrics, social, integrations and backup.
- `migrations/`: legacy detection/adoption and migration lifecycle code.
- `backup/`: canonical validation/remapping/command plan and result types; adapters execute the plan atomically.

Keep the current schema/client entrypoints during staged migration so each package remains runnable in SQLite mode. WP07 switches remaining consumers to the factory after all domains exist. Remove temporary exports then. Pure domain types move to models without leaking dialect types to frontend imports. WP01 is the architecture feasibility gate; revise this plan before proceeding if the actual locked Drizzle version requires a different interface.

## Configuration contract

| Setting | Default / behavior |
|---|---|
| DATABASE_TYPE | sqlite; accepts only sqlite or postgres; no URL-based autodetection |
| DATABASE_PATH | existing data/okr.db behavior; used only for SQLite |
| DATABASE_URL | required only for postgres; never logged; normal postgresql/postgres connection URLs |
| DATABASE_POOL_MAX | PostgreSQL only, proposed 5; validate positive bounded integer |
| DATABASE_CONNECT_TIMEOUT_MS | proposed 10000; bounded startup wait |
| DATABASE_STATEMENT_TIMEOUT_MS | PostgreSQL only, proposed 30000; migration-specific override documented |
| DATABASE_SSL_MODE | PostgreSQL disable or verify-full; explicit documented choice, verify-full requires hostname/CA validation |
| DATABASE_SSL_CA_FILE | optional PEM file for private CA; mounted secret, not image content |
| SQLITE_JOURNAL_MODE | WAL default; explicitly allow DELETE for a supported tested operational use case; do not imply NFS guarantees |
| SQLITE_BUSY_TIMEOUT_MS | proposed 5000; validate nonnegative bounded value |

PostgreSQL selection must never mkdir/open a SQLite file. Contradictory URL SSL parameters and explicit TLS settings must be rejected or resolved by one documented precedence rule, with tests; never silently disable verification. DATABASE_PATH in the existing Docker environment is ignored in PostgreSQL mode. Connection settings remain environment/bootstrap configuration, not system_config values that require opening the database first.

## Data model and codec strategy

See [data-model.md](data-model.md). Preserve text identifiers and JSON strings, boolean application values, Date application values and API serialization. Prefer PostgreSQL timestamptz(mode=date) normalized to existing SQLite second precision, double precision for real fields and bigint(mode=number) for potentially large millisecond totals. Validate safe-integer range. Schema parity tests cover null/default behavior, FK actions, indexes and enum-like validation. Do not silently add uniqueness for yearly null-month reflections or friendships where the existing schema does not guarantee it.

## Migration and startup protocol

1. A database-free build imports only definitions and lazy factories; filesystem and network I/O begin at runtime.
2. Resolve and validate config. Open only the selected backend with redacted diagnostics and bounded timeouts.
3. Acquire a backend migration lock: pg advisory lock on a pinned connection; SQLite supported exclusive startup/adoption transaction. Prevent competing startup/CLI mutation.
4. Classify fresh, journal-managed, recognized legacy, unknown drift. Fresh databases apply their own history. Recognized SQLite layouts are adopted only after structural fingerprint and data-integrity checks; record reconciled history atomically. Existing unknown schemas fail before mutation.
5. Enable/check FK behavior and verify schema version; migration errors abort readiness. No warn-and-continue schema repair. Never rewrite applied SQLite SQL.
6. Publish ready repositories. hooks await readiness before authentication and scheduler start. Provide /api/health for process liveness and /api/ready for selected backend/schema readiness, neither requiring login nor exposing secrets. Explicit migration-only command uses the same lifecycle and is shipped in production.
7. On shutdown, stop jobs and release DB resources; PostgreSQL outages change readiness and return controlled errors. Do not retry arbitrary writes automatically.

Schema changes beyond historical migrations require paired SQLite/PostgreSQL migrations in the same change. PostgreSQL migration DDL uses an application-owned schema/database and does not require superuser. Support a separate migration role/run command where runtime DDL is not permitted; deployment instructions choose exactly one migration runner and make startup version checks explicit.

## Domain migration sequence

WP01 establishes pinned dependencies, baseline failure ledger, real DB harness and the typed boundary spike. WP02 introduces schemas and adapters beside existing runtime. WP03 adds controlled migration/readiness lifecycle. WP04 moves authentication, users/config and goals/KRs/reflections. WP05 moves periods, tasks/timers/tags and metrics. WP06 completes portable backup/restore after both core domain groups are ready in sequence. WP07 migrates friends, dashboards, custom-query host, plugins, AI tools/config and admin/logs, then removes direct DB use outside adapters and performs final application cutover. WP08 closes parity and upgrade evidence. WP09 verifies production packaging. WP10 adds CI/publishing. WP11 updates operating docs and external deployment handoff.

Each repository operation has defined inputs, ownership scope, result/missing-row semantics and transaction needs. Preserve short-circuit behavior for empty ID lists, explicit ordering where visible, conflict handling and result counts. Classify .get/.all/.run call sites rather than changing every matching Map or Promise operation. Preserve the QuickJS JavaScript Query API and its async bridge. Mock external Fitbit/Oura/AI providers, never the database in backend contract tests.

## Backup/restore design

Inventory version-2 fields and omissions first. Validate the full document, types, sizes, name/index references and supported optional fields before deleting anything. Preserve remapped IDs and stable logical relationships; duplicate names or broken references must have an explicit deterministic legacy-compatible rule or a pre-mutation validation error. Protect serialized widget query references as well as KR query references. Canonical restore commands specify domain records and links, not raw SQL strings.

SQLite executes a complete validated command plan synchronously within better-sqlite3.transaction; PostgreSQL executes awaited commands on a single transaction-scoped client. No query in either restore escapes its transaction. Export uses a consistent snapshot and compatible timestamps/booleans. Test rollback after deletions and late insert failure, preferences, another user's data, active timers, nulls, text JSON, large durations, non-ASCII text and all four backend pairs. Reject unsupported backup versions before mutation. Maintain v2 reading if optional fields are added or a future version is necessary.

User export is intentionally not full installation backup. Native SQLite backup API/CLI backup and PostgreSQL pg_dump/restore or CNPG backups preserve installation credentials, accounts and configuration. Backend switching of a full installation requires a separately scoped converter; do not label user-export restoration as complete installation migration.

## Validation and release gates

- Shared adapter contract cases run against real better-sqlite3 and PostgreSQL 16/17. Fixed UTC clock/fixtures normalize UUIDs and Dates only where logically permitted; no mask of null/false/0 or dropped fields.
- Fresh migrations and repeated startup, every supported legacy fingerprint, incomplete journals, drift rejection, FK orphan preflight, lock contention and migration failure are mandatory.
- HTTP scenarios cover auth/admin permissions, year/month goals → daily tasks → progress, timer persistence, journals/reflections, metrics, custom query/render output, friend privacy, AI persistence and stubbed plugin writes.
- Four backup pairs: SQLite→SQLite, SQLite→PostgreSQL, PostgreSQL→SQLite, PostgreSQL→PostgreSQL. All require transactional failure checks and normalized export equality within documented scope.
- Clean npm ci, npm run check/build, no-DB image build, production startup/readiness in both modes and restart persistence. Capture preexisting check failures with exact evidence and resolve required blockers; do not silently suppress them.
- CI uses separate backend jobs and PostgreSQL service containers. No continue-on-error for parity. Pull requests validate/build without publish credentials; trusted branch/release jobs publish after the checks pass.
- Release image contains both drivers and migration assets plus runnable migration command. Publish SHA/release tags, record digest and establish pull permissions. Start with linux/amd64; add linux/arm64 only when native better-sqlite3/bcrypt build and smoke validation are included. Actual deployment architecture must be confirmed before release.

## Rollout, recovery and deployment handoff

SQLite upgrade: take verified native backup → stop writers → run preflight/migrate → start and exercise scenario → confirm persistence. On failure, stop the new application and restore the prior backup with the prior image; schema downgrade is not assumed safe.

PostgreSQL fresh deployment: provision application DB/role through existing CNPG processes → mount secret/CA → run selected migration job/command → run one app replica from immutable image → check readiness and create two-account fixture. For existing personal data use supported user exports with explicit exclusions; keep original SQLite file and old image for rollback until verified. Data written after cutover requires a deliberate recovery decision; merely reverting DATABASE_TYPE loses those writes.

External PR 11 follow-up needs actual CNPG write-service hostname, database/role/Secret keys, CA, version, registry digest/visibility and namespace. Update external manifests to use published image, backend settings, probes and migration sequencing; remove SQLite volume dependency only for PostgreSQL mode. Preserve HTTPS, backup retention and native recovery rehearsal. Record remaining wider task-115 usability/sharing checks. This mission authors the handoff; it does not claim external deployment completion.

## Risks and bounded decisions

The largest effort is persistence boundary migration across 67 source files, followed by trustworthy legacy adoption and atomic cross-backend restore. Keep domain packages reviewable and test SQLite after every conversion. Separate dialect schemas may drift; structural parity tests and paired migration review provide an enforceable guard. Enabling foreign keys can uncover historical orphan data: report and require an explicit recovery/import procedure instead of deleting it. PostgreSQL network latency exposes chatty query paths: batch obvious N+1 reads in domain adapters and use bounded pools, while broader optimization remains outside scope. Legacy data shapes, pg TLS precedence, widget JSON references and clean build dependency issues are assigned to explicit WPs before release.

## Requirement coverage

| Requirement | Work packages |
|---|---|
| FR-001 | WP01, WP02, WP03, WP09, WP11 |
| FR-002 | WP02, WP03, WP08 |
| FR-003 | WP01, WP02, WP04, WP05, WP07 |
| FR-004 | WP03, WP08, WP11 |
| FR-005 | WP03, WP07, WP09 |
| FR-006 | WP04, WP07, WP06, WP08 |
| FR-007 | WP04, WP05, WP07, WP08 |
| FR-008 | WP06, WP08 |
| FR-009 | WP01, WP02, WP03, WP09, WP11 |
| FR-010 | WP02, WP03, WP09, WP11 |
| FR-011 | WP01, WP04, WP05, WP07, WP06, WP08, WP10 |
| FR-012 | WP03, WP09 |
| FR-013 | WP10 |
| FR-014 | WP11 |
