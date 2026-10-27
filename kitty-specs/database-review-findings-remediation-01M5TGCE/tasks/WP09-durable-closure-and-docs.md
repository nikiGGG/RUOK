---
work_package_id: WP09
title: Reconcile evidence and operating documentation
dependencies:
- WP01
- WP02
- WP03
- WP04
- WP05
- WP06
- WP07
- WP08
requirement_refs:
- FR-007
- FR-008
- NFR-001
- NFR-003
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
subtasks:
- T039
- T040
- T041
- T042
- T043
phase: Application remediation
history:
- at: '2026-10-27T20:28:34Z'
  actor: codex
  action: Prompt authored; implementation not started
agent_profile: curator-carla
authoritative_surface: okr-app/docs/
create_intent:
- okr-app/docs/reviews/database-review-findings-remediation.md
- okr-app/docs/reviews/evidence/database-review-remediation/WP09/
execution_mode: code_change
owned_files:
- okr-app/docs/DATABASES.md
- okr-app/docs/DATABASE-VERIFICATION.md
- okr-app/docs/reviews/database-review-findings-remediation.md
- okr-app/docs/reviews/evidence/database-review-remediation/WP09/
role: curator
tags: []
task_type: implement
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Use `/ad-hoc-profile-load` to load `curator-carla` from frontmatter
before parsing the rest of this prompt. The canonical profile-load skill may
resolve the alias. Apply the loaded profile as `curator` with `codex`.
Do not infer a different profile from the file name.

# WP09 — Reconcile evidence and operating documentation

## Objective and independent success criteria

Every in-scope finding has complete durable before/after proof and accurate operating docs; RISK-2 remains explicitly unresolved/operator-deferred.

Independent review evidence:
Final full/backend/application/build/stability/image evidence reconciliation, six complete disposition rows and unchanged CI/CD surfaces.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-007, FR-008, NFR-001, NFR-003, NFR-004.
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
Dependencies: WP01, WP02, WP03, WP04, WP05, WP06, WP07, WP08.
Use computed `lanes.json` to find the actual execution branch/worktree.
One worktree belongs to a computed lane, not automatically to each WP.
Do not create an ad-hoc branch or edit the planning checkout during implementation.
Before implementation the mission requires persisted `analysis-report.md` from
`/spec-kitty.analyze`; task finalization itself does not satisfy that gate.
Use the runtime-selected action, for example:

```bash
spec-kitty agent action implement WP09 --agent codex
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

- `okr-app/docs/DATABASES.md`
- `okr-app/docs/DATABASE-VERIFICATION.md`
- `okr-app/docs/reviews/database-review-findings-remediation.md`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP09/`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T039 — Inventory finding evidence and provenance

**Purpose**: Deliver this bounded part of WP09 without weakening its oracle.

**Implementation**:
Collect links from WP01–WP08 evidence directories and verify baseline/fault and fixed run commands, statuses, times, revisions/diffs, environment versions, image identities and checksums. Redact secret material and distinguish local IDs from digests.

**Expected result / validation**:
Each of six rows has replayable durable artifacts; missing or blocked proof remains incomplete.

**Boundary condition**:
Do not change evidence owned by earlier WPs silently; return a concrete evidence gap to its owner.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T040 — Execute integrated required suites and UI comparison

**Purpose**: Deliver this bounded part of WP09 without weakening its oracle.

**Implementation**:
Run npm test, SQLite/backend PostgreSQL and required recovery, both application suites, production build and check. Capture current UI baseline from the inspected baseline revision using an isolated source copy and compare diagnostic identities. Confirm ten-run stability evidence and all mandatory live scenarios.

**Expected result / validation**:
Required/full/backend suites have zero failures; no mandatory skip and no new UI failures hidden by historical counts.

**Boundary condition**:
Do not weaken scripts/assertions, repair unrelated UI debt or repeatedly rerun green suites without reason.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T041 — Align database operating and verification docs

**Purpose**: Deliver this bounded part of WP09 without weakening its oracle.

**Implementation**:
Document actual migration/verify role separation, read-only rejection, supported schema adoption, TLS precedence, probe/retry bounds, required PG/native tools and manual both-mode image verification. Remove unsupported behavior claims only in in-scope operating docs.

**Expected result / validation**:
Commands and claims match demonstrated implementation and linked execution evidence.

**Boundary condition**:
Do not redesign CI/CD via instructions or edit the original historical review.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T042 — Write closure report retaining operator deferral

**Purpose**: Deliver this bounded part of WP09 without weakening its oracle.

**Implementation**:
Create a finding disposition row for DRIFT-1–5 and RISK-1 linking requirements, changed behavior, regression names, baseline/fault proof, fixed results, revision/environment and durable artifacts. Retain RISK-2 as unresolved/operator-deferred with no fix/waiver claim.

**Expected result / validation**:
All six in-scope findings close only when evidence is complete; report cannot claim all seven historical findings resolved.

**Boundary condition**:
If any mandatory execution is missing, keep report incomplete and block acceptance rather than issuing an optimistic verdict.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T043 — Verify mission constraints and hand off acceptance

**Purpose**: Deliver this bounded part of WP09 without weakening its oracle.

**Implementation**:
Compare workflow and CI/CD paths to the inspected baseline and verify no repository settings/publication/deployment changes were made. Confirm no fault patch/private secret remains, run diff checks and summarize outstanding prerequisites accurately.

**Expected result / validation**:
SC-001–SC-007 are reconciled; next step is governed review/acceptance, not unrequested deployment.

**Boundary condition**:
If a required image pull failed, ALL work must already have stopped; a closure report must not work around that blocker.

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

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP09/`.
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

Green test references are not executed evidence; historical UI error counts are not a permanent allowance.

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
