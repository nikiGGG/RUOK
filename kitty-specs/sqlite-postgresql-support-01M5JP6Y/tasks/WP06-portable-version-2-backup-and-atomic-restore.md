---
work_package_id: WP06
title: Portable version-2 backup and atomic restore
dependencies:
- WP05
requirement_refs:
- FR-006
- FR-008
- FR-011
tracker_refs: []
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this mission were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T021
- T022
- T023
- T024
phase: Phase 2 - Application
assignee: ''
agent: ''
history:
- at: '2026-10-22T21:06:35Z'
  actor: codex
  action: Implementation prompt authored; not started
agent_profile: node-norris
authoritative_surface: okr-app/src/lib/db/
create_intent:
- okr-app/src/lib/db/backup/
- okr-app/tests/backup/
- okr-app/src/lib/db/adapters/
execution_mode: code_change
owned_files:
- okr-app/src/routes/api/backup/
- okr-app/src/lib/db/backup/
- okr-app/src/lib/db/adapters/
- okr-app/src/lib/db/client.ts
- okr-app/tests/backup/
role: implementer
tags: []
task_type: implement
---

# WP06: Portable version-2 backup and atomic restore

## Objectives & Success Criteria

All four backup pairs pass complete supported-field comparison; injected failures leave no partial restore and preserve other accounts. No raw SQLite restore route or temporary PostgreSQL limitation remains.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-006, FR-008, FR-011.

Dependencies: WP05. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T021 — Audit and validate the legacy backup contract

Create version-2 fixtures and a field/reference coverage ledger from the actual export/restore implementation. Include scoreLabel, preferences and serialized widget/saved-query references, name collisions, malformed records and missing links. Decide optional compatible additions versus new-version necessity while continuing to read v2. Exclude installation secrets intentionally.

### T022 — Implement canonical snapshot and restore command planning

Extract per-user consistent export and validation/remapping before mutation. Preserve stats/response semantics and new ID generation; reject unresolved invalid references deterministically. Define large backup batching/parameter limits without splitting atomicity.

### T023 — Implement genuine atomic execution in both adapters

Replace raw sqlite route use/.run calls with adapter restore executors: synchronous better-sqlite3 transaction and async pg transaction on one client. All deletes/inserts/preferences must share the transaction. Remove raw route driver imports; the old application client is finally retired during WP07 cutover.

### T024 — Verify every source-target pair and rollback boundary

Run SQLite→SQLite, SQLite→PostgreSQL, PostgreSQL→SQLite, PostgreSQL→PostgreSQL with normalized complete supported content, logical link integrity and unrelated-user preservation. Inject errors after deletion and near final preference writes; assert original rows/preferences restored. Test invalid version before mutation and consistent export under concurrent changes.

## Expected files

- `okr-app/src/routes/api/backup/`
- `okr-app/src/lib/db/backup/`
- `okr-app/src/lib/db/adapters/`
- `okr-app/src/lib/db/client.ts`
- `okr-app/tests/backup/`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

All four backup pairs pass complete supported-field comparison; injected failures leave no partial restore and preserve other accounts. No raw SQLite restore route or temporary PostgreSQL limitation remains. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
