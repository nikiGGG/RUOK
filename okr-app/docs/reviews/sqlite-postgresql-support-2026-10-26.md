# Mission Review Report: sqlite-postgresql-support-01M5JP6Y

**Reviewer:** Codex
**Date:** 2026-10-26
**Mission:** `sqlite-postgresql-support-01M5JP6Y` — SQLite and PostgreSQL support
**Baseline commit:** `3293ad10be8c06b2712092970fb8f7a81c2d29f3` (mission metadata)
**HEAD at review:** `fc43b15448047319f097422a3b3a19b66109128c`
**WPs reviewed:** WP01–WP11, all `done`
**Final verdict:** **FAIL** — confirmed TLS downgrade, incomplete schema drift detection, inaccurate probes, and release verification gaps.

## Scope and provenance

The mission was squash-merged in `58b9abb` into its configured target branch,
`plan/sqlite-postgresql-support`. This is a review of that integration, not a
claim that it has merged into `main`. Baseline-to-HEAD inspection covers 166
application/workflow files, including both adapters, migration orchestration,
shared domain/backup suites, HTTP consumers, packaging and operating docs.

The sole mission contract file is
`kitty-specs/sqlite-postgresql-support-01M5JP6Y/contracts/persistence.md`.
The generic skill's separate test/CLI/file-format contracts do not exist here.
References below are repository-relative with line numbers at review time.

Post-mission changes `04c6324` and `fc43b15` repair action pins and package URLs,
switch CI to PostgreSQL 18, restrict publication to `main`, and make container
validation manual. These changes were explicitly requested by the operator;
they are accepted scope changes, not unauthorized drift. The worktree also has
the operator-requested, uncommitted removal of push-triggered RUOK CI. This
report preserves that edit and does not count it as committed delivery.

The review does not fix source, tests, contracts, mission state or infrastructure.
Temporary bundles/databases were used only to reproduce findings.

## Gate Results

### Gate 1 — Contract tests

Commands, from `okr-app`, using Node 22.23.3:

| Command | Exit code | Result |
|---|---:|---|
| `npm run test:db:sqlite` | 0 | PASS: 77 tests across 11 files |
| `npm test` | 1 | FAIL: 131 passed, 2 failed across 18 files |
| `npm run check` | 1 | Known baseline: 18 errors, 4 warnings in 10 files |

The failing full-suite tests are
`tests/db/concurrency.test.ts:52` (second migration child exited 1) and
`tests/db/no-init.test.ts:49` (child stdout missing `PROBE:`).
Logs: `/tmp/ruok-review-tests.log`, `/tmp/ruok-review-sqlite.log`,
`/tmp/ruok-review-check.log` in this review environment. These logs are local,
not durable CI artifacts. WP07/WP10/WP11 review records already acknowledge
concurrency flakiness. The missing probe output remains unexplained: a direct
bundle and invocation of `_no-init-probe.ts` succeeded and printed the expected
unopened state. Do not infer a production import side effect from that failure.
Do not characterize the current full suite as green.

Live PostgreSQL, native PostgreSQL recovery and container execution were not run:
this environment has neither PostgreSQL nor Docker. No PostgreSQL PASS is
claimed. The earlier same-session clean-cache `npm ci` and production build
passed against the same application revision. Workflow actionlint and
`git diff --check` pass. The baseline type-check failures are documented in
`docs/DATABASE-VERIFICATION.md`, not new release defects attributed here.

The skill's literal `SPEC_KITTY_ENABLE_SAAS_SYNC=1 ... tests/contract/` command
targets the Spec Kitty implementation repository. RUOK is a TypeScript app,
not that repository; its real persistence contract suites above are the
applicable evidence. A missing Python suite is not treated as a passed gate.

### Gate 2 — Architectural tests

Command: a Python scan of `okr-app/src/**/*.ts`, excluding `src/lib/db/`, for
imports of `drizzle-orm`, `better-sqlite3`, `pg`, `$lib/db/client` and
`$lib/db/schema`.
Exit code: 0. Result: PASS for this bounded dependency check; zero violations.

`tests/db/schema-parity.test.ts` and `coverage-ledger.test.ts` also passed in
Gate 1. They cover the 25-table inventory and logical field/default/nullability
shape, not every live database constraint. RUOK has no dedicated
`tests/architectural/` suite. This limited inspection does not establish that
the skill's Spec Kitty Python architecture tests ran.

### Gate 3 — Cross-Repo E2E

Command: not run. Exit code: N/A. Result: NOT APPLICABLE to Spec Kitty SaaS
scenarios; RUOK's own end-to-end release evidence remains INCOMPLETE.

The four skill floor scenarios concern Spec Kitty planning lanes, repository
initialization, SaaS sync and orchestrator contract drift. This mission changes
none of those systems. Its external CNPG PR is expressly a documentation
handoff, not a cross-repository implementation/deployment. No operator waiver
or invented PASS is recorded. The applicable RUOK production-startup and
HTTP-parity gaps are findings DRIFT-4 and DRIFT-5 below.

### Gate 4 — Issue Matrix

Command: filesystem inventory of
`kitty-specs/sqlite-postgresql-support-01M5JP6Y/issue-matrix*`.
Exit code: 0. Rows: 0; empty/unknown verdicts: 0; invalid deferrals: 0.
Result: NOT APPLICABLE — no matrix exists and the spec binds a Vikunja task
and an external infrastructure PR, not a set of GitHub issue resolutions.
No matrix was fabricated or mission task finalization rerun during review.

Regardless of the inapplicable framework gates, Gate 1 is not green and the
confirmed HIGH findings below independently require FAIL.

## FR Coverage Matrix

ADEQUATE means the inspected test constrains that behavior, not that all live
backend executions were completed. PARTIAL includes incomplete request-path
or operational verification. No FR is accepted solely because its ID appears
in a test comment.

| FR | Promise | WP owner(s) | Test/code evidence | Adequacy | Finding |
|---|---|---|---|---|---|
| FR-001 | Explicit backend, defaults, no fallback | 01,02,03,09,11 | `tests/db/config.test.ts`, `failure.test.ts`; `db/config.ts` | ADEQUATE for selection | — |
| FR-002 | 25 tables, codecs, constraints | 02,03,08 | `schema-parity.test.ts`, `coverage-ledger.test.ts`, `contract.suite.ts`; both schemas/adapters | PARTIAL: logical parity does not validate every live constraint | DRIFT-2 |
| FR-003 | Awaitable typed boundary | 01,02,04,05,07 | `contracts.ts`, adapters; real contract suite; no consumer dialect imports | ADEQUATE for reviewed boundary | — |
| FR-004 | Versioned migrations, recognized adoption, drift rejection | 03,08,11 | `migration.test.ts`, `legacy-adoption.test.ts`, `migration-files.test.ts`; migrators | PARTIAL | DRIFT-2, DRIFT-3 |
| FR-005 | Serialized runtime initialization, bounded waits, shutdown | 03,07,09 | `concurrency.test.ts`, `failure.test.ts`, `lifecycle.test.ts`; hooks/lifecycle | PARTIAL; concurrency run failed; probe/retry gaps | DRIFT-3, RISK-1 |
| FR-006 | Auth, privacy, per-user isolation | 04,06,07,08 | auth/goals/integrations/backup suites; HTTP guards | PARTIAL: repository isolation tested, HTTP authorization not exercised | DRIFT-5 |
| FR-007 | All existing application features | 04,05,07,08 | domain suites and migrated routes, query/plugin/AI consumers | PARTIAL: persistence coverage exceeds application-path coverage | DRIFT-5 |
| FR-008 | Portable, validated, atomic v2 backup | 06,08 | `backup.suite.ts`, four pair entry points; shared plan; adapter transactions | ADEQUATE inspected design; only SQLite pair executed locally | PostgreSQL execution outstanding |
| FR-009 | Bounded PostgreSQL, verified CA/TLS, redaction | 01,02,03,09,11 | `config.test.ts`, `postgres.operations.test.ts`; pg config/migrator | PARTIAL; effective driver TLS contradicts builder assertion | DRIFT-1, DRIFT-3, DRIFT-4 |
| FR-010 | Simple SQLite, FK preflight, busy timeout/journal | 02,03,09,11 | `config.test.ts`, `legacy-adoption.test.ts`; SQLite migrator/adapter | PARTIAL: fingerprint cannot verify FK/constraint definitions | DRIFT-2 |
| FR-011 | Real parity, upgrades, failures, production startup | 01,04,05,06,07,08,10 | shared suites, upgrade/recovery tests, container scripts | PARTIAL; no production PG smoke wired into CI | DRIFT-4, DRIFT-5 |
| FR-012 | Non-root image and accurate health/readiness | 03,09 | Dockerfile, container scripts, health endpoints | PARTIAL: hooks and cached state invalidate probe promises | RISK-1 |
| FR-013 | Trusted immutable publication and PR checks | 10 | image workflow SHA tag/digest, permissions and validation job | PARTIAL; requested trigger changes accepted, release gating absent | RISK-2 |
| FR-014 | Both-mode operating/recovery/CNPG handoff | 11 | `DATABASES.md`, `CNPG-HANDOFF.md`, recovery tests/scripts | PARTIAL: extensive docs; no-DDL and live PG claims exceed evidence | DRIFT-3, DRIFT-4 |

## Drift Findings

### DRIFT-1 — Connection URL overrides verified TLS and drops the configured CA

**Type:** LOCKED-DECISION VIOLATION. **Severity:** HIGH (security).
**Spec:** FR-009; `plan.md:42`, TLS precedence paragraph;
`contracts/persistence.md` controlled backend configuration.
**Evidence:** `src/lib/db/config.ts:80` reads URL hints but only rejects
explicit disable conflicting with a verifying URL. The reverse contradiction
is accepted. `config.ts:224` passes the original connection string to pg,
then `config.ts:232` adds the explicit SSL object. Actual pg connection-string
parsing can overwrite that object.

Reproduced with the installed production `pg` driver by building the real
config module and inspecting `new pg.Client(buildPostgresPoolConfig(config))`
without opening a network connection. All cases explicitly set
`DATABASE_SSL_MODE=verify-full` and a test CA file:

| URL query | Effective `client.connectionParameters.ssl` |
|---|---|
| none | `{rejectUnauthorized:true, ca:"TEST-CA"}` |
| `sslmode=disable` | `false` |
| `sslmode=no-verify` | `{rejectUnauthorized:false}` |
| `sslmode=require` or `sslmode=verify-full` | `{}` — custom CA lost |

This is an actual driver-configuration failure, not a proposed network
failure. Explicit verification can become plaintext or accept an untrusted
certificate, or private-CA CNPG connections fail. The builder-only test at
`tests/db/config.test.ts:246` uses a URL without SSL parameters and never
constructs a pg Client, so it does not catch the merge boundary.
Normalize/reject URL TLS options and test the effective driver configuration
plus a real trusted/untrusted TLS endpoint in a follow-up change.

### DRIFT-2 — SQLite recognizes incompatible constraints as a supported schema

**Type:** LOCKED-DECISION VIOLATION. **Severity:** HIGH.
**Spec:** FR-002, FR-004; unknown layouts must be rejected before serving.
**Evidence:** `migrations/sqlite-migrator.ts:53` records only column names.
`migrations/fingerprint.ts:61` checks unknown index names and `:88` accepts
any existing SQL under an expected name; it does not compare index columns
or uniqueness. `:106` then classifies the database as ready.

Reproduced against a disposable real database through the production
`migrateDatabase` function:

1. Fresh migrations succeeded and recorded all seven migrations.
2. Replaced `CREATE UNIQUE INDEX users_username_unique ON users(username)`
   with a nonunique index of the same name on `users(id)`.
3. Reran `migrateDatabase`; it returned
   `{classification:"ready", appliedCount:7, recorded:0, schemaVersion:6}`.

The app can therefore accept a schema missing the authentication username
uniqueness constraint. Types, nullability, FK definitions and journal hashes
also are not represented by this classifier; those are additional inspection
gaps, not additional reproduced cases. Existing drift tests add unexpected
names rather than changing definitions behind recognized names.

### DRIFT-3 — Separate migration/runtime role mode cannot meet its no-DDL contract

**Type:** PUNTED-FR / ERROR-PATH. **Severity:** HIGH.
**Spec:** FR-005, FR-009; `plan.md:63` separate migration role and runtime
schema verification; `docs/DATABASES.md:196` and `:248`.
**Evidence:** `src/lib/server/database.ts:22` always calls
`openDatabase(loadConfig())`; `migrations/migrate.ts:46` defaults to migrate.
Only `scripts/db-migrate.ts:26` reads `MIGRATION_MODE`, so setting it for the
application does not select verification. Additionally,
`postgres-migrator.ts:62` calls `createJournal()` before the `verifyOnly`
branch at `:67`, attempting schema/table creation even in verification mode.

A runtime role limited to data operations can fail before handling requests
despite the migration Job already completing. On an uninitialized database,
"verification" can create journal objects before reporting missing migrations.
The documentation promise is stronger than what startup and verify implement.
No live restricted-role acceptance test was found; this finding is based on
the exact call and statement ordering, not a locally executed PostgreSQL run.

### DRIFT-4 — PostgreSQL verification has a broken fixture and incomplete container evidence

**Type:** PUNTED-FR / CROSS-WP-INTEGRATION. **Severity:** HIGH.
**Spec:** FR-011, success criteria 1 and 4; plan's production-startup gates.
**Evidence:** `tests/db/postgres.operations.test.ts:54` creates an empty
database. The bounded-pool case at `:102` and outage case at `:152` call
`createDatabaseServices(config).open()` and immediately use `users`, with
no `migrateDatabase(config)` in their path. The production adapter's
`adapters/postgres.ts:522` only connects and issues `SELECT 1`; it never
creates tables. Thus those operations target nonexistent `users` tables.
The readiness-transition case uses `openDatabase` and is a different path.

Separately, no workflow invokes `tests/container/smoke-postgres.sh`.
The manual image validation exercises only SQLite. The PostgreSQL smoke
script at `:79` ignores restart-readiness failure, and at `:85` merely prints
that objective persistence was unconfirmed, then reaches PASS at `:94`.
A lost write/restart regression can therefore return exit 0.

WP08/WP09 approvals explicitly deferred live PostgreSQL to CI. The mandatory
operational suite's setup is not sufficient for that CI execution, and a
script existing on disk is not evidence it ran. No live PG failure transcript
is claimed here: the missing migration is directly established by the fixture
and adapter call graph. Migrate those fixtures, make persistence failure
nonzero, and run production-image scenarios in both modes before release.

### DRIFT-5 — Repository tests do not close the promised HTTP and application integration chain

**Type:** PUNTED-FR. **Severity:** MEDIUM.
**Spec:** FR-006, FR-007, FR-011; `plan.md:83` HTTP scenarios.
**Evidence:** `tests/domains/auth/auth.suite.ts:18` creates repository users;
it does not execute authentication/session-cookie requests or admin guards.
`tests/domains/integrations/integrations.suite.ts:17` manually updates a
friend request and creates a friendship. Its plugin, saved-query and AI
cases persist records rather than invoking scheduler writes, QuickJS async
bridging, friend dashboard handlers or AI tools.

These are useful real-database tests, not false fixtures, but deleting an HTTP
authorization check or breaking an application query bridge would not fail
them. The shipped production smoke covers a minimal goal journey, not the
promised two-account permission and custom-query/plugin scenarios. Add
request-path coverage without replacing real databases with mocks.

## Risk Findings

### RISK-1 — Probes do not track runtime database availability or recoverable startup failures

**Type:** BOUNDARY-CONDITION / ERROR-PATH. **Severity:** HIGH.
**Location:** `src/hooks.server.ts:21`, `:56`;
`src/lib/server/database.ts:22`; `src/lib/db/lifecycle.ts:94`;
`src/lib/db/adapters/postgres.ts:539`; `src/routes/api/ready/+server.ts:15`.
**Spec:** FR-005, FR-012; `plan.md:60` distinguishes liveness/readiness.

Every request, including health probes, awaits database initialization before
the route runs. On failed startup, both cached `opening` and `initializing`
retain the rejected Promise. Subsequent requests cannot retry when the
database recovers; the `/api/ready` handler's intended 503 response is never
reached, and process liveness is also blocked on the failed initialization.

After successful initialization, readiness checks only a stored migration
version and `_open`. PostgreSQL `_open` stays true until explicit `close()`;
no live readiness query or pool error handler updates it on outage. Without a
session cookie, the readiness request performs no later DB operation and can
continue returning 200 for an unavailable database. Pool idle errors also
lack an explicit listener; process behavior on such errors needs live testing.

The operational tests check open/explicit-close state and rejected repository
queries, not HTTP readiness through outage and recovery. The postgres smoke
script's comments describe failed liveness during startup as "by design",
contradicting the liveness endpoint's stated independence.

### RISK-2 — Image publication is independent of required CI results

**Type:** CROSS-WP-INTEGRATION. **Severity:** HIGH.
**Location:** `.github/workflows/ruok-image.yml:145`; separate RUOK CI workflow.
**Spec:** `plan.md:86` says trusted publication happens after checks pass.

The push-to-main publish job has no dependency on RUOK CI or verification of
successful checks for its SHA. It runs `npm run build`, but no backend tests.
The operator's later request moves CI to PR events only. Publication itself
therefore still accepts an untested direct main push or a merge whose checks
were not enforced. Branch-protection settings were not inspected, so do not
assume they prevent those paths. The code comment calling the image the
"tested commit" establishes revision identity, not test success.

Main-only publication is an accepted trigger change. The missing evidence
link to successful checks predates it and remains unresolved. Enforce tested
merge policy in repository settings and/or gate publication on verified checks
for that exact revision, consistent with the operator's requested CI policy.

## Silent Failure Candidates

| Location | Condition | Silent result | Impact |
|---|---|---|---|
| `migrations/fingerprint.ts:88` | Expected index name, incompatible definition | Accepted as ready | DRIFT-2: schema integrity promise fails |
| `db/config.ts:80,224` | URL SSL option overrides explicit verification | pg silently changes effective TLS | DRIFT-1: verification disabled or CA lost |
| `db/lifecycle.ts:94` | Database unavailable after initial open | Cached `ready:true` | RISK-1: unavailable instance advertised healthy |
| `tests/container/smoke-postgres.sh:85` | Objective missing after restart | NOTE and final successful exit | DRIFT-4: false-positive persistence evidence |
| `tests/recovery/postgres-recovery.test.ts:43` | Missing dump tools/admin URL | Entire rehearsal skipped | Recovery claim needs CI proof; fail closed in required CI |
| `migrations/postgres-migrator.ts:133` | Advisory unlock query fails | `undefined` | Connection teardown normally releases lock; retain diagnostic context |
| `src/lib/server/query/security.ts:68` catch | Audit-log insert fails | Error logged, execution continues | Existing best-effort pattern; log persistence can be incomplete |

This is the inspected set, not a claim that every exception handler in the
20,000-line implementation was exhaustively proven safe.

## Security Notes

| Finding | Location | Risk class | Recommendation |
|---|---|---|---|
| DRIFT-1 | `db/config.ts:224` and pg URL parsing | TLS-DOWNGRADE | Reject/normalize contradictory URL SSL controls; verify effective Client and actual CA behavior |
| DRIFT-2 | `migrations/fingerprint.ts:88` | AUTH-CONSTRAINT-INTEGRITY | Fingerprint uniqueness and indexed columns; extend live-drift rejection tests |
| DRIFT-3 | `postgres-migrator.ts:62` | LEAST-PRIVILEGE | Verify without issuing DDL; test runtime role with no CREATE rights |
| DRIFT-5 | repository-only privacy scenarios | AUTHORIZATION-COVERAGE | Test actual unauthenticated, foreign-user and non-admin HTTP paths |

No new shell injection or source-level plaintext credential embedding was
identified in the inspected packaging/configuration paths. This does not
override the confirmed TLS finding. Backup restore is scoped to authenticated
`locals.user.id`, plans fresh IDs, and both inspected adapter implementations
use bounded transactions. PostgreSQL snapshot export uses REPEATABLE READ.

## Review History and Ownership

WP01, WP02 and WP05 each had one rejection and second-cycle approval. Their
three forced events were rewinds from `in_review` to `planned`, not forced
approvals. No `ReviewerSelfApproval` event or 3+ rejection/arbiter approval
sequence was found. Re-review artifacts name `user`; runtime review claims
name the configured reviewer profile/tool. This record alone cannot prove
human or agent independence beyond the recorded identities.

Verified prior fixes include FR-001 config assertions/default test selection,
the expected_hours default and three-surface schema comparison, removed
orphan task-tag helpers, and the task timer concurrent-stop response re-read.
Those fixes do not close the new TLS, probe or live-PG findings.

Owned-file comparison found expected unchanged paths: historical SQLite
`drizzle/` SQL is intentionally frozen; the existing SQLite drizzle config
needs no new backend branch; login/register pages are client-only; unchanged
admin/plugin routes call server helpers whose persistence was migrated;
events and shared frontend types do not own driver operations. These absences
are not classified as missing implementation. No consumer raw-driver import
was found. Shared adapter/package changes span multiple WPs, consistent with
the planned staged cutover; coarse ownership alone is not reported as a defect.

## Final Verdict

**FAIL.** The typed adapter boundary, SQLite contracts, transactional backup
design and extensive operating documentation are substantial delivery, but
they do not fulfill the complete release promise. DRIFT-1 and DRIFT-2 are
reproduced HIGH defects; DRIFT-3, DRIFT-4, RISK-1 and RISK-2 are HIGH defects
or release evidence gaps established by concrete call paths. Live PostgreSQL
and image validation have not been established by this review, and the full
local required suite is not green. Resolve these blockers and collect real
both-backend production evidence before release sign-off.

### Open items (non-blocking)

- Add the HTTP-level coverage in DRIFT-5 and preserve real database execution.
- Reconcile stale "planning only" status text in spec/tasks/meta with actual
  completion through an explicit documentation follow-up; it is not evidence
  that the implementation was unauthorized.
- Update documents that still promise PostgreSQL 16/17, automatic PR image
  checks or release publication after the operator's accepted policy changes.
- Keep the known baseline UI type-check debt separate from new backend defects.
- Diagnose the probe child-output failure and migration concurrency flakiness;
  do not fix these by making required tests optional.
- Verify installed PostgreSQL dump/restore tools match the CI server major;
  the recovery test currently can skip instead of proving that requirement.

## Retrospective Reminder

The canonical sequence is mission review → author or verify retrospective →
surface findings. The runtime terminus did author the record: verified
`kitty-specs/sqlite-postgresql-support-01M5JP6Y/retrospective.yaml`, with
`provenance.kind: runtime_post_completion` and the matching
`RetrospectiveCaptured` event. This installation stores it beside the mission
artifacts; the generic `.kittify/missions/<id>/retrospective.yaml` path is absent.
No replacement record was fabricated.

Use `spec-kitty retrospect summary` for aggregation and
`spec-kitty agent retrospect synthesize --mission sqlite-postgresql-support-01M5JP6Y`
to inspect proposals (dry-run by default). Applying proposals with `--apply`
is a separate mutation. Capture this report's findings in the follow-up work
and retrospective review; the original automatic record predates this audit.

Both commands were executed during this review and exited 0. Summary reports
one completed mission with a valid retrospective and zero missing records.
Synthesis reports `planned=0 applied=0 conflicts=0 rejected=0 events_emitted=0`.
No proposals were applied.
