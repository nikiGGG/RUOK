---
work_package_id: WP03
title: Versioned migrations, legacy adoption and readiness
dependencies:
- WP02
requirement_refs:
- FR-002
- FR-004
- FR-005
- FR-009
- FR-010
- FR-012
tracker_refs: []
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this mission were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T009
- T010
- T011
- T012
phase: Phase 1 - Persistence
assignee: ''
agent: ''
history:
- at: '2026-10-22T21:06:35Z'
  actor: codex
  action: Implementation prompt authored; not started
agent_profile: node-norris
authoritative_surface: okr-app/src/lib/db/
create_intent:
- okr-app/drizzle-postgres/
- okr-app/scripts/db-migrate.ts
- okr-app/src/lib/db/migrations/
- okr-app/src/routes/api/health/
- okr-app/src/routes/api/ready/
- okr-app/tests/db/
execution_mode: code_change
owned_files:
- okr-app/src/lib/db/
- okr-app/drizzle/
- okr-app/drizzle-postgres/
- okr-app/scripts/db-migrate.ts
- okr-app/package.json
- okr-app/src/routes/api/health/
- okr-app/src/routes/api/ready/
- okr-app/tests/db/
role: implementer
tags: []
task_type: implement
---

# WP03: Versioned migrations, legacy adoption and readiness

## Objectives & Success Criteria

Fresh and supported legacy migrations converge correctly; unknown layouts are unchanged and rejected. Both backend readiness paths fail correctly on migration/connectivity errors. Tests prove no build-time initialization.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-002, FR-004, FR-005, FR-009, FR-010, FR-012.

Dependencies: WP02. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T009 — Establish independent checked migration histories

Keep SQLite 0000–0006 and metadata unchanged; generate reviewed PostgreSQL baseline from its schema. Add explicit db:generate/sqlite, db:generate/postgres and migrate commands with one configuration contract; ship the migration runtime without dev dependencies. Paired future migrations are mandatory.

### T010 — Implement fingerprinted SQLite legacy adoption

Build fixtures for all-journal migrations, known db:push schema/no journal, incomplete journals, missing additive columns, orphan data and unknown drift. Verify tables/columns/indexes/FKs and data integrity before adoption; apply only supported deltas and journal facts atomically. Unknown drift must fail without partial changes or automatic deletion.

### T011 — Serialize initialization and expose readiness

Use one pinned pg connection/advisory migration lock and supported SQLite startup locking. Add migration-only mode and schema verification mode for deployments using separate DDL roles. Enable SQLite FK enforcement after preflight, journal/busy settings, and fail on migration errors; no ensureColumn warn-and-continue.

### T012 — Verify migrations and probes under failure

Test fresh/repeated startup, every supported legacy fixture, concurrent starts/CLI, failed migration rollback and unready DB/TLS failures. Add login-independent liveness/readiness endpoints with redacted output. Stage lifecycle integration for hooks/scheduler cutover in WP06.

## Expected files

- `okr-app/src/lib/db/`
- `okr-app/drizzle/`
- `okr-app/drizzle-postgres/`
- `okr-app/scripts/db-migrate.ts`
- `okr-app/package.json`
- `okr-app/src/routes/api/health/`
- `okr-app/src/routes/api/ready/`
- `okr-app/tests/db/`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

Fresh and supported legacy migrations converge correctly; unknown layouts are unchanged and rejected. Both backend readiness paths fail correctly on migration/connectivity errors. Tests prove no build-time initialization. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
