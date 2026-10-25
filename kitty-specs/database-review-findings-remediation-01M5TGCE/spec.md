# Mission Specification: Database review findings remediation

**Mission**: `database-review-findings-remediation-01M5TGCE`  
**Target Branch**: `plan/sqlite-postgresql-support`  
**Created**: 2026-10-26  
**Status**: Specified; implementation and verification pending

**Input**: Fix all findings DRIFT-1 through DRIFT-5 and RISK-1 through RISK-2 in
`okr-app/docs/reviews/sqlite-postgresql-support-2026-10-26.md`.
Require regression tests and evidence for every finding. Preserve PR-only CI,
main-only GHCR publication, and manual image validation. Do not weaken tests or
silently waive findings.

## Scope and authority

The source review supplies the finding inventory and reproduction baseline.
All seven named findings are mandatory, including DRIFT-5 regardless of its
placement among non-blocking open items. The original mission
`sqlite-postgresql-support-01M5JP6Y` specification, plan and persistence contract
explain the promises being repaired. This follow-up preserves the operator's
subsequent delivery-policy changes.

Deliver fixes, regression tests, durable execution evidence and accurate operating
and verification documentation. Preserve the historical review and record closure
in a follow-up report. No implementation or executed regression is claimed by
this specification. Planning and work-package authoring follow this phase.

## User Scenarios & Testing

### User Story 1 — Secure connections and recognized schemas (P1)

As an operator, I need certificate verification and schema integrity to hold at
the actual database boundary before serving users.

**Why this priority**: TLS downgrade and missing username uniqueness violate
security and data-integrity promises.

**Independent test**: Exercise the effective production driver, real TLS endpoints
and disposable databases with altered definitions.

**Acceptance scenarios**:

1. Given explicit verify-full mode and a custom CA, when connection URLs contain
   TLS hints, the application rejects contradictions or safely normalizes them;
   effective driver configuration never disables verification or loses the CA.
2. Given a trusted matching certificate, connection succeeds; an untrusted CA or
   hostname mismatch fails without fallback or credential leakage.
3. Given supported SQLite layouts, migration and adoption succeed; replacing an
   expected unique index with a nonunique index on another column is rejected
   before serving and without modifying the incompatible database.
4. Altered column types/nullability, foreign keys, constraints and journal
   integrity are rejected. Equivalent harmless SQL formatting remains acceptable.

### User Story 2 — Least-privilege startup and truthful probes (P1)

As an operator, I need a data-only runtime role and probes that distinguish a
live process from unavailable storage and recover from temporary outages.

**Why this priority**: Current startup verification attempts DDL, while cached
failures/readiness can prevent recovery or misrepresent availability.

**Independent test**: Run a real restricted PostgreSQL role and actual HTTP
health/readiness requests through startup failure, outage and recovery.

**Acceptance scenarios**:

1. Given completed migrations, a runtime role without CREATE or schema ownership
   starts in verification mode and performs application data operations with zero DDL.
2. Given an empty, outdated or incompatible database, verification rejects it
   with actionable diagnostics and creates no schema, table or journal objects.
3. During failed startup, health returns HTTP 200 and readiness HTTP 503; after
   database recovery, initialization retries and readiness returns HTTP 200
   without process restart.
4. After successful startup, a later outage changes readiness to HTTP 503 while
   health stays HTTP 200. Idle pool errors are handled, and storage recovery
   restores readiness without restart. Repeated failures do not poison retries.

### User Story 3 — Real application and production verification (P1)

As a maintainer, I need regression tests through shipped request/application
paths on both backends, and manual image checks that detect lost persistence.

**Why this priority**: Repository tests alone do not prove authorization,
application bridging, production startup or restart persistence.

**Independent test**: Execute request/application scenarios against real SQLite
and PostgreSQL, then manually validate production images in both modes.

**Acceptance scenarios**:

1. Fresh PostgreSQL operational fixtures migrate before pool/outage cases use
   application tables; these tests reach their intended assertions.
2. Actual login/session-cookie, unauthenticated, non-admin and two-account request
   paths enforce admin guards, privacy and ownership. Denied reads/writes reveal
   no foreign data and do not modify stored state.
3. Tests invoke scheduler writes, QuickJS asynchronous query bridging, saved-query
   execution, friend dashboard handlers and AI-tool persistence through their
   real application entrypoints on both backends.
4. Each manually tested production image completes a goal/objective write,
   restart and read journey. Missing persisted data or readiness timeout makes
   validation exit nonzero; no warning followed by PASS is allowed.

### User Story 4 — Verified publication with unchanged delivery policy (P1)

As a release operator, I need publication to require successful mandatory checks
covering the published revision while CI remains PR-only and image validation manual.

**Why this priority**: Recording a SHA proves identity, not test success.

**Independent test**: Exercise publication eligibility with successful, failed,
missing, pending, cancelled, stale, wrong-revision and unverifiable evidence.

**Acceptance scenarios**:

1. Successful required checks for the exact published revision permit publication
   and produce durable check-run references, revision and image digest evidence.
2. A direct main push without qualifying evidence, an unrelated successful
   workflow, missing checks or unsuccessful/unverifiable evidence blocks
   publication before registry login or push.
3. Where a PR merge strategy changes the SHA, publication requires demonstrated
   equivalence to the tested revision or fails closed. PR association or an
   ancestor's green checks alone is insufficient.
4. PR activity automatically runs only PR CI. Manual image validation covers
   both backends without package-write permission or publication. Publication
   remains automatic only on main pushes; dispatch never publishes.

### Edge cases

- TLS aliases, duplicate URL parameters and contradictory explicit settings have
  deterministic safe outcomes.
- Expected schema names cannot hide incompatible definitions; supported historical
  layouts remain adoptable without weakening drift rejection.
- Concurrent initialization, repeated outages and idle pool errors preserve
  bounded probes and retry behavior.
- Required PostgreSQL/recovery execution without server access, credentials or
  matching dump/restore tools fails as missing prerequisites rather than skipping.
- Publication evidence API/permission failures deny publication.
- Baseline UI type-check debt cannot hide new errors or backend test failures.

## Requirements

### Functional Requirements

| ID | Title | Requirement | Priority | Status |
|---|---|---|---|---|
| FR-001 | Effective TLS (DRIFT-1) | Enforce configured verification and CA in the effective production driver despite URL SSL controls; verify actual trusted/untrusted/hostname behavior. | High | Open |
| FR-002 | Schema integrity (DRIFT-2) | Reject incompatible index columns/uniqueness, types, nullability, foreign keys, constraints and journal integrity before serving; preserve fresh migration and recognized adoption. | High | Open |
| FR-003 | No-DDL runtime (DRIFT-3) | Application startup honors migration mode; verification performs zero DDL, even on empty databases, and supports separately migrated storage with a data-only PostgreSQL runtime role. | High | Open |
| FR-004 | Operational/image proof (DRIFT-4) | Migrate operational fixtures; make restart/readiness/persistence failures nonzero; manually execute both-backend production-image scenarios and require real PostgreSQL recovery with matching tools. | High | Open |
| FR-005 | Application paths (DRIFT-5) | Test actual authentication/session, admin, privacy and two-user authorization paths, scheduler, plugin/QuickJS async bridge, saved queries, friend dashboard and AI-tool entrypoints on both real backends. | High | Open |
| FR-006 | Recoverable probes (RISK-1) | Keep liveness independent of database initialization; readiness checks live availability; failed initialization retries and idle pool errors are handled; prove HTTP outage and recovery. | High | Open |
| FR-007 | Verified publication (RISK-2) | Gate GHCR publication on successful mandatory checks covering the published revision; reject missing or invalid evidence and record revision proof. | High | Open |
| FR-008 | Durable closure | Record a closure row for each finding linking changed behavior, requirements, regression tests, before/after execution, revision, environment and durable artifacts; align operating docs with demonstrated behavior. | High | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|---|---|---|---|---|---|
| NFR-001 | Complete evidence | All 7 findings require executed regression evidence; zero closures solely from inspection, builder assertions or scripts existing on disk. | Verification | High | Open |
| NFR-002 | Bounded probes | HTTP probes complete within 5 seconds; readiness detects outage within 10 seconds and recovers within 30 seconds after storage/schema availability, without process restart. | Reliability | High | Open |
| NFR-003 | Stable suites | Required/full/backend suites have zero failures; concurrency and no-init regressions pass 10 consecutive runs without hidden retries, optionalization or disabled assertions. | Reliability | High | Open |
| NFR-004 | Safe evidence | Evidence records commands, exit codes, timestamps, revision and backend/tool versions, with zero passwords, session secrets or private CA keys. | Security | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|---|---|---|---|---|---|
| C-001 | PR-only CI | Preserve RUOK CI automatic triggering on pull_request only; do not add push, workflow_run or dispatch CI as a publication workaround. | Delivery | High | Open |
| C-002 | Main-only GHCR | Preserve publication only on pushes to refs/heads/main, immutable SHA/digest identity and least-privilege separation. | Delivery | High | Open |
| C-003 | Manual image validation | Preserve workflow_dispatch/manual image validation; cover both modes there without publication or package-write permission. | Delivery | High | Open |
| C-004 | No weakening/waiver | Do not remove, skip, narrow, mock away or make required tests non-blocking to obtain green results. Missing execution stays open and blocks acceptance; no silent waiver, deferral or severity-based exclusion. | Quality | High | Open |
| C-005 | Bounded scope | Preserve persistence/backup contracts and unrelated user edits; exclude deployment, external CNPG implementation, unrelated features and blanket UI-debt repair. | Scope | High | Open |

## Finding-to-evidence contract

Each row needs a regression detecting the original defect or a documented,
controlled equivalent fault, followed by a passing fixed run and durable evidence.
Mocks may supplement publication-policy tests; real boundary claims require real
execution. Test references alone are not execution evidence.

| Finding | Requirement | Required regression and evidence |
|---|---|---|
| DRIFT-1 | FR-001 | Effective pg Client matrix with explicit verify-full/custom CA and URL disable, no-verify, require and verify-full hints; real TLS trusted/untrusted CA and hostname tests. |
| DRIFT-2 | FR-002 | Real SQLite tampering under expected names, reproduced nonunique wrong-column index, column/FK/constraint/journal alterations, rejection/no-mutation proof and supported/fresh positives. |
| DRIFT-3 | FR-003 | Application startup mode test; live PostgreSQL role without CREATE; successful migrated runtime and rejected empty/outdated schemas; statement/object evidence of zero DDL on success and failure. |
| DRIFT-4 | FR-004 | Live migrated pool/outage fixtures and native recovery rehearsal; manual both-mode image runs with revision/digest, objective persistence after restart and failing lost-write/readiness negative cases. |
| DRIFT-5 | FR-005 | Both-backend HTTP/session/admin/two-user scenarios and real scheduler/plugin/query/friend/AI paths; demonstrate relevant authorization/bridge regressions make tests fail. |
| RISK-1 | FR-006 | Timed HTTP health/readiness traces through unavailable startup, recovery, later outage and second recovery; failed-promise retry, concurrent initialization and idle-error regressions. |
| RISK-2 | FR-007 | Gate positive/negative cases, revision/equivalence proof under supported merge strategy, trigger/permission regression checks and durable check-run references. No actual release is needed solely to test denials. |

Evidence must be committed reports or durable CI/manual-run artifacts linked from
the closure report. Temporary local logs alone cannot close a finding. Record
unexecuted checks as incomplete; never infer PASS from a missing dependency.

## Assumptions and dependencies

- This is the specify phase; implementation and live verification follow planning
  and work-package authoring. The historical review remains unchanged.
- Repository-enforced publication verification is required; uninspected branch
  protection is not evidence. Planning must choose a fail-closed revision policy
  compatible with PR-only CI and document supported merge strategies.
- PostgreSQL 18 is the repository CI target. Live PostgreSQL, restricted roles,
  TLS fixtures, matching native recovery tools and Docker are acceptance
  prerequisites. Their absence prevents closure rather than permitting a waiver.
- The historical 18 errors/4 warnings are observations, not a permanent allowance.
  Record a reproducible UI baseline and distinguish new failures.
- Diagnose the reported concurrency and no-init failures and repair them as needed
  for truthful green required suites; never convert them to skips.
- The 5/10/30-second probe bounds are acceptance targets chosen for this mission;
  planning must reconcile runtime timeouts and polling with those bounds.
- Correct stale PostgreSQL-version, automatic image-check, release-gating and
  no-DDL documentation where it affects these findings; no unrelated docs rewrite.

## Success Criteria

- **SC-001**: All seven findings have linked regression tests and durable
  before/after execution evidence, with none omitted, deferred or waived.
- **SC-002**: Required suites finish with zero failures and all mandatory live
  scenarios executed; stability cases pass ten consecutive runs.
- **SC-003**: Both supported storage modes preserve recorded user objectives
  across production restart in manually initiated image validation.
- **SC-004**: Every outage/recovery scenario meets the probe bounds and restores
  service without process restart while preserving process liveness.
- **SC-005**: Every invalid-evidence publication case is denied, valid evidence
  covers the published revision, and all three delivery constraints hold.
- **SC-006**: A follow-up reviewer can reproduce each closure from durable,
  redacted artifacts and reports zero unresolved named findings. Missing evidence
  remains incomplete and blocks acceptance.
