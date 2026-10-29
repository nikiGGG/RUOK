---
work_package_id: WP04
title: Recover initialization and keep probes truthful
dependencies:
- WP03
- WP10
requirement_refs:
- FR-003
- FR-006
- FR-008
- NFR-001
- NFR-002
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-database-review-findings-remediation-01M5TGCE
base_commit: 4a745701b0e0303d852179f75a5d44af1e5aefec
created_at: '2026-10-28T19:11:25.884962+00:00'
subtasks:
- T014
- T015
- T016
- T017
- T018
- T019
- T020
phase: Application remediation
agent: qwen
history:
- at: '2026-10-27T20:28:34Z'
  actor: codex
  action: Prompt authored; implementation not started
- at: '2026-10-27T21:33:04Z'
  actor: codex
  action: Applied authorized consistency-analysis recommendations; implementation remains unstarted
agent_profile: node-norris
authoritative_surface: okr-app/src/lib/db/
create_intent:
- okr-app/tests/db/availability.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP04/
execution_mode: code_change
owned_files:
- okr-app/src/lib/db/contracts.ts
- okr-app/src/lib/db/lifecycle.ts
- okr-app/src/lib/db/adapters/postgres.ts
- okr-app/src/lib/server/database.ts
- okr-app/src/hooks.server.ts
- okr-app/src/routes/api/health/+server.ts
- okr-app/src/routes/api/ready/+server.ts
- okr-app/tests/db/lifecycle.test.ts
- okr-app/tests/db/failure.test.ts
- okr-app/tests/db/availability.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP04/
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Use `/ad-hoc-profile-load` to load `node-norris` from frontmatter
before parsing the rest of this prompt. The canonical profile-load skill may
resolve the alias. Apply the loaded profile as `implementer` using Qwen CLI (`qwen`).
Do not infer a different profile from the file name.

# WP04 — Recover initialization and keep probes truthful

## Objective and independent success criteria

One retryable lifecycle owner supports explicit runtime verification, bounded live readiness and process-only health without stale attempts or leaked resources.

Independent review evidence:
Focused real-backend lifecycle/availability tests, mode propagation and packaged WP10 worker smoke; WP06 supplies full HTTP traces during authenticated writes blocked by real SQLite locks.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-003, FR-006, FR-008, NFR-001, NFR-002, NFR-004.
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
Dependencies: WP03, WP10.
Use computed `lanes.json` to find the actual execution branch/worktree.
One worktree belongs to a computed lane, not automatically to each WP.
Do not create an ad-hoc branch or edit the planning checkout during implementation.
Before implementation the mission requires persisted `analysis-report.md` from
`/spec-kitty.analyze`; task finalization itself does not satisfy that gate.
Use the runtime-selected action, for example:

```bash
spec-kitty agent action implement WP04 --agent qwen --mission database-review-findings-remediation-01M5TGCE
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

- `okr-app/src/lib/db/contracts.ts`
- `okr-app/src/lib/db/lifecycle.ts`
- `okr-app/src/lib/db/adapters/postgres.ts`
- `okr-app/src/lib/server/database.ts`
- `okr-app/src/hooks.server.ts`
- `okr-app/src/routes/api/health/+server.ts`
- `okr-app/src/routes/api/ready/+server.ts`
- `okr-app/tests/db/lifecycle.test.ts`
- `okr-app/tests/db/failure.test.ts`
- `okr-app/tests/db/availability.test.ts`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP04/`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T014 — Capture failures and define lifecycle ownership

**Purpose**: Deliver this bounded part of WP04 without weakening its oracle.

**Implementation**:
Reproduce sticky opening/initializing rejection and cached readiness behavior. Implement one state/generation owner with shared open attempt, successful-only publication, finally cleanup, partial-resource close and bounded retry cooldown <=1s. Fence shutdown/reset against stale completion.

**Expected result / validation**:
Concurrent callers share an attempt; rejection permits recovery; close cannot resurrect resources.

**Boundary condition**:
No automatic replay of failed application writes or unbounded background retry loop.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T015 — Add bounded live availability to adapters

**Purpose**: Deliver this bounded part of WP04 without weakening its oracle.

**Implementation**:
Extend DatabaseServices with checkAvailability against a required application table. Bound pg checkout and query within a 3-second total probe budget, release/destroy timed-out resources and handle idle pool errors. Use WP10 asynchronous worker availability request: readiness wait is at most 3s including queue time, while all SQLite lock waits stay in the worker with configured busy timeout preserved. Expired checks are not queued repeatedly and cannot cancel or replay an active business transaction.

**Expected result / validation**:
Saturated pool, actual outage and idle errors report unavailable without process termination or leaked work; later success can recover.

**Boundary condition**:
Do not use a separate healthy pool that masks exhaustion of the real application pool.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T016 — Consume runtime mode and remove sticky accessor cache

**Purpose**: Deliver this bounded part of WP04 without weakening its oracle.

**Implementation**:
Make server/database.ts delegate to the single lifecycle owner and pass the WP03 shared migration-mode result. Audit all getReadiness callers when moving from sync state to async live check. Preserve lazy imports and public typed repositories.

**Expected result / validation**:
Explicit verify reaches the no-DDL path; absent mode still migrates; imports alone perform no filesystem/network I/O.

**Boundary condition**:
Do not retain a second promise that survives failure or bypass schema validation on reopen.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T017 — Separate exact probe routes from startup and auth

**Purpose**: Deliver this bounded part of WP04 without weakening its oracle.

**Implementation**:
Resolve health without database/plugin/session work. Ready triggers initialization without awaiting long migration, returns 503 during attempts and awaits bounded live availability once initialized. Ordinary requests retain existing auth and wait for the owner; clear hook initialization failure in finally.

**Expected result / validation**:
Contract JSON/status fields are preserved; no broad prefix or query-string auth bypass; probes finish within five seconds.

**Boundary condition**:
Full HTTP outage/recovery timing is verified in WP06; focused tests here cannot replace it.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T018 — Integrate worker-owned SQLite initialization

**Purpose**: Deliver this bounded part of WP04 without weakening its oracle.

**Implementation**:
Consume WP10 runSqlitePreparation(config, options) and its worker-backed SqliteDatabaseServices facade; never invoke SQLite bootstrap or runtime SQL on the HTTP thread. Fence preparation/runtime generations and await owned-handle cleanup before replacement. Reuse WP10 packaging rather than editing worker/build files.

**Expected result / validation**:
Worker-owned preparation, runtime writes and availability integrate with one lifecycle owner; no stale generation can publish after close. WP10 build output resolves worker entrypoints without dev dependencies.

**Boundary condition**:
Keep the existing awaitable repository/atomic-operation contract and use WP10 internal message APIs. Never replay writes on timeout or terminate the business worker merely because a readiness wait expired.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T019 — Verify worker build and lifecycle integration

**Purpose**: Deliver this bounded part of WP04 without weakening its oracle.

**Implementation**:
Build using WP10 Vite worker emission and the existing npm run build command; verify lazy imports and dev/test worker resolution plus startup/close behavior in the packaged app. Run focused existing lifecycle/failure and WP10 worker suites directly with installed Vitest. WP11 alone activates package commands after WP05/WP06/WP07 files exist; do not refer to absent downstream suites from current commands.

**Expected result / validation**:
Existing commands continue to target existing files and build output contains worker artifacts; no new command requires a future package. Focused lifecycle and worker suites are independently executable before WP05/WP06.

**Boundary condition**:
WP10 owns SQLite facade/worker/build helper/Vite config/Dockerfile; WP11 owns package.json command wiring. WP04 consumes their established interfaces and owns lifecycle/probes/PostgreSQL adapter only.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T020 — Execute lifecycle integration and publish evidence

**Purpose**: Deliver this bounded part of WP04 without weakening its oracle.

**Implementation**:
Run focused failure/lifecycle/mode/availability and build/import checks on real adapters. Record repeated failed initialization, concurrent attempts, idle errors, timeout cleanup and shutdown race outcomes. Preserve redacted before/after proof under this WP.

**Expected result / validation**:
Resource/timer generations remain bounded and startup mode is demonstrably honored; hand off HTTP trace expectations to WP06.

**Boundary condition**:
Do not claim RISK-1 closed until WP06 timed HTTP proof and WP09 final reconciliation exist.

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

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP04/`.
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

Async wrappers do not make better-sqlite3 nonblocking; Promise.race alone does not cancel pg checkout/query work.

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

Planning remediation: Consumes WP10 runtime isolation; command activation belongs to WP11.
