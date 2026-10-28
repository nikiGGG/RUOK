---
work_package_id: WP11
title: Activate complete required verification commands
dependencies:
- WP05
- WP07
requirement_refs:
- FR-004
- FR-005
- FR-008
- NFR-001
- NFR-003
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-database-review-findings-remediation-01M5TGCE
base_commit: 4a745701b0e0303d852179f75a5d44af1e5aefec
created_at: '2026-10-28T20:13:58.142407+00:00'
subtasks:
- T049
- T050
- T051
- T052
phase: Application remediation
history:
- !!omap
  - at: '2026-10-27T21:33:04Z'
  - actor: codex
  - action: Authored authorized analysis remediation; implementation not started
agent_profile: node-norris
authoritative_surface: okr-app/
create_intent:
- okr-app/tests/verification/command-coverage.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP11/
execution_mode: code_change
owned_files:
- okr-app/package.json
- okr-app/tests/verification/command-coverage.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP11/
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Use `/ad-hoc-profile-load` (canonical `spk-doctrine-profile-load`) to load
`node-norris` before parsing this prompt. Implement using Qwen CLI (`qwen`).
Historical author metadata identifies who planned this WP, not its execution tool.

# WP11 — Activate complete required verification commands

## Objective and independent success criteria

Wire required package commands only after preflight, HTTP/auth/probe and integration suites exist, without missing-file references, skipped scenarios or ownership conflicts.

Independent review evidence:
Both backend application commands explicitly execute their HTTP and integration entry files; required PostgreSQL/recovery preflight fails for missing inputs/tools; all existing command coverage remains intact.

Priority: P1. Requirements: FR-004, FR-005, FR-008, NFR-001, NFR-003, NFR-004.
This is a planning amendment only; no application behavior or PASS is claimed.

## Context and authority

- [Specification](../spec.md): requirements and operator constraints.
- [Plan](../plan.md): architecture and remediation decisions D-07–D-09.
- [Research](../research.md): rationale and rejected alternatives.
- [Runtime contract](../contracts/runtime-and-verification.md): unchanged external promises.
- [Data model](../data-model.md): internal protocol and lifecycle invariants.
- [Quickstart](../quickstart.md): verification and Qwen handoff.

Read the U1/I1/H1 disposition in the current consistency report before claiming.
No business-schema change, user-feature addition or dependency upgrade is planned.
Preserve the historical review and checked migration files unchanged.

## Branch strategy and prerequisites

Planning base: `plan/sqlite-postgresql-support`.
Final merge target: `plan/sqlite-postgresql-support`.
Dependencies: WP05, WP07.
Use finalizer-generated lanes.json to find the actual branch/worktree.
Stable WP numbers do not determine execution order: dependencies do.
A fresh ready analysis-report.md is required before any implementation.
Use the runtime-selected action in Qwen CLI, for example:

```bash
spec-kitty agent action implement WP11 --agent qwen --mission database-review-findings-remediation-01M5TGCE
```

Pass explicit mission database-review-findings-remediation-01M5TGCE on
mission-aware commands. Do not run implement/review during planning remediation.

## Owned surfaces and safeguards

- `okr-app/package.json`
- `okr-app/tests/verification/command-coverage.test.ts`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP11/`

Only these files are owned here. Coordinate interface changes with consumers;
do not create overlapping file ownership. Any necessary out-of-map fix requires
a concrete rationale and ownership coordination. Preserve typed repositories,
backend choice, lazy imports, complete atomic operations and backup format.

Never modify .github/workflows/, CI/CD triggers/permissions/publication gates,
repository settings or deployment. RISK-2 remains unresolved/operator-deferred.
Existing assertions remain mandatory; do not skip or weaken tests to get green.

## Subtasks and detailed guidance

### T049 — Validate dependency-produced entrypoint inventory

**Purpose**: Validate dependency-produced entrypoint inventory within the existing persistence/verification contract.

**Implementation**:
Confirm WP05 provides scripts/require-postgres-test.ts with executable bundled mode, WP06 provides tests/application/sqlite.test.ts and postgres.test.ts, and WP07 provides integrations.sqlite.test.ts and integrations.postgres.test.ts. Inventory all current npm full/backend/recovery suites before editing package.json. Reject missing files or optional discovery rather than generating placeholder tests.

**Expected result / validation**:
Every planned command dependency is present before activation; suite inventory explicitly maps existing and new required test files.

**Boundary condition**:
WP11 depends on WP05/WP07, hence WP06/WP04/WP10 transitively. Stable numerical WP order must not override these dependencies.

**Execution record**:
Record exact command, UTC times, exit code, revision/diff identity and versions.
Retain original failure or controlled equivalent and the fixed passing result.
Do not count setup errors as the intended negative assertion.
Use event-sourced task completion rather than markdown checkboxes.

### T050 — Wire explicit application and PostgreSQL preflight commands

**Purpose**: Wire explicit application and PostgreSQL preflight commands within the existing persistence/verification contract.

**Implementation**:
Add test:application:sqlite running both tests/application/sqlite.test.ts and integrations.sqlite.test.ts, and the PostgreSQL counterpart running postgres.test.ts plus integrations.postgres.test.ts. Bundle/invoke the WP05 preflight before required PostgreSQL backend/recovery/application commands; preserve existing suite files and add new focused required regressions to appropriate full/backend commands. Retain passWithNoTests=false, no implicit skips and no removal/narrowing of existing tests.

**Expected result / validation**:
Both-backend new application paths run with real migrated storage. Missing PG URL/server/dump/restore tools fails nonzero before execution without credential output; all current suites remain discoverable.

**Boundary condition**:
Do not change CI/CD or package dependencies/lockfile. Worker build already works from WP10 Vite integration; no forward references to WP08 or WP09 files.

**Execution record**:
Record exact command, UTC times, exit code, revision/diff identity and versions.
Retain original failure or controlled equivalent and the fixed passing result.
Do not count setup errors as the intended negative assertion.
Use event-sourced task completion rather than markdown checkboxes.

### T051 — Prove command coverage and failure behavior

**Purpose**: Prove command coverage and failure behavior within the existing persistence/verification contract.

**Implementation**:
Add command-coverage checks that verify required entrypoint file membership and missing-file/no-tests failures, plus controlled missing-prerequisite subprocess cases. Execute the actual npm application/backend/recovery commands on both real backends with all prerequisites and retain exact test counts/outcomes. A static script membership assertion supplements but does not replace execution.

**Expected result / validation**:
Each new suite demonstrably runs from its documented npm command; negative controls fail for intended missing inputs, positives have zero failures/mandatory skips.

**Boundary condition**:
Use a fresh isolated fixture environment for prerequisite negatives and never print credential variables; dependency failures are not application PASS.

**Execution record**:
Record exact command, UTC times, exit code, revision/diff identity and versions.
Retain original failure or controlled equivalent and the fixed passing result.
Do not count setup errors as the intended negative assertion.
Use event-sourced task completion rather than markdown checkboxes.

### T052 — Publish runnable command handoff and durable evidence

**Purpose**: Publish runnable command handoff and durable evidence within the existing persistence/verification contract.

**Implementation**:
Record final command matrix, exact files and prerequisite behavior under WP11 evidence; hand to WP08 manual images and WP09 operating docs. Run npm build and affected full/backend/application suites as appropriate after final script edits; preserve worker artifacts and complete script coverage.

**Expected result / validation**:
All documented commands are usable at the WP11 boundary; source/tool versions, statuses and artifacts are durable. WP08/WP09 consume this complete boundary.

**Boundary condition**:
No publication, deployment, CI edit or premature six-finding closure; missing required live execution remains incomplete.

**Execution record**:
Record exact command, UTC times, exit code, revision/diff identity and versions.
Retain original failure or controlled equivalent and the fixed passing result.
Do not count setup errors as the intended negative assertion.
Use event-sourced task completion rather than markdown checkboxes.

## Verification and durable evidence

Run focused tests directly with the installed tool before impacted existing suites.
Every live boundary claim requires actual selected-backend execution; inspection
or a script existing on disk is not proof. Required PostgreSQL/tool checks must
fail for missing prerequisites and cannot be skipped or replaced by SQLite.
A zero-test run is a failure. Fault patches must stay in isolated source copies.

Evidence directory: `okr-app/docs/reviews/evidence/database-review-remediation/WP11/`.
Store redacted commands/logs/manifests with SHA-256 artifact checksums and distinct
baseline/fault/fixed results. Include revision, versions, source diff and image
identity where relevant. Never commit passwords, credential URLs, cookies,
session secrets or private CA keys. WP09 links these artifacts without rewriting.

## Mandatory image-download stop rule

If any required Docker image download fails, immediately stop ALL mission work.
Report exact image/tag/digest, registry, command and redacted error; ask operator
for help and wait for explicit direction. No alternate image/registry or proxy,
TLS/network workaround, skipped check, false PASS or independent continuation.
This applies equally to base/frontend images pulled implicitly during builds.

## Reviewer guidance and definition of done

- Every subtask has inspectable implementation and executed evidence.
- Original/controlled defects fail the intended regression; fixed behavior passes.
- Existing backend contracts and assertions remain intact.
- No resource leak, unbounded queue, replay or unsafe transaction split is hidden.
- Every entrypoint refers to files already supplied by its dependency closure.
- Current commands/build remain usable at this WP boundary.
- No optional/no-test success can mask absent mandatory coverage.
- Code stays within explicit ownership and consumes earlier published interfaces.
- Durable evidence is complete, redacted and revision-specific.
- No workflow, repository setting, publication or deployment is changed.
- Any missing execution remains incomplete and blocks acceptance.

Review the real call chain rather than builder/configuration assertions alone.
WP approval is not mission acceptance; all six findings need final evidence.
Implementation/review happen on the operator's other device using Qwen CLI.

## Activity log

- 2026-10-27T21:33:04Z — codex — Authored planning amendment; execution unstarted.
