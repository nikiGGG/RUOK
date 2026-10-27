---
work_package_id: WP05
title: Repair PostgreSQL operations and stability evidence
dependencies:
- WP04
requirement_refs:
- FR-004
- FR-006
- FR-008
- NFR-001
- NFR-003
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support.
  During /spec-kitty.implement this WP may branch from a dependency-specific base,
  but completed changes must merge back into plan/sqlite-postgresql-support unless
  the human explicitly redirects the landing branch.
subtasks:
- T021
- T022
- T023
- T024
phase: Application remediation
history:
- at: '2026-10-27T20:28:34Z'
  actor: codex
  action: Prompt authored; implementation not started
- at: '2026-10-27T21:33:04Z'
  actor: codex
  action: Applied authorized consistency-analysis recommendations; implementation
    remains unstarted
agent_profile: node-norris
authoritative_surface: okr-app/tests/
create_intent:
- okr-app/scripts/require-postgres-test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP05/
execution_mode: code_change
owned_files:
- okr-app/tests/db/postgres.operations.test.ts
- okr-app/tests/db/concurrency.test.ts
- okr-app/tests/db/no-init.test.ts
- okr-app/tests/db/_no-init-probe.ts
- okr-app/tests/recovery/postgres-recovery.test.ts
- okr-app/scripts/require-postgres-test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP05/
role: implementer
tags: []
task_type: implement
tracker_refs: []
agent: qwen
---

## ⚡ Do This First: Load Agent Profile

Use `/ad-hoc-profile-load` to load `node-norris` from frontmatter
before parsing the rest of this prompt. The canonical profile-load skill may
resolve the alias. Apply the loaded profile as `implementer` using Qwen CLI (`qwen`).
Do not infer a different profile from the file name.

# WP05 — Repair PostgreSQL operations and stability evidence

## Objective and independent success criteria

Operational scenarios reach real assertions on migrated storage, native recovery cannot skip required prerequisites, and concurrency/no-init regressions are stable.

Independent review evidence:
Migrated live pool/outage suite, seeded native dump/restore and ten consecutive independent concurrency/no-init passes without retries.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-004, FR-006, FR-008, NFR-001, NFR-003, NFR-004.
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
Dependencies: WP04.
Use computed `lanes.json` to find the actual execution branch/worktree.
One worktree belongs to a computed lane, not automatically to each WP.
Do not create an ad-hoc branch or edit the planning checkout during implementation.
Before implementation the mission requires persisted `analysis-report.md` from
`/spec-kitty.analyze`; task finalization itself does not satisfy that gate.
Use the runtime-selected action, for example:

```bash
spec-kitty agent action implement WP05 --agent qwen --mission database-review-findings-remediation-01M5TGCE
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

- `okr-app/tests/db/postgres.operations.test.ts`
- `okr-app/tests/db/concurrency.test.ts`
- `okr-app/tests/db/no-init.test.ts`
- `okr-app/tests/db/_no-init-probe.ts`
- `okr-app/tests/recovery/postgres-recovery.test.ts`
- `okr-app/scripts/require-postgres-test.ts`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP05/`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T021 — Migrate disposable operational databases

**Purpose**: Deliver this bounded part of WP05 without weakening its oracle.

**Implementation**:
Preserve the original fresh-database missing-users defect reproduction. Call migrateDatabase before pool/outage cases use repositories; assert expected application tables before exercising bounded pool and outage behavior. Preserve isolated databases and cleanup.

**Expected result / validation**:
Cases reach pool saturation/outage assertions and do not fail from missing users tables.

**Boundary condition**:
Do not change real outage cases into mocked query errors or remove existing assertions.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T022 — Fail required PostgreSQL prerequisite checks explicitly

**Purpose**: Deliver this bounded part of WP05 without weakening its oracle.

**Implementation**:
Add a side-effect-free command preflight requiring RUOK_TEST_PG_ADMIN_URL, reachable disposable PG18 and matching pg_dump/pg_restore/psql. Report missing prerequisites nonzero without credential output. Export a reusable assertPostgresPrerequisites helper and provide an executable bundled CLI mode. Verify it directly during WP05; WP11 wires package commands after the helper and all suites exist.

**Expected result / validation**:
Direct preflight/recovery execution fails nonzero for missing prerequisites and checks pg_restore before rehearsal. Required recovery tests no longer describe.skip. WP11 later activates this preflight for all required package commands.

**Boundary condition**:
No dependency install or image substitution to bypass a corporate registry blocker.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T023 — Execute native full-installation recovery

**Purpose**: Deliver this bounded part of WP05 without weakening its oracle.

**Implementation**:
Run seeded migrated PostgreSQL dump, recreate/restore and verify typed reads for accounts/sessions/config/social/plugin/AI/objectives. Assert actual server/tool compatibility, each command exit and final schema verification.

**Expected result / validation**:
Full installation data survives real native restore; commands and versions have durable artifacts.

**Boundary condition**:
Portable user export does not replace installation recovery; never pass raw credential URLs into committed transcripts.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T024 — Diagnose and prove concurrency/no-init stability

**Purpose**: Deliver this bounded part of WP05 without weakening its oracle.

**Implementation**:
Capture child stdout/stderr, signal and exit code; isolate output bundles and process environment; repair actual failure sources without weaker assertions. Run both regressions ten consecutive times with Vitest retry disabled.

**Expected result / validation**:
All ten runs pass with correct single journal/no duplicate migrations and unopened import state.

**Boundary condition**:
A failed run resets investigation, not a hidden retry; retain failure diagnostics and do not edit application files owned by WP04 without coordination.

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

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP05/`.
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

Broken fixture setup can fail before outage assertions; an entirely skipped recovery suite is not a successful required run.

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

- 2026-10-27T21:33:04Z — codex — Updated planning instructions for Qwen handoff; no implementation started.

Planning remediation: Follow amended dependency/ownership boundaries and Qwen execution instructions.
