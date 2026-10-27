---
work_package_id: WP02
title: Reject incompatible SQLite definitions
dependencies: []
requirement_refs:
- FR-002
- FR-008
- NFR-001
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
subtasks:
- T005
- T006
- T007
- T008
- T009
phase: Application remediation
history:
- at: '2026-10-27T20:28:34Z'
  actor: codex
  action: Prompt authored; implementation not started
agent_profile: node-norris
authoritative_surface: okr-app/src/lib/db/migrations/
create_intent:
- okr-app/src/lib/db/migrations/sqlite-inspect.ts
- okr-app/tests/db/sqlite-integrity.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP02/
execution_mode: code_change
owned_files:
- okr-app/src/lib/db/migrations/contracts.ts
- okr-app/src/lib/db/migrations/fingerprint.ts
- okr-app/src/lib/db/migrations/expected-sqlite.ts
- okr-app/src/lib/db/migrations/sqlite-migrator.ts
- okr-app/src/lib/db/migrations/sqlite-verify.ts
- okr-app/src/lib/db/migrations/sqlite-inspect.ts
- okr-app/tests/db/migration.test.ts
- okr-app/tests/db/legacy-adoption.test.ts
- okr-app/tests/db/migration-fixtures.ts
- okr-app/tests/db/sqlite-integrity.test.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP02/
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

# WP02 — Reject incompatible SQLite definitions

## Objective and independent success criteria

Migrate and verify share semantic recognition and reject incompatible definitions before persistent mutation while preserving every supported historical layout.

Independent review evidence:
Real SQLite tamper matrix, catalog/data/journal no-mutation assertions and fresh/db:push/incomplete-journal/additive adoption positives.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-002, FR-008, NFR-001, NFR-004.
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
Dependencies: None.
Use computed `lanes.json` to find the actual execution branch/worktree.
One worktree belongs to a computed lane, not automatically to each WP.
Do not create an ad-hoc branch or edit the planning checkout during implementation.
Before implementation the mission requires persisted `analysis-report.md` from
`/spec-kitty.analyze`; task finalization itself does not satisfy that gate.
Use the runtime-selected action, for example:

```bash
spec-kitty agent action implement WP02 --agent codex
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

- `okr-app/src/lib/db/migrations/contracts.ts`
- `okr-app/src/lib/db/migrations/fingerprint.ts`
- `okr-app/src/lib/db/migrations/expected-sqlite.ts`
- `okr-app/src/lib/db/migrations/sqlite-migrator.ts`
- `okr-app/src/lib/db/migrations/sqlite-verify.ts`
- `okr-app/src/lib/db/migrations/sqlite-inspect.ts`
- `okr-app/tests/db/migration.test.ts`
- `okr-app/tests/db/legacy-adoption.test.ts`
- `okr-app/tests/db/migration-fixtures.ts`
- `okr-app/tests/db/sqlite-integrity.test.ts`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP02/`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T005 — Reproduce expected-name drift and freeze supported layouts

**Purpose**: Deliver this bounded part of WP02 without weakening its oracle.

**Implementation**:
Replace users_username_unique with a nonunique users(id) index in a real migrated file. Preserve its erroneous baseline acceptance. Build explicit positives for fresh, journal-managed, db:push, missing additive columns and valid incomplete journal layouts.

**Expected result / validation**:
Regression detects the historical acceptance and supported fixture inventory is explicit.

**Boundary condition**:
Historical migration files and backup contracts are immutable; do not expand recognition to unknown layouts.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T006 — Introduce shared semantic schema descriptors

**Purpose**: Deliver this bounded part of WP02 without weakening its oracle.

**Implementation**:
Inspect columns with declared type/null/default/PK position, indexes with ordered keys/uniqueness/collation/direction/expression/predicate, FKs with mapping/actions and supported constraints. Generate expected reference layouts from checked migrations in an isolated memory database and explicitly model legacy variants.

**Expected result / validation**:
Independent fixture assertions prove descriptor meaning; harmless whitespace/quoting variations remain equivalent.

**Boundary condition**:
Use PRAGMA metadata first; bounded token handling must preserve literal contents and reject unsupported constructs.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T007 — Validate full journal integrity and classify safely

**Purpose**: Deliver this bounded part of WP02 without weakening its oracle.

**Implementation**:
Represent journal structure and known hash/timestamp pairs; reject duplicate, unknown, future, corrupt and mismatched rows. Permit incomplete journal adoption only for valid existing rows and recognized schema; verify requires complete history.

**Expected result / validation**:
Corrupt journal-only storage is rejected instead of fresh; valid partial history can still be adopted.

**Boundary condition**:
Avoid timestamp-only set membership and avoid automatic deletion or rewriting of bad records.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T008 — Integrate inspection before mutation and preserve atomic adoption

**Purpose**: Deliver this bounded part of WP02 without weakening its oracle.

**Implementation**:
Use the shared inspector in sqlite-migrator and sqlite-verify. Keep classification/deltas/journal changes serialized and atomic. Set connection-local busy timeout as needed, but defer persistent journal mode until compatible migration/adoption commits. Preserve FK orphan preflight.

**Expected result / validation**:
Rejected catalog/data/journal snapshots remain unchanged and permitted deltas converge without partial writes.

**Boundary condition**:
Do not set journal_mode inside an incompatible transaction or before reject; handle lock ordering explicitly.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T009 — Execute schema tamper and formatting matrix

**Purpose**: Deliver this bounded part of WP02 without weakening its oracle.

**Implementation**:
Exercise wrong index definition, type, nullability, default, PK, FK mapping/actions, supported CHECK/UNIQUE constraints and journal alterations through real migrate and verify. Run fresh and all historical positives plus rollback cases; save durable before/after outputs.

**Expected result / validation**:
Every semantic dimension has a rejecting regression and relevant positive control; DRIFT-2 evidence includes no-mutation proof.

**Boundary condition**:
A single index test cannot close the broader schema requirement.

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

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP02/`.
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

Expected metadata and actual metadata can share the same bug; use independent assertions and explicit supported variants.

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
