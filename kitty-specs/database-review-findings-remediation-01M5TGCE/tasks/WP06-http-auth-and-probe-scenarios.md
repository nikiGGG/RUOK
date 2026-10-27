---
work_package_id: WP06
title: Prove HTTP authorization and outage recovery
dependencies:
- WP04
requirement_refs:
- FR-003
- FR-005
- FR-006
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
- T025
- T026
- T027
- T028
- T029
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
authoritative_surface: okr-app/tests/application/
create_intent:
- okr-app/tests/application/http-fixture.ts
- okr-app/tests/application/auth.suite.ts
- okr-app/tests/application/probes.suite.ts
- okr-app/tests/application/sqlite.test.ts
- okr-app/tests/application/postgres.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP06/
execution_mode: code_change
owned_files:
- okr-app/tests/application/http-fixture.ts
- okr-app/tests/application/auth.suite.ts
- okr-app/tests/application/probes.suite.ts
- okr-app/tests/application/sqlite.test.ts
- okr-app/tests/application/postgres.test.ts
- okr-app/src/routes/api/auth/
- okr-app/src/routes/api/admin/
- okr-app/src/routes/api/objectives/
- okr-app/docs/reviews/evidence/database-review-remediation/WP06/
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

# WP06 — Prove HTTP authorization and outage recovery

## Objective and independent success criteria

Real cookie/session/admin/two-account HTTP paths and timed storage outage/recovery work on both backends in the built server.

Independent review evidence:
Actual request/response/state assertions, controlled guard/ownership faults, and timed health/readiness traces with unchanged PID.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-003, FR-005, FR-006, FR-008, NFR-001, NFR-002, NFR-004.
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
spec-kitty agent action implement WP06 --agent qwen --mission database-review-findings-remediation-01M5TGCE
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

- `okr-app/tests/application/http-fixture.ts`
- `okr-app/tests/application/auth.suite.ts`
- `okr-app/tests/application/probes.suite.ts`
- `okr-app/tests/application/sqlite.test.ts`
- `okr-app/tests/application/postgres.test.ts`
- `okr-app/src/routes/api/auth/`
- `okr-app/src/routes/api/admin/`
- `okr-app/src/routes/api/objectives/`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP06/`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T025 — Build isolated production HTTP fixture

**Purpose**: Deliver this bounded part of WP06 without weakening its oracle.

**Implementation**:
Start built adapter-node on isolated port with checked migrations, private database config and disposable SQLite/PG storage. Own process exit/readiness deadlines, cookie jars and complete teardown. Provide reusable fixture API to WP07 without exporting a production test endpoint.

**Expected result / validation**:
Fixture proves real HTTP reaches hooks/auth/repositories and cleans processes/roles/files on failure.

**Boundary condition**:
Keep fixture/helper and sqlite.test.ts/postgres.test.ts owned by WP06; each entry imports auth.suite.ts and probes.suite.ts only. Verify both entries directly with installed Vitest and explicit backend before WP07 exists. WP07 supplies integrations.sqlite.test.ts/integrations.postgres.test.ts and imports this helper; no forward imports, dynamic optional discovery or edits to WP06 files are needed. WP11 later lists both pairs explicitly in package commands.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T026 — Exercise real session and admin requests

**Purpose**: Deliver this bounded part of WP06 without weakening its oracle.

**Implementation**:
Register/login admin, Alice and Bob through actual routes; validate returned cookies and authenticated identity, logout and expired/invalid session behavior. Test unauthenticated/non-admin admin denial and admin success. Repair only demonstrated in-scope route defects.

**Expected result / validation**:
No injected locals or fake repositories; denied reads contain no foreign data and denied writes leave state unchanged.

**Boundary condition**:
Do not weaken authentication behavior or broaden a probe bypass to fix fixture setup.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T027 — Prove two-account objective ownership

**Purpose**: Deliver this bounded part of WP06 without weakening its oracle.

**Implementation**:
Create distinct persisted objectives via HTTP and test list/read/update/delete from the other account and without login. Assert exact owner data and unchanged stored state after each denial. Preserve existing denial status contracts.

**Expected result / validation**:
Both backends reject unauthorized reads/writes/deletes without leaking identifiers/content.

**Boundary condition**:
Do not make data public or skip denial assertions to obtain backend parity.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T028 — Record startup and repeated outage HTTP timing

**Purpose**: Deliver this bounded part of WP06 without weakening its oracle.

**Implementation**:
Use one application process across unavailable startup, first recovery, later outage and second recovery. Poll once per second with bounded requests and record monotonic timings/PID; include concurrent initialization, idle errors and saturated pool. For SQLite, hold a real external write lock after startup, issue an authenticated ordinary application write and concurrently probe health/readiness on the same PID. Repeat with busy timeouts 0, 5000 and 30000 ms; retain the configured values, bound readiness queue wait to 3s, issue overlapping probes to prove coalescing/backpressure, then release the lock and verify recovery. Record write result separately without retry/replay.

**Expected result / validation**:
Health stays 200; readiness returns 503/200 within 5-second request, 10-second detection and 30-second recovery bounds without restart.

**Boundary condition**:
Use real storage failure/recovery, not mocked getReadiness; collect no-DDL runtime-mode HTTP proof with WP03 fixtures.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T029 — Demonstrate authorization regression sensitivity

**Purpose**: Deliver this bounded part of WP06 without weakening its oracle.

**Implementation**:
In isolated disposable source copies remove an admin guard and an ownership filter individually. Record patches/checksums and expected failing targeted tests, restore source and rerun green on both backends. Save redacted artifacts.

**Expected result / validation**:
Removing the behavior under test actually fails the suite and no fault code remains.

**Boundary condition**:
Do not mutate primary checkout or count a fixture/build error as the intended negative assertion.

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

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP06/`.
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

Injecting locals bypasses session auth; asserting only status can miss leaked data or unauthorized writes.

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
