---
work_package_id: WP01
title: Enforce effective PostgreSQL TLS
dependencies: []
requirement_refs:
- FR-001
- FR-008
- NFR-001
- NFR-004
planning_base_branch: plan/sqlite-postgresql-support
merge_target_branch: plan/sqlite-postgresql-support
branch_strategy: Planning artifacts for this mission were generated on plan/sqlite-postgresql-support. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into plan/sqlite-postgresql-support unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-database-review-findings-remediation-01M5TGCE
base_commit: 4a745701b0e0303d852179f75a5d44af1e5aefec
created_at: '2026-10-27T21:45:26.970372+00:00'
subtasks:
- T001
- T002
- T003
- T004
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
- okr-app/tests/db/tls.test.ts
- okr-app/tests/db/tls-fixtures.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP01/
execution_mode: code_change
owned_files:
- okr-app/src/lib/db/config.ts
- okr-app/tests/db/config.test.ts
- okr-app/tests/db/tls.test.ts
- okr-app/tests/db/tls-fixtures.ts
- okr-app/docs/reviews/evidence/database-review-remediation/WP01/
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

# WP01 — Enforce effective PostgreSQL TLS

## Objective and independent success criteria

Configured certificate/hostname verification and custom CA survive the actual pg parser for runtime and migration connections.

Independent review evidence:
Effective pg Client matrix plus real trusted/wrong-CA/wrong-host PostgreSQL TLS outcomes; retain redacted before/after runs.

Priority: P1. Tests and durable evidence are explicitly required by the spec.
Requirement refs: FR-001, FR-008, NFR-001, NFR-004.
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
spec-kitty agent action implement WP01 --agent qwen --mission database-review-findings-remediation-01M5TGCE
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

- `okr-app/src/lib/db/config.ts`
- `okr-app/tests/db/config.test.ts`
- `okr-app/tests/db/tls.test.ts`
- `okr-app/tests/db/tls-fixtures.ts`
- `okr-app/docs/reviews/evidence/database-review-remediation/WP01/`

Do not edit `.github/workflows/`, CI/CD logic, triggers, gates, permissions,
publication settings or repository branch settings. Do not deploy or publish.
Keep RISK-2 unresolved/operator-deferred. Preserve existing assertions, typed
repository boundaries, historical migrations and portable backup contracts.
Do not install or upgrade dependencies as an incidental fix.

## Subtasks and implementation guidance

### T001 — Capture parser and TLS regression baseline

**Purpose**: Deliver this bounded part of WP01 without weakening its oracle.

**Implementation**:
Inspect the installed pg/pg-connection-string source and inventory every SSL control and alias. Build the real config and construct pg.Client for explicit verify-full/custom CA with no hint, disable, no-verify, require and verify-full hints. Save the observed effective settings without CA contents.

**Expected result / validation**:
The original downgrade or CA loss is reproduced; record rejection versus accepted policy for duplicates and aliases.

**Boundary condition**:
Use a disposable generated CA; never commit private keys or credential URLs.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T002 — Normalize canonical TLS policy

**Purpose**: Deliver this bounded part of WP01 without weakening its oracle.

**Implementation**:
Enumerate all security query entries, reject duplicate/unknown/contradictory controls deterministically, consume accepted TLS hints and preserve unrelated URL parameters. Apply explicit canonical ssl only after sanitized URL handling. Keep runtime pool and migration Client on the same builder.

**Expected result / validation**:
Effective accepted Client SSL retains rejectUnauthorized and CA; contradictory and ambiguous inputs fail before connect.

**Boundary condition**:
Preserve supported URL-only settings and default backend selection; do not solve this by upgrading pg.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T003 — Execute real PostgreSQL TLS cases

**Purpose**: Deliver this bounded part of WP01 without weakening its oracle.

**Implementation**:
Create disposable matching-host TLS PostgreSQL endpoints using existing dependencies and isolated fixture data. Connect via production runtime and migration builders; exercise trusted CA success, untrusted CA rejection and hostname mismatch rejection. Assert no plaintext fallback.

**Expected result / validation**:
Both production connection paths succeed only for trusted matching identity; failures are bounded and redacted.

**Boundary condition**:
If a required image cannot download, stop ALL work and wait for operator direction rather than substituting endpoints/images.

**Execution record**:
Record exact command, exit status, revision and versions for this subtask's proof.
Keep failing-before and passing-after outputs distinguishable; fixture errors
cannot stand in for the intended regression assertion.
Record completion using the event-log task command, not markdown checkboxes.

### T004 — Publish TLS regression evidence

**Purpose**: Deliver this bounded part of WP01 without weakening its oracle.

**Implementation**:
Run existing config/failure coverage plus the new TLS suite. Compare baseline versus fixed effective Client and live endpoint results. Store commands, timestamps, versions, revision and artifact checksums in this WP evidence directory.

**Expected result / validation**:
No builder-only claim closes DRIFT-1; live boundary and unchanged selection defaults are demonstrated.

**Boundary condition**:
Keep passwords, session secrets and private CA material out of artifacts.

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

Evidence location: `okr-app/docs/reviews/evidence/database-review-remediation/WP01/`.
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

URL aliases and repeated keys can bypass a first-value lookup; never preserve parser security controls in the final connection string.

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
