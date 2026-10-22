---
work_package_id: WP08
title: Complete parity, upgrades and recovery evidence
dependencies:
- WP07
requirement_refs:
- FR-002
- FR-004
- FR-006
- FR-007
- FR-008
- FR-011
tracker_refs: []
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this mission were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T029
- T030
- T031
- T032
phase: Phase 3 - Verification and delivery
assignee: ''
agent: ''
history:
- at: '2026-10-22T21:06:35Z'
  actor: codex
  action: Implementation prompt authored; not started
agent_profile: node-norris
authoritative_surface: okr-app/tests/
create_intent:
- okr-app/docs/DATABASE-VERIFICATION.md
- okr-app/tests/
execution_mode: code_change
owned_files:
- okr-app/tests/
- okr-app/package.json
- okr-app/src/lib/db/
- okr-app/docs/DATABASE-VERIFICATION.md
role: implementer
tags: []
task_type: implement
---

# WP08: Complete parity, upgrades and recovery evidence

## Objectives & Success Criteria

Every required behavior has observed passing evidence on both backends; upgrades, four user-backup pairs and native recovery are verified. PostgreSQL support cannot be released with skipped domains or fallback SQLite tests.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-002, FR-004, FR-006, FR-007, FR-008, FR-011.

Dependencies: WP07. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T029 — Complete feature-to-contract coverage ledger

Map all 25 tables and every existing feature/API family to a concrete shared scenario. Run true SQLite and PostgreSQL 16/17 tests with no fallback/mocks at persistence layer. Add scenarios only for remaining behavioral gaps.

### T030 — Exercise upgrades, concurrency and operational failures

Run fresh/historical SQLite fixtures, journal/adoption/drift failures, FK orphan preflight, repeated migrations and competing startup. Exercise pg pool exhaustion, connection loss, verified TLS, lock cleanup and shutdown; assert redacted diagnostics and readiness transitions.

### T031 — Rehearse full installation native recovery

Create a disposable complete SQLite backup through supported backup mechanisms and PostgreSQL native dump/restore. Verify accounts/settings/social/plugin/AI metadata and application data, distinct from user-export pairs. Record recovery procedure and explain that native dumps cannot switch backend engines.

### T032 — Record release evidence and close scoped regressions

Run npm ci/check/build and the full required matrix. Resolve failures caused or exposed as release blockers; record any preexisting unrelated failures precisely instead of xfail/continue-on-error. Publish docs/DATABASE-VERIFICATION.md with commands, versions, results and limitations; rerun affected tests for fixes only.

## Expected files

- `okr-app/tests/`
- `okr-app/package.json`
- `okr-app/src/lib/db/`
- `okr-app/docs/DATABASE-VERIFICATION.md`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

Every required behavior has observed passing evidence on both backends; upgrades, four user-backup pairs and native recovery are verified. PostgreSQL support cannot be released with skipped domains or fallback SQLite tests. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
