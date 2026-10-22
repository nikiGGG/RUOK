---
work_package_id: WP10
title: Required CI matrix and trusted GHCR publication
dependencies:
- WP09
requirement_refs:
- FR-011
- FR-013
tracker_refs: []
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
subtasks:
- T037
- T038
- T039
- T040
phase: Phase 3 - Verification and delivery
assignee: ''
agent: ''
history:
- at: '2026-10-22T21:06:35Z'
  actor: codex
  action: Implementation prompt authored; not started
agent_profile: node-norris
authoritative_surface: .github/workflows/
create_intent:
- .github/workflows/ruok-ci.yml
- .github/workflows/ruok-image.yml
execution_mode: code_change
owned_files:
- okr-app/package.json
- .github/workflows/ruok-ci.yml
- .github/workflows/ruok-image.yml
role: implementer
tags: []
task_type: implement
---

# WP10: Required CI matrix and trusted GHCR publication

## Objectives & Success Criteria

Both backend checks gate publication; PR jobs cannot push. Trusted release job can produce an immutable pullable digest with no embedded secrets. Record any registry-ownership/visibility prerequisite explicitly.

## Context & Constraints

Read [spec.md](../spec.md), [plan.md](../plan.md), [research.md](../research.md), [data-model.md](../data-model.md) and [persistence contract](../contracts/persistence.md). Load the configured profile with the profile-load skill before implementation. Requirement refs: FR-011, FR-013.

Dependencies: WP09. All database feature changes must preserve the existing default SQLite path and access contracts. New code must not expose raw driver handles or broad type casts to application consumers.

## Subtasks & Detailed Guidance

### T037 — Add required reproducible backend jobs

Use checkout, pinned Node setup/cache, npm ci/check/build and shared tests for SQLite plus PostgreSQL 16/17 services. Upload useful redacted failure evidence; do not mark any backend allowed-to-fail.

### T038 — Validate container changes on pull requests

Build from okr-app context and run practical image smoke checks. Pull-request events never receive registry push credentials or run publication; use least read permissions and pinned action revisions consistent with repository policy.

### T039 — Publish trusted branch/release images after checks

Configure GHCR owner/repository metadata from GitHub context, explicit contents:read/packages:write permissions only in publish job, SHA/release tags and recorded digest. Use trusted push/release events and same-revision required validation. No pull_request_target checkout of untrusted content.

### T040 — Verify workflow and release access contract

Validate syntax/events/permissions and test build-only execution; at authorized release confirm target owner, supported architecture and package visibility, then verify pull by digest. Prepare workflow now; do not claim registry publication without an actual run and pull evidence.

## Expected files

- `.github/workflows/ruok-ci.yml`
- `.github/workflows/ruok-image.yml`

New files/directories are declared in create_intent. If actual implementation needs additional shared files, update ownership/dependency metadata before claiming completion. Do not modify historical SQLite migration files.

## Test Strategy

Both backend checks gate publication; PR jobs cannot push. Trusted release job can produce an immutable pullable digest with no embedded secrets. Record any registry-ownership/visibility prerequisite explicitly. Run affected shared real-backend tests plus npm run check; run build when changing imports/lifecycle/dependencies. The harness/scripts are established in WP01; use its documented exact invocations. External AI/plugin APIs may be stubbed; database behavior must be real.

## Risks & Mitigations

Keep canonical validation and ownership logic shared. Only dialect query/transaction code belongs in adapters. PostgreSQL reads are asynchronous and SQLite transactions are synchronous internally; never await inside a better-sqlite3 transaction callback. Check backend-specific null, timestamp, conflict and parameter-limit behavior. Do not interpret successful mock-only checks as parity.

## Review Guidance

Check requirement refs, owned-file scope, real test results and the success criteria above. Reject silent backend fallback, lost fields, unbound transaction queries, disabled TLS verification, type erasure or unsupported migration adoption. Record exact commands/results and any remaining limitation. Leave downstream packages planned until their own implementation/review finishes.

## Activity Log

- 2026-10-22T21:06:35Z — codex — Authored from task 115 and repository research; implementation not started.
