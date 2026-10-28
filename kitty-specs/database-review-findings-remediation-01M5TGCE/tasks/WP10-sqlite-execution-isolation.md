---
work_package_id: WP10
title: Isolate all SQLite execution from HTTP
dependencies:
- WP03
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
created_at: '2026-10-28T04:55:29.471498+00:00'
subtasks:
- T044
- T045
- T046
- T047
- T048
phase: Application remediation
history:
- !!omap
  - at: '2026-10-27T21:33:04Z'
  - actor: codex
  - action: Authored authorized analysis remediation; implementation not started
agent_profile: node-norris
authoritative_surface: okr-app/src/lib/db/adapters/
create_intent:
- okr-app/src/lib/db/adapters/sqlite-local.ts
- okr-app/src/lib/db/adapters/sqlite-worker.ts
- okr-app/src/lib/db/adapters/sqlite-worker-client.ts
- okr-app/src/lib/db/adapters/sqlite-worker-protocol.ts
- okr-app/scripts/build-database-workers.ts
- okr-app/tests/db/sqlite-worker.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP10/
execution_mode: code_change
owned_files:
- okr-app/src/lib/db/adapters/sqlite.ts
- okr-app/src/lib/db/adapters/sqlite-local.ts
- okr-app/src/lib/db/adapters/sqlite-worker.ts
- okr-app/src/lib/db/adapters/sqlite-worker-client.ts
- okr-app/src/lib/db/adapters/sqlite-worker-protocol.ts
- okr-app/scripts/build-database-workers.ts
- okr-app/vite.config.ts
- okr-app/Dockerfile
- okr-app/tests/db/sqlite-worker.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP10/
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Use `/ad-hoc-profile-load` (canonical `spk-doctrine-profile-load`) to load
`node-norris` before parsing this prompt. Implement using Qwen CLI (`qwen`).
Historical author metadata identifies who planned this WP, not its execution tool.

# WP10 — Isolate all SQLite execution from HTTP

## Objective and independent success criteria

Keep every synchronous SQLite operation, including ordinary application reads/writes, atomic operations, backup and initialization, off the HTTP event loop without changing the awaitable DatabaseServices or configured busy-timeout semantics.

Independent review evidence:
Real locked runtime writes with configured busy timeouts 0/5000/30000 ms do not block host event-loop timers; repository/atomic/backup parity and production worker resolution pass before lifecycle integration.

Priority: P1. Requirements: FR-003, FR-006, FR-008, NFR-001, NFR-002, NFR-004.
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
Dependencies: WP03.
Use finalizer-generated lanes.json to find the actual branch/worktree.
Stable WP numbers do not determine execution order: dependencies do.
A fresh ready analysis-report.md is required before any implementation.
Use the runtime-selected action in Qwen CLI, for example:

```bash
spec-kitty agent action implement WP10 --agent qwen --mission database-review-findings-remediation-01M5TGCE
```

Pass explicit mission database-review-findings-remediation-01M5TGCE on
mission-aware commands. Do not run implement/review during planning remediation.

## Owned surfaces and safeguards

- `okr-app/src/lib/db/adapters/sqlite.ts`
- `okr-app/src/lib/db/adapters/sqlite-local.ts`
- `okr-app/src/lib/db/adapters/sqlite-worker.ts`
- `okr-app/src/lib/db/adapters/sqlite-worker-client.ts`
- `okr-app/src/lib/db/adapters/sqlite-worker-protocol.ts`
- `okr-app/scripts/build-database-workers.ts`
- `okr-app/vite.config.ts`
- `okr-app/Dockerfile`
- `okr-app/tests/db/sqlite-worker.test.ts`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP10/`

Only these files are owned here. Coordinate interface changes with consumers;
do not create overlapping file ownership. Any necessary out-of-map fix requires
a concrete rationale and ownership coordination. Preserve typed repositories,
backend choice, lazy imports, complete atomic operations and backup format.

Never modify .github/workflows/, CI/CD triggers/permissions/publication gates,
repository settings or deployment. RISK-2 remains unresolved/operator-deferred.
Existing assertions remain mandatory; do not skip or weaken tests to get green.

## Subtasks and detailed guidance

### T044 — Define worker protocol and preserve public contracts

**Purpose**: Define worker protocol and preserve public contracts within the existing persistence/verification contract.

**Implementation**:
Inventory every existing repository/service method. Define typed allowlisted requests with generation/request ID, method and structured-cloneable arguments; replies contain values or redacted errors. Preserve Date, Map, null, undefined and numeric values via structured clone, not JSON. All existing promise-returning methods retain signatures and isOpen remains synchronous cached ownership metadata. No generic arbitrary method invocation or function/driver transfer.

**Expected result / validation**:
Protocol tests cover value types and every existing method, invalid/unknown method denial and stale-generation reply handling. There are no new public HTTP APIs.

**Boundary condition**:
Existing backup exportSnapshot/restore and atomic user/task operations are each one complete worker command; do not split or await inside SQLite transactions.

**Execution record**:
Record exact command, UTC times, exit code, revision/diff identity and versions.
Retain original failure or controlled equivalent and the fixed passing result.
Do not count setup errors as the intended negative assertion.
Use event-sourced task completion rather than markdown checkboxes.

### T045 — Move synchronous adapter behind the worker facade

**Purpose**: Move synchronous adapter behind the worker facade within the existing persistence/verification contract.

**Implementation**:
Move existing SQL/transaction implementation from sqlite.ts into private sqlite-local.ts, retaining logic. Keep sqlite.ts exporting SqliteDatabaseServices as the async worker facade used by lifecycle/tests. Worker owns the sole runtime handle and runs operations serially. Export runSqlitePreparation(config, options) from the client, using a separate preparation worker that runs WP03 migrate/verify and closes before runtime open; no SQLite I/O occurs on import or HTTP thread.

**Expected result / validation**:
Real contract/domain/backup/atomic tests pass through the facade with unchanged SQL constraints and data. SQLite verify still creates no missing file/path and PostgreSQL selection creates no SQLite worker.

**Boundary condition**:
Do not introduce a repository rewrite, SQL redesign or data migration. Only internal execution placement changes; consumer interfaces remain awaitable.

**Execution record**:
Record exact command, UTC times, exit code, revision/diff identity and versions.
Retain original failure or controlled equivalent and the fixed passing result.
Do not count setup errors as the intended negative assertion.
Use event-sourced task completion rather than markdown checkboxes.

### T046 — Bound readiness requests without replaying business operations

**Purpose**: Bound readiness requests without replaying business operations within the existing persistence/verification contract.

**Implementation**:
Preserve configured SQLite busy timeout inside the worker, including values over five seconds. Serialize commands with a bounded pending queue (128 ordinary requests); reject overflow before dispatch without replay. Coalesce readiness into at most one queued/in-flight worker command, give it next-slot priority after active work, and let the host readiness wait expire within 3s including queue time. A timeout marks unavailable but does not kill an active transaction, free its concurrency slot or submit duplicate checks. Close/crash fences generations, rejects pending requests and releases handles; never automatically reissue writes.

**Expected result / validation**:
A locked runtime write leaves host timers responsive for 0/5000/30000ms configurations. Readiness timeout is truthful while work remains blocked; releasing lock allows the same owner to recover. Duplicate checks/overflow/shutdown do not leak workers or orphan request slots.

**Boundary condition**:
If a worker dies after a possible commit, report the uncertain write outcome without claiming rollback or replaying it; SQLite atomicity must be preserved.

**Execution record**:
Record exact command, UTC times, exit code, revision/diff identity and versions.
Retain original failure or controlled equivalent and the fixed passing result.
Do not count setup errors as the intended negative assertion.
Use event-sourced task completion rather than markdown checkboxes.

### T047 — Package lazy worker entrypoints for dev test and production

**Purpose**: Package lazy worker entrypoints for dev test and production within the existing persistence/verification contract.

**Implementation**:
Own build-database-workers.ts and integrate worker emission through the Vite build hook using installed esbuild. Existing npm run build remains unchanged and emits worker assets within build/; current Dockerfile copies them with existing build output. Verify generated .mjs entry resolution, production-only dependency resolution and dev/Vitest paths. Build emits code without starting workers or opening storage; no package.json change is needed.

**Expected result / validation**:
Existing npm build works at WP10 before downstream test suites exist; direct helper/Vitest execution resolves real worker and native dependencies. Production image packaging contains referenced worker assets.

**Boundary condition**:
WP11 exclusively owns package.json later. Do not add dependency packages, copy credential environment into bundles or require absent future files.

**Execution record**:
Record exact command, UTC times, exit code, revision/diff identity and versions.
Retain original failure or controlled equivalent and the fixed passing result.
Do not count setup errors as the intended negative assertion.
Use event-sourced task completion rather than markdown checkboxes.

### T048 — Execute isolation parity and lock regressions

**Purpose**: Execute isolation parity and lock regressions within the existing persistence/verification contract.

**Implementation**:
Run targeted worker protocol/lifecycle/held-lock/backpressure tests and existing real SQLite contract/domain/backup suites through the facade. Use a real external connection holding a write lock while an ordinary repository write is pending; concurrently measure host timers and availability wait. Cover worker crash, stale response and close cleanup. Publish redacted baseline/fixed evidence for WP04/WP06 consumption.

**Expected result / validation**:
Host responsiveness, exact data/types, atomic rollback/commit semantics and zero import-time I/O are demonstrated. WP06 later adds actual HTTP simultaneous-write/probe traces with unchanged PID.

**Boundary condition**:
No mocked persistence, weakened assertions or retries-to-green; late response handling cannot falsely report a blocked database healthy.

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

Evidence directory: `okr-app/docs/reviews/evidence/database-review-remediation/WP10/`.
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
