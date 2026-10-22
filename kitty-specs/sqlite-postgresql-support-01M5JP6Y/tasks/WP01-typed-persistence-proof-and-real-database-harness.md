---
work_package_id: WP01
title: Typed persistence proof and real database harness
dependencies: []
requirement_refs:
- FR-001
- FR-003
- FR-009
- FR-011
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-sqlite-postgresql-support-01M5JP6Y
base_commit: 20ea8957a096eddd79a1cc4692c67f9df8d721d6
created_at: '2026-10-22T21:36:59.799967+00:00'
subtasks:
- T001
- T002
- T003
- T004
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
- okr-app/package-lock.json
- okr-app/src/lib/db/contracts.ts
- okr-app/src/lib/db/models.ts
- okr-app/tests/db/
execution_mode: code_change
owned_files:
- okr-app/package.json
- okr-app/package-lock.json
- okr-app/vite.config.ts
- okr-app/src/lib/db/contracts.ts
- okr-app/src/lib/db/models.ts
- okr-app/tests/db/
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# WP01: Typed persistence proof and real database harness

## Objectives & Success Criteria

Both concrete adapter prototypes compile without type erasure and pass real DB CRUD, codec and injected rollback tests. Default application behavior is still the existing SQLite runtime.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-001, FR-003, FR-009, FR-011.

Dependencies: None; starting package. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T001 — Pin reproducible dependencies and record baseline checks

Create a reviewed npm lockfile from the existing declared stack, add pg/@types/pg and the minimal integration harness. Run clean npm ci, check and build; record existing failures (including undeclared imports such as nanoid if reproduced) and fix release blockers explicitly without unrelated upgrades.

### T002 — Prove the adapter boundary with exact Drizzle versions

Compile and execute select/insert/update/delete/join/upsert/count and transaction examples with real SQLite and PostgreSQL. Define canonical row/input/result types and domain repository signatures. Do not export an overloaded SQLite|Postgres database union or use broad any casts.

### T003 — Create isolated real-backend fixture lifecycle

Introduce isolated SQLite temp files and PostgreSQL disposable databases/schemas, seed two users plus full representative model data, reset safely, close handles and use fixed dates. Make backend selection mandatory in test invocation; never substitute SQLite for a missing PostgreSQL service.

### T004 — Prove rollback and codec behavior before broad conversion

Demonstrate a synchronous SQLite atomic command executor and asynchronous pinned-client PostgreSQL executor through an awaitable public operation. Assert boolean, Date/second precision, null and >32-bit millisecond values. Amend plan/contracts if the proposed boundary fails the proof.

## Expected files

- `okr-app/package.json`
- `okr-app/package-lock.json`
- `okr-app/vite.config.ts`
- `okr-app/src/lib/db/contracts.ts`
- `okr-app/src/lib/db/models.ts`
- `okr-app/tests/db/`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

Both concrete adapter prototypes compile without type erasure and pass real DB CRUD, codec and injected rollback tests. Default application behavior is still the existing SQLite runtime. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
