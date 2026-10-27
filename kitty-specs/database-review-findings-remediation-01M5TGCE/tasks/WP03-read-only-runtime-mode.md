---
work_package_id: WP03
title: Honor no-DDL runtime verification
dependencies:
- WP01
- WP02
requirement_refs:
- FR-003
- FR-008
- NFR-001
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
subtasks:
- T010
- T011
- T012
- T013
phase: Application remediation
history:
- at: '2026-10-27T20:28:34Z'
  actor: codex
  action: Prompt authored; implementation not started
agent_profile: node-norris
authoritative_surface: okr-app/src/lib/db/
create_intent:
- okr-app/src/lib/db/migrations/postgres-verify.ts
- okr-app/src/lib/db/migration-mode.ts
- okr-app/tests/db/runtime-mode.test.ts
- okr-app/tests/db/postgres-no-ddl.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP03/
execution_mode: code_change
owned_files:
- okr-app/src/lib/db/migrations/migrate.ts
- okr-app/src/lib/db/migrations/postgres-migrator.ts
- okr-app/src/lib/db/migrations/postgres-verify.ts
- okr-app/src/lib/db/migration-mode.ts
- okr-app/scripts/db-migrate.ts
- okr-app/tests/db/postgres.migration.test.ts
- okr-app/tests/db/runtime-mode.test.ts
- okr-app/tests/db/postgres-no-ddl.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP03/
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Use `/ad-hoc-profile-load` to load `node-norris` from frontmatter
before parsing the rest of this prompt. The canonical profile-load skill may
resolve the alias. Apply the loaded profile as `implementer` with `codex`.
Do not infer a different profile from the file name.

# WP03 — Honor no-DDL runtime verification

## Objective and independent success criteria

Application/CLI migration mode has one parser and verify performs no DDL or journal mutation on both successful and rejected storage.

Independent review evidence:
Live objectless runtime role with PUBLIC/runtime CREATE revoked, statement capture and object inventories on migrated/empty/outdated/incompatible storage.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-003, FR-008, NFR-001, NFR-004.
Plan concerns and decisions: consult the finding and IC mappings in tasks.md.

## Context and authority

Read these mission documents relative to this prompt:

- [Specification](../spec.md): acceptance and operator scope amendments.
- [Plan](../plan.md): architecture, concern map and decisions D-01–D-06.
- [Research](../research.md): observed defect locations and alternatives.
- [Data model](../data-model.md): descriptors and lifecycle invariants.
- [Runtime contract](../contracts/runtime-and-verification.md): externally visible behavior.
- [Quickstart](../quickstart.md): mandatory verification ordering.

Historical defect source: `okr-app/docs/reviews/sqlite-postgresql-support-2026-10-26.md`.
Do not modify that historical report. Inspected baseline is
`0572599edc3e79dded5893aaaaef6867394a5288`; use an isolated source copy when needed.
No implementation or executed regression is claimed by this prompt.

## Branch strategy and prerequisites

Planning base: `plan/sqlite-postgresql-support`.
Final merge target: `plan/sqlite-postgresql-support`.
Dependencies: WP01, WP02.
Use computed `lanes.json` to find the actual execution branch/worktree.
One worktree belongs to a computed lane, not automatically to each WP.
Do not create an ad-hoc branch or edit the planning checkout during implementation.
Before implementation the mission requires persisted `analysis-report.md` from
`/spec-kitty.analyze`; task finalization itself does not satisfy that gate.
Use the runtime-selected action, for example:

```bash
spec-kitty agent action implement WP03 --agent codex
```

Pass mission `database-review-findings-remediation-01M5TGCE` on mission-aware
commands and follow the resolver/runtime response rather than guessing paths.
Do not execute this implementation command while merely authoring tasks.

## Owned surfaces and safeguards

This WP alone owns the paths in `owned_files`; paths are repository-relative.
New literal paths are enumerated in `create_intent`. The evidence directory is
exclusive to this WP. Another WP may consume its published interfaces but must
not rewrite its source silently. Report any required out-of-map edit with a
specific rationale and coordinate ownership before implementation.

- `okr-app/src/lib/db/migrations/migrate.ts`
- `okr-app/src/lib/db/migrations/postgres-migrator.ts`
- `okr-app/src/lib/db/migrations/postgres-verify.ts`
- `okr-app/src/lib/db/migration-mode.ts`
- `okr-app/scripts/db-migrate.ts`
- `okr-app/tests/db/postgres.migration.test.ts`
- `okr-app/tests/db/runtime-mode.test.ts`
- `okr-app/tests/db/postgres-no-ddl.test.ts`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP03/`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T010 — Establish shared migration-mode contract

**Purpose**: Deliver this bounded part of WP03 without weakening its oracle.

**Implementation**:
Add a side-effect-free migration-mode helper accepting migrate/verify, defaulting absent to migrate and rejecting invalid values. Wire the CLI and publish the helper for WP04 application startup. Test the shared parser in a focused process fixture and preserve the original application mode-omission baseline. Fixed application accessor integration is delivered and verified in dependent WP04.

**Expected result / validation**:
Mode semantics are explicit and CLI delegates to the shared parser; WP04 has an exact API to consume.

**Boundary condition**:
Do not modify config.ts owned by WP01; coordinate through a separate module.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T011 — Split PostgreSQL inspection from privileged migration

**Purpose**: Deliver this bounded part of WP03 without weakening its oracle.

**Implementation**:
Before any createJournal branch, implement verify through a consistent read-only transaction, catalog shape validation and complete known journal checks. Retain pinned-client/advisory-lock behavior for migrations; verification must not repair storage.

**Expected result / validation**:
Empty/outdated/corrupt/incompatible schema yields actionable redacted failure with zero attempted DDL.

**Boundary condition**:
Do not require schema ownership or CREATE; compare physical metadata, not only journal timestamps.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T012 — Make SQLite verify noncreating

**Purpose**: Deliver this bounded part of WP03 without weakening its oracle.

**Implementation**:
In migration orchestration open verify handles read-only with fileMustExist semantics, without mkdir. Route to shared semantic verification; retain existing migrate creation behavior and always close handles.

**Expected result / validation**:
Missing path/directory remains absent and rejected existing DB remains unchanged.

**Boundary condition**:
Connection setup must not introduce persistent pragmas during read-only verification.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T013 — Prove restricted-role no-DDL behavior

**Purpose**: Deliver this bounded part of WP03 without weakening its oracle.

**Implementation**:
Provision migrated storage with a separate owner then runtime CONNECT/USAGE/DML/sequence/journal SELECT privileges only. Revoke PUBLIC CREATE and assert role owns no objects. Capture attempted statements and before/after inventories for successful startup verification and all rejection cases.

**Expected result / validation**:
Runtime DML works on migrated storage, no CREATE/ALTER/DROP attempt occurs on success or failure, and mode tests establish the helper contract for application handoff in WP04.

**Boundary condition**:
A CREATE permission failure is not sufficient proof of zero attempted DDL; save both statements and objects.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

## Verification and evidence handoff

Use real selected-backend execution wherever this WP claims a backend boundary.
Focused tests come first; run impacted existing suites after the final change.
Do not broaden or repeat green suites without a new change or unresolved concern.
Tests requiring PG/admin/native tools fail as missing prerequisites when absent;
never skip a required check or replace it with SQLite/mocked persistence.
Keep no-init and concurrency assertions strict; stability has no hidden retries.

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP03/`.
Store a manifest plus readable redacted logs/reports with SHA-256 checksums.
Each run records UTC start/end, exact command with secret placeholders, exit code,
source revision and dirty diff identity, backend/driver/tool versions and image
identity where applicable. Label baseline, controlled fault and fixed runs.
A controlled equivalent must name the exact defect, patch and intended assertion.
Temporary logs or test-file references alone are not closure evidence.
WP09 consumes these artifacts without rewriting this WP's evidence directory.

## Mandatory image-download stop rule

If ANY Docker image required for a check cannot be downloaded, stop ALL mission
work immediately, including unrelated tasks. Report the exact image/tag/digest,
registry, attempted command and redacted error, ask the operator for help and
wait for explicit direction to resume. Record the check blocked, never PASS or
an application defect. Do not substitute images/registries or alter proxy, TLS
or network configuration. This rule also applies to Dockerfile base/frontend pulls.

## Risks and mitigations

Verify must branch before createJournal; journal presence alone does not establish physical schema compatibility.

Missing live execution remains incomplete and blocks acceptance. Keep error
messages useful but redacted; never commit passwords, cookies, session secrets,
credential URLs or private CA keys. Controlled faults belong in isolated copies
and must never remain in the final source. Preserve unrelated pre-existing edits.

## Review guidance and definition of done

- All subtasks have event-sourced completion and independently inspectable proof.
- Requirements above are implemented or, for FR-007, truthfully retained as deferred.
- Targeted negative controls fail for the intended reason and fixed scenarios pass.
- Existing impacted behavior and supported historical positives remain intact.
- Live boundary claims include live runs, versions, revision and durable artifacts.
- Resource cleanup works on success, exception, timeout and shutdown as applicable.
- Scope/ownership are honored; cross-WP interface expectations are documented.
- No test was disabled, narrowed, retried into green or made non-blocking.
- CI/CD and historical review are unchanged; no RISK-2 closure is claimed.
- Any incomplete prerequisite or evidence gap is reported and prevents acceptance.

Reviewer should follow the actual call chain and inspect before/after artifacts;
a builder assertion, repository-only test or code inspection cannot prove a
higher-level runtime/HTTP/TLS/image boundary. Reject if the intended scenario
never executes or fixture setup fails before the claimed assertion.

## Activity log

- 2026-10-27T20:28:34Z — codex — Authored prompt and ownership; implementation not started.
