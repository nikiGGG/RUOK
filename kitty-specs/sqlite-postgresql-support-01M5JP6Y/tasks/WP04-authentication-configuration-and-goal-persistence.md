---
work_package_id: WP04
title: Authentication, configuration and goal persistence
dependencies:
- WP03
requirement_refs:
- FR-003
- FR-006
- FR-007
- FR-011
tracker_refs: []
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this mission were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T013
- T014
- T015
- T016
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
- okr-app/tests/domains/auth/
- okr-app/tests/domains/goals/
- okr-app/src/lib/db/adapters/
execution_mode: code_change
owned_files:
- okr-app/src/lib/server/auth.ts
- okr-app/src/lib/server/config.ts
- okr-app/src/routes/api/auth/
- okr-app/src/routes/api/user/
- okr-app/src/routes/api/admin/users/
- okr-app/src/routes/api/admin/config/
- okr-app/src/routes/api/objectives/
- okr-app/src/routes/objectives/
- okr-app/src/routes/register/
- okr-app/src/routes/login/
- okr-app/src/lib/db/adapters/
- okr-app/tests/domains/auth/
- okr-app/tests/domains/goals/
role: implementer
tags: []
task_type: implement
---

# WP04: Authentication, configuration and goal persistence

## Objectives & Success Criteria

Identical fixtures yield equivalent auth/config/goal API results on both backends, with no cross-user reads/mutations. Changed consumers import no dialect schema/handle.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-003, FR-006, FR-007, FR-011.

Dependencies: WP03. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T013 — Migrate account, session and admin persistence

Implement auth repositories and update auth routes/helper, user preferences, user enable/disable and admin mutations. Preserve username behavior, bcrypt handling, expiry, flags, environment admin promotion, missing-row errors and session cookie behavior.

### T014 — Migrate bootstrap-independent system settings

Route config reads/writes and secret masking through repositories; keep DB connection settings outside system_config. Preserve cache invalidation and env fallbacks. Define race/conflict handling without leaking backend SQL errors.

### T015 — Migrate objectives, key results and reflections

Update objective page loaders/API, KR mutations/progress and reflections with repositories. Preserve parent links, weights, scoreLabel, custom query links, null-month behavior and per-user scope. Keep pure types accessible to frontend.

### T016 — Verify goal journey and access contracts

Execute register/login/session/admin restriction and year→month→KR/progress/reflection scenarios against both adapters, including foreign-user IDs, missing records and precise date/boolean serialization. Run SQLite regression while staged legacy domains remain.

## Expected files

- `okr-app/src/lib/server/auth.ts`
- `okr-app/src/lib/server/config.ts`
- `okr-app/src/routes/api/auth/`
- `okr-app/src/routes/api/user/`
- `okr-app/src/routes/api/admin/users/`
- `okr-app/src/routes/api/admin/config/`
- `okr-app/src/routes/api/objectives/`
- `okr-app/src/routes/objectives/`
- `okr-app/src/routes/register/`
- `okr-app/src/routes/login/`
- `okr-app/src/lib/db/adapters/`
- `okr-app/tests/domains/auth/`
- `okr-app/tests/domains/goals/`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

Identical fixtures yield equivalent auth/config/goal API results on both backends, with no cross-user reads/mutations. Changed consumers import no dialect schema/handle. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
