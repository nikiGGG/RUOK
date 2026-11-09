---
work_package_id: WP07
title: Verify scheduler query friend and AI paths
dependencies:
- WP06
requirement_refs:
- FR-005
- FR-008
- NFR-001
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-database-review-findings-remediation-01M5TGCE
base_commit: 4a745701b0e0303d852179f75a5d44af1e5aefec
created_at: '2026-10-28T19:52:35.403701+00:00'
subtasks:
- T030
- T031
- T032
- T033
- T034
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
authoritative_surface: okr-app/tests/application/
create_intent:
- okr-app/tests/application/integrations.suite.ts
- okr-app/tests/application/plugin-fixture.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP07/
- okr-app/tests/application/integrations.sqlite.test.ts
- okr-app/tests/application/integrations.postgres.test.ts
execution_mode: code_change
owned_files:
- okr-app/tests/application/integrations.suite.ts
- okr-app/tests/application/plugin-fixture.ts
- okr-app/src/lib/server/plugins/scheduler.ts
- okr-app/src/lib/server/query/executor.ts
- okr-app/src/routes/api/queries/
- okr-app/src/routes/api/friends/
- okr-app/src/routes/api/ai/tool/
- okr-app/src/lib/server/ai/tools/
- okr-app/docs/reviews/evidence/database-review-remediation/WP07/
- okr-app/tests/application/integrations.sqlite.test.ts
- okr-app/tests/application/integrations.postgres.test.ts
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

# WP07 — Verify scheduler query friend and AI paths

## Objective and independent success criteria

Scheduler, QuickJS async bridge, saved queries, friend dashboard and AI tools are tested through real application entrypoints on both real databases.

Independent review evidence:
Persisted results from scheduled callback/manager, exact async query outputs, privacy/ownership denials and AI writes plus controlled broken-bridge failure.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-005, FR-008, NFR-001, NFR-004.
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
Dependencies: WP06.
Use computed `lanes.json` to find the actual execution branch/worktree.
One worktree belongs to a computed lane, not automatically to each WP.
Do not create an ad-hoc branch or edit the planning checkout during implementation.
Before implementation the mission requires persisted `analysis-report.md` from
`/spec-kitty.analyze`; task finalization itself does not satisfy that gate.
Use the runtime-selected action, for example:

```bash
spec-kitty agent action implement WP07 --agent qwen --mission database-review-findings-remediation-01M5TGCE
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

- `okr-app/tests/application/integrations.suite.ts`
- `okr-app/tests/application/plugin-fixture.ts`
- `okr-app/src/lib/server/plugins/scheduler.ts`
- `okr-app/src/lib/server/query/executor.ts`
- `okr-app/src/routes/api/queries/`
- `okr-app/src/routes/api/friends/`
- `okr-app/src/routes/api/ai/tool/`
- `okr-app/src/lib/server/ai/tools/`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP07/`
- `okr-app/tests/application/integrations.sqlite.test.ts`
- `okr-app/tests/application/integrations.postgres.test.ts`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T030 — Prove actual scheduled plugin persistence

**Purpose**: Deliver this bounded part of WP07 without weakening its oracle.

**Implementation**:
Use deterministic upstream provider fixture data and invoke the scheduled callback through the scheduler API/internal seam. Exercise manager persistence and verify imported rows/last-sync state by user. Track and clear both initial timeout and interval in production scheduler lifecycle.

**Expected result / validation**:
Real scheduler-to-manager-to-repository writes succeed on both backends and shutdown/recovery creates no duplicate timers.

**Boundary condition**:
Do not replace manager/database with mocks or add a public trigger-test endpoint; coordinate hooks integration with WP04.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T031 — Exercise real asynchronous QuickJS data access

**Purpose**: Deliver this bounded part of WP07 without weakening its oracle.

**Implementation**:
Run executeQuery via actual HTTP query execution with seeded user data, Promise-based reads, renders/progress and audit logs. Assert exact values and isolation on both databases; repair only demonstrated bridge defects.

**Expected result / validation**:
Real QuickJS resolves asynchronous repository values and returns deterministic expected result without foreign data.

**Boundary condition**:
Do not replace QuickJS with eval or make promises synchronous to hide PostgreSQL behavior.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T032 — Verify saved-query and friend-dashboard paths

**Purpose**: Deliver this bounded part of WP07 without weakening its oracle.

**Implementation**:
Create/update saved queries through actual routes, execute their stored code and verify ownership. Exercise stranger/private denial, accepted friendship and explicitly shared dashboard success using separate cookie jars; inspect state on denied writes.

**Expected result / validation**:
The application chain executes saved code and friend privacy controls rather than merely creating repository rows.

**Boundary condition**:
Do not infer privacy from friendship table contents or expose private widgets/notes to satisfy tests.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T033 — Prove AI-tool persistence and ownership

**Purpose**: Deliver this bounded part of WP07 without weakening its oracle.

**Implementation**:
Call /api/ai/tool through real auth and tool context/registry for representative task/objective writes, then read persisted rows and test foreign IDs/unauthenticated calls. No external LLM service is required to execute the actual tool dispatcher.

**Expected result / validation**:
Both-backend tool writes persist correctly for the current account; unauthorized operations leave other accounts unchanged.

**Boundary condition**:
Mocking the dispatcher or calling only repository create does not satisfy this task.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T034 — Demonstrate bridge sensitivity and publish integration proof

**Purpose**: Deliver this bounded part of WP07 without weakening its oracle.

**Implementation**:
Apply a controlled async bridge-result fault in an isolated source copy; require the targeted application test to fail for the intended assertion. Restore source and rerun all integration scenarios on both backends, recording redacted evidence.

**Expected result / validation**:
Fault demonstrably breaks the expected async result, restored path passes and scheduler/query/friend/AI artifacts are durable.

**Boundary condition**:
Import the WP06 fixture without editing its files. Create integrations.sqlite.test.ts and integrations.postgres.test.ts, each registering integrations.suite.ts with the selected real backend. Run these entry files directly with installed Vitest; they must fail if no tests or prerequisites are missing. WP11 later explicitly adds them to package commands.

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

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP07/`.
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

Repository CRUD alone cannot establish the application chain; only external provider data may be simulated.

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
