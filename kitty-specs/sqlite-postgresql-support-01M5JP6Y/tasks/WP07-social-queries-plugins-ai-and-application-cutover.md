---
work_package_id: WP07
title: Social, queries, plugins, AI and application cutover
dependencies:
- WP06
requirement_refs:
- FR-003
- FR-005
- FR-006
- FR-007
- FR-011
tracker_refs: []
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this mission were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T025
- T026
- T027
- T028
phase: Phase 2 - Application
assignee: ''
agent: ''
history:
- at: '2026-10-22T21:06:35Z'
  actor: codex
  action: Implementation prompt authored; not started
agent_profile: node-norris
authoritative_surface: okr-app/src/lib/server/
create_intent:
- okr-app/tests/domains/integrations/
execution_mode: code_change
owned_files:
- okr-app/src/lib/server/query/
- okr-app/src/lib/server/plugins/
- okr-app/src/lib/server/ai/
- okr-app/src/lib/server/events.ts
- okr-app/src/lib/types.ts
- okr-app/src/lib/db/
- okr-app/src/routes/api/queries/
- okr-app/src/routes/api/dashboard/
- okr-app/src/routes/api/friends/
- okr-app/src/routes/api/plugins/
- okr-app/src/routes/api/ai/
- okr-app/src/routes/api/admin/logs/
- okr-app/src/routes/queries/
- okr-app/src/routes/friends/
- okr-app/src/routes/admin/
- okr-app/src/routes/settings/
- okr-app/src/routes/+layout.server.ts
- okr-app/src/hooks.server.ts
- okr-app/tests/domains/integrations/
- okr-app/src/routes/api/backup/
role: implementer
tags: []
task_type: implement
---

# WP07: Social, queries, plugins, AI and application cutover

## Objectives & Success Criteria

All application domains, including backup/restore, use the selected backend and readiness precedes jobs. PostgreSQL does not open SQLite. No raw driver imports remain in application consumers; no existing feature is disabled.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-003, FR-005, FR-006, FR-007, FR-011.

Dependencies: WP06. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T025 — Migrate social views, dashboards and custom-query host

Preserve friend requests/accept/decline/unfriend, notes visible only to their author, existing dashboard permissions, saved query/widgets and QuickJS daily/tasks/objectives bridge. Keep the JavaScript Query API and its error/time limits; do not expose raw SQL.

### T026 — Migrate plugin, AI and administration persistence

Move OAuth callbacks/state persistence, plugin manager/sync, AI tools/configurations and query audit logs/admin statistics through typed repositories. Stub external providers in tests. Preserve secret masking and ownership; keep process-local behavior documented.

### T027 — Cut over application imports and startup ordering

Inventory every db/schema import and SQLite terminal; classify Map/Promise false positives. Move frontend types to canonical models, switch consumers to selected repositories, await ready before auth/scheduler and close jobs/DB on exit. Remove the old module-level SQLite runtime including backup/restore, which already uses the portable executor from WP06. Retire legacy module-level SQLite connections and validate the complete selected-backend import graph.

### T028 — Verify integration flows and cutover completeness

Run real DB tests for friends/notes/privacy, custom-query renders/progress, AI persistence, stubbed Fitbit/Oura writes and admin audit. Assert postgres startup never touches SQLite even through legacy imports. Audit all 67 original persistence consumer files and confirm that no temporary unsupported feature or wrong-backend import remains.

## Expected files

- `okr-app/src/lib/server/query/`
- `okr-app/src/lib/server/plugins/`
- `okr-app/src/lib/server/ai/`
- `okr-app/src/lib/server/events.ts`
- `okr-app/src/lib/types.ts`
- `okr-app/src/lib/db/`
- `okr-app/src/routes/api/queries/`
- `okr-app/src/routes/api/dashboard/`
- `okr-app/src/routes/api/friends/`
- `okr-app/src/routes/api/plugins/`
- `okr-app/src/routes/api/ai/`
- `okr-app/src/routes/api/admin/logs/`
- `okr-app/src/routes/queries/`
- `okr-app/src/routes/friends/`
- `okr-app/src/routes/admin/`
- `okr-app/src/routes/settings/`
- `okr-app/src/routes/+layout.server.ts`
- `okr-app/src/hooks.server.ts`
- `okr-app/tests/domains/integrations/`
- `okr-app/src/routes/api/backup/`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

All application domains, including backup/restore, use the selected backend and readiness precedes jobs. PostgreSQL does not open SQLite. No raw driver imports remain in application consumers; no existing feature is disabled. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
