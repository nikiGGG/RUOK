---
work_package_id: WP05
title: Periods, tasks, timers, tags and metrics persistence
dependencies:
- WP04
requirement_refs:
- FR-003
- FR-007
- FR-011
tracker_refs: []
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
subtasks:
- T017
- T018
- T019
- T020
phase: Phase 2 - Application
assignee: ''
agent: ''
history:
- at: '2026-10-22T21:06:35Z'
  actor: codex
  action: Implementation prompt authored; not started
agent_profile: node-norris
authoritative_surface: okr-app/src/routes/
create_intent:
- okr-app/tests/domains/planning/
- okr-app/tests/domains/metrics/
- okr-app/src/lib/db/adapters/
execution_mode: code_change
owned_files:
- okr-app/src/routes/+page.server.ts
- okr-app/src/routes/daily/
- okr-app/src/routes/weekly/
- okr-app/src/routes/settings/tags/
- okr-app/src/routes/settings/metrics/
- okr-app/src/routes/api/periods/
- okr-app/src/routes/api/tasks/
- okr-app/src/routes/api/tags/
- okr-app/src/routes/api/metrics/
- okr-app/src/lib/server/metrics/
- okr-app/src/lib/db/adapters/
- okr-app/tests/domains/planning/
- okr-app/tests/domains/metrics/
role: implementer
tags: []
task_type: implement
---

# WP05: Periods, tasks, timers, tags and metrics persistence

## Objectives & Success Criteria

Both modes pass the same periods/tasks/timers/tags/metrics contract cases, including persistence and numeric edge cases. No SQLite-only terminal remains in owned application paths.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-003, FR-007, FR-011.

Dependencies: WP04. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T017 — Migrate periods, journals and commitment calculations

Replace synchronous SQLite terminals in daily/weekly/home loaders and period APIs. Preserve period selection, week/year edge cases, timezone/date strings, journals/reviews and commitments. Handle empty ID filters explicitly.

### T018 — Migrate tasks, attributes and timers

Implement task creation/update/delete/reorder and atomic timer start/stop updates with safe millisecond totals and unchanged payloads. Preserve child attributes and owner scope; avoid read-modify-write lost updates introduced by network latency.

### T019 — Migrate tags and fixed/flexible metrics

Implement tags/link queries, template version selection, daily values, external sources and computed-metric input retrieval through adapters. Keep canonical metric evaluation independent of dialect; batch obvious repeated reads.

### T020 — Verify full productivity fixture on both backends

Cover goal-linked daily/weekly activity, timer restart persistence and large values, completedAt/null behavior, attributes/tag joins and duplicate-pair legacy behavior, metric templates and timezone boundaries. Run read/write failure cases and user isolation.

## Expected files

- `okr-app/src/routes/+page.server.ts`
- `okr-app/src/routes/daily/`
- `okr-app/src/routes/weekly/`
- `okr-app/src/routes/settings/tags/`
- `okr-app/src/routes/settings/metrics/`
- `okr-app/src/routes/api/periods/`
- `okr-app/src/routes/api/tasks/`
- `okr-app/src/routes/api/tags/`
- `okr-app/src/routes/api/metrics/`
- `okr-app/src/lib/server/metrics/`
- `okr-app/src/lib/db/adapters/`
- `okr-app/tests/domains/planning/`
- `okr-app/tests/domains/metrics/`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

Both modes pass the same periods/tasks/timers/tags/metrics contract cases, including persistence and numeric edge cases. No SQLite-only terminal remains in owned application paths. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
