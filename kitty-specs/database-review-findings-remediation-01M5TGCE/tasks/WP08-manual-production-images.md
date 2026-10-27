---
work_package_id: WP08
title: Make manual image verification fail truthfully
dependencies:
- WP05
- WP07
- WP11
requirement_refs:
- FR-004
- FR-008
- NFR-001
- NFR-002
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support.
  During /spec-kitty.implement this WP may branch from a dependency-specific base,
  but completed changes must merge back into plan/sqlite-postgresql-support unless
  the human explicitly redirects the landing branch.
subtasks:
- T035
- T036
- T037
- T038
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
authoritative_surface: okr-app/tests/container/
create_intent:
- okr-app/docs/reviews/evidence/database-review-remediation/WP08/
execution_mode: code_change
owned_files:
- okr-app/tests/container/lib.sh
- okr-app/tests/container/smoke-sqlite.sh
- okr-app/tests/container/smoke-postgres.sh
- okr-app/tests/container/smoke-host-sqlite.sh
- okr-app/tests/container/README.md
- okr-app/docs/reviews/evidence/database-review-remediation/WP08/
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

# WP08 — Make manual image verification fail truthfully

## Objective and independent success criteria

Manually initiated production-image validation proves both-backend objective persistence after restart and exits nonzero for loss or unreadiness.

Independent review evidence:
Same built production image identity, live PostgreSQL and SQLite write/restart/exact-read runs plus failing lost-write and never-ready controls.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-004, FR-008, NFR-001, NFR-002, NFR-004.
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
Dependencies: WP05, WP07, WP11.
Use computed `lanes.json` to find the actual execution branch/worktree.
One worktree belongs to a computed lane, not automatically to each WP.
Do not create an ad-hoc branch or edit the planning checkout during implementation.
Before implementation the mission requires persisted `analysis-report.md` from
`/spec-kitty.analyze`; task finalization itself does not satisfy that gate.
Use the runtime-selected action, for example:

```bash
spec-kitty agent action implement WP08 --agent qwen --mission database-review-findings-remediation-01M5TGCE
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

- `okr-app/tests/container/lib.sh`
- `okr-app/tests/container/smoke-sqlite.sh`
- `okr-app/tests/container/smoke-postgres.sh`
- `okr-app/tests/container/smoke-host-sqlite.sh`
- `okr-app/tests/container/README.md`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP08/`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T035 — Reproduce false positive and harden shared helpers

**Purpose**: Deliver this bounded part of WP08 without weakening its oracle.

**Implementation**:
Capture a controlled missing-write/restart-unready failure that the existing script incorrectly tolerates. Bound curl operations, check statuses/JSON parse results and propagate all required failures. Remove warn-then-PASS behavior.

**Expected result / validation**:
Missing objective, empty ID, bad status and timeout are fatal with clear redacted diagnostics.

**Boundary condition**:
Do not print passwords or session cookie jars; cleanup remains best effort without masking primary exit status.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T036 — Enforce exact write restart read in both modes

**Purpose**: Deliver this bounded part of WP08 without weakening its oracle.

**Implementation**:
Use actual auth, objective create, restart, readiness and authenticated exact ID/title read using the same account. Require explicit live PostgreSQL URL for the full run. Retain no-SQLite-dependency assertion; reuse same production image ID.

**Expected result / validation**:
Both scripts preserve original objective without recreation; missing prerequisite or lost state exits nonzero.

**Boundary condition**:
Re-login is allowed after restart but re-creating the objective is not; label local image ID versus registry digest accurately.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T037 — Run manual positive and negative image scenarios

**Purpose**: Deliver this bounded part of WP08 without weakening its oracle.

**Implementation**:
Build/run the existing production packaging manually, record source/image identity, test both modes with real storage, then inject controlled lost persistence and never-ready cases. Require nonzero negatives and successful positives with exact stored values.

**Expected result / validation**:
The scripts detect both targeted negative controls and production restart persistence is actually executed.

**Boundary condition**:
ANY required Docker image download failure stops ALL mission work; report exact registry/image/command/error and wait for explicit operator direction.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T038 — Document truthful image execution and evidence

**Purpose**: Deliver this bounded part of WP08 without weakening its oracle.

**Implementation**:
Update container README to match prerequisites, both-mode manual commands, exit semantics, probe expectations and stop rule. Publish image IDs/digests, commands, exit codes, versions and timing artifacts.

**Expected result / validation**:
No old CI-only or intentionally-broken-liveness claim remains in these docs; image proof is durable and reproducible.

**Boundary condition**:
Do not modify any workflow or publication logic; RISK-2 remains unresolved.

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

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP08/`.
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

Tolerated readiness failure or grep-only ID checks can produce false PASS; optional no-DB PostgreSQL mode cannot close live verification.

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
