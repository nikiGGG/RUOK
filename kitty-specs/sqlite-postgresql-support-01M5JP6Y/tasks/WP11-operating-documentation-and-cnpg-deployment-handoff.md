---
work_package_id: WP11
title: Operating documentation and CNPG deployment handoff
dependencies:
- WP10
requirement_refs:
- FR-001
- FR-004
- FR-009
- FR-010
- FR-014
tracker_refs: []
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
subtasks:
- T041
- T042
- T043
- T044
phase: Phase 3 - Verification and delivery
assignee: ''
agent: ''
history:
- at: '2026-10-22T21:06:35Z'
  actor: codex
  action: Implementation prompt authored; not started
agent_profile: node-norris
authoritative_surface: okr-app/docs/
create_intent:
- okr-app/docs/DATABASES.md
- okr-app/docs/CNPG-HANDOFF.md
execution_mode: code_change
owned_files:
- README.md
- okr-app/docs/SETUP.md
- okr-app/docs/MAINTENANCE.md
- okr-app/docs/DATABASES.md
- okr-app/docs/CNPG-HANDOFF.md
- okr-app/.env.example
role: implementer
tags: []
task_type: implement
---

# WP11: Operating documentation and CNPG deployment handoff

## Objectives & Success Criteria

A reviewer can deploy either mode and recover disposable data using the docs. The CNPG handoff is actionable with explicit missing environment inputs; task 115 is not falsely marked deployed or complete.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-001, FR-004, FR-009, FR-010, FR-014.

Dependencies: WP10. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T041 — Document both database modes and migration operations

Update existing SQLite-first instructions plus PostgreSQL connection/TLS examples. Explain env precedence, connection pool limits, supported versions, local storage/WAL constraints, legacy preflight, migration-only/readiness modes and no automatic backend transfer. Replace production db:push guidance.

### T042 — Document and validate native backup and recovery

Replace unsafe live checkpoint/copy recipes with SQLite backup API/CLI backup or stopped writers; describe PostgreSQL dump/restore/CNPG recovery. Distinguish installation backups from v2 user export and document exclusions, four portable backup directions and restore validation. Validate commands on disposable data.

### T043 — Prepare concrete external PR 11 handoff checklist

Reference https://git.24lab.space/nikg/my-automatiozation/pulls/11 as comment-provided context. List required CNPG write-service/database/role/Secret keys, CA, server major, namespace, image owner/digest/architecture and public/private pull credentials. Describe probes, one replica, migration Job/run ordering, PostgreSQL volume removal, HTTPS and backup recovery validation. Do not invent actual values or edit/deploy the absent external repository.

### T044 — Review rollout and remaining task-115 scope

Walk clean SQLite and PostgreSQL setup instructions, native recovery and rollback-to-prior-image/backup steps. Explain writes after cutover and limits of reverting DATABASE_TYPE. Record external deployment and wider usability/privacy evaluation as pending until observed; close this mission only for its own completed implementation scope.

## Expected files

- `README.md`
- `okr-app/docs/SETUP.md`
- `okr-app/docs/MAINTENANCE.md`
- `okr-app/docs/DATABASES.md`
- `okr-app/docs/CNPG-HANDOFF.md`
- `okr-app/.env.example`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

A reviewer can deploy either mode and recover disposable data using the docs. The CNPG handoff is actionable with explicit missing environment inputs; task 115 is not falsely marked deployed or complete. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
