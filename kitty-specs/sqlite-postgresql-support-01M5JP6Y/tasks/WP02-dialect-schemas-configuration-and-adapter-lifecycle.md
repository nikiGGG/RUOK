---
work_package_id: WP02
title: Dialect schemas, configuration and adapter lifecycle
dependencies:
- WP01
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-009
- FR-010
tracker_refs: []
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
subtasks:
- T005
- T006
- T007
- T008
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
- okr-app/src/lib/db/schema/
- okr-app/src/lib/db/adapters/
- okr-app/src/lib/db/config.ts
- okr-app/src/lib/db/lifecycle.ts
- okr-app/src/lib/db/index.ts
- okr-app/drizzle.postgres.config.ts
- okr-app/tests/db/
execution_mode: code_change
owned_files:
- okr-app/src/lib/db/
- okr-app/drizzle.config.ts
- okr-app/drizzle.postgres.config.ts
- okr-app/tests/db/
role: implementer
tags: []
task_type: implement
---

# WP02: Dialect schemas, configuration and adapter lifecycle

## Objectives & Success Criteria

Both schemas represent every current table/field and the factory selects exactly one backend. Config/lifecycle tests pass, including no SQLite file in PostgreSQL mode and trusted/untrusted CA cases.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-001, FR-002, FR-003, FR-009, FR-010.

Dependencies: WP01. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T005 — Define all dialect schemas and canonical codecs

Move the current SQLite schema behind a compatibility re-export and add all 25 PostgreSQL tables with matched names/defaults/nullability/FKs/indexes. Retain text IDs and JSON strings; normalize Date precision and use safe large-duration numeric codecs. Preserve nullable composite uniqueness semantics.

### T006 — Validate explicit database configuration

Implement DATABASE_TYPE=sqlite|postgres default sqlite, legacy DATABASE_PATH and required PostgreSQL DATABASE_URL. Validate pool/timeouts, journal mode and TLS CA/hostname settings. Reject conflicts and invalid configuration, ignore Docker DATABASE_PATH in postgres mode and redact DSNs.

### T007 — Implement selected-backend connection ownership

Create a lazy factory, readiness state, adapter lifecycle and shutdown. PostgreSQL mode must never open/mkdir SQLite. Bound pool and waits, handle pool errors, and implement verified TLS without merging URL options that erase CA settings.

### T008 — Verify schema and lifecycle contracts on both backends

Test invalid/missing env, no fallback, pool release, secret redaction, native codecs and logical schema parity. Leave existing application entrypoints in place until domain migration/cutover; keep build imports free of connection side effects in new code.

## Expected files

- `okr-app/src/lib/db/`
- `okr-app/drizzle.config.ts`
- `okr-app/drizzle.postgres.config.ts`
- `okr-app/tests/db/`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

Both schemas represent every current table/field and the factory selects exactly one backend. Config/lifecycle tests pass, including no SQLite file in PostgreSQL mode and trusted/untrusted CA cases. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
