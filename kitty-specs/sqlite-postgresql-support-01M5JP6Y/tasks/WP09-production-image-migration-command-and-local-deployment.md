---
work_package_id: WP09
title: Production image, migration command and local deployment
dependencies:
- WP08
requirement_refs:
- FR-001
- FR-005
- FR-009
- FR-010
- FR-012
tracker_refs: []
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this mission were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T033
- T034
- T035
- T036
phase: Phase 3 - Verification and delivery
assignee: ''
agent: ''
history:
- at: '2026-10-22T21:06:35Z'
  actor: codex
  action: Implementation prompt authored; not started
agent_profile: node-norris
authoritative_surface: okr-app/Dockerfile
create_intent:
- okr-app/compose.postgres.yml
- okr-app/tests/container/
- okr-app/scripts/
execution_mode: code_change
owned_files:
- okr-app/Dockerfile
- okr-app/.dockerignore
- okr-app/docker-compose.yml
- okr-app/compose.postgres.yml
- okr-app/.env.example
- okr-app/package.json
- okr-app/scripts/
- okr-app/tests/container/
role: implementer
tags: []
task_type: implement
---

# WP09: Production image, migration command and local deployment

## Objectives & Success Criteria

One image builds from clean checkout without DB access and passes both backend production startup, migrate, readiness and restart tests. PostgreSQL does not require a SQLite filesystem.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-001, FR-005, FR-009, FR-010, FR-012.

Dependencies: WP08. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T033 — Make the production build reproducible and database-free

Use committed lockfile/npm ci, existing Node 22 build and native module prerequisites. Ensure build does not create/open any database or require network credentials. Copy both migration histories and compiled migration entrypoint; prune only packages not needed at runtime.

### T034 — Run the same non-root image in both modes

Retain SQLite data permissions/persistent volume and default DATABASE_PATH. Add PostgreSQL example with external DB settings, pool/TLS secret file mounts and no SQLite volume dependency. Use dedicated liveness/readiness endpoints with correct startup grace and shutdown.

### T035 — Provide clean local SQLite and PostgreSQL examples

Keep existing Compose setup usable and document external proxy network requirements; add a standalone development/smoke path that can run without that preexisting network. Avoid production credential defaults or secrets baked into image. Migration-only invocation works with production dependencies.

### T036 — Smoke-test build, runtime and persistence

Build without DB access, start image for each mode, run migration command/probes and goal/task scenario, restart and verify persistence. Verify PostgreSQL mode with read-only app filesystem/no data mount and trusted TLS setup. Record tested architecture; arm64 requires native module build/runtime validation.

## Expected files

- `okr-app/Dockerfile`
- `okr-app/.dockerignore`
- `okr-app/docker-compose.yml`
- `okr-app/compose.postgres.yml`
- `okr-app/.env.example`
- `okr-app/package.json`
- `okr-app/scripts/`
- `okr-app/tests/container/`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

One image builds from clean checkout without DB access and passes both backend production startup, migrate, readiness and restart tests. PostgreSQL does not require a SQLite filesystem. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
