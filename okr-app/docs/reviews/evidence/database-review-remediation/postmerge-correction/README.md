# Post-merge corrective verification

The independent [mission audit](../../../database-review-findings-remediation-mission-review.md)
found real gaps after the original required suites passed. Its initial FAIL
report and counterexamples remain unchanged. This directory records the
corrective operation `01M71V7074RWQY0HAMEF8AQ4WX` and its independent re-review.

## Why the problems appeared

Readiness used a different initialization caller from ordinary requests. That
caller omitted the parsed migration mode, so the worker defaulted to `migrate`
even when the operator requested `verify`. The lifecycle now uses the same
pure parser before I/O and explicitly passes the selected mode to preparation.

SQLite inventory only included indexes with stored SQL. SQLite implements
inline UNIQUE and some primary keys as autoindexes without SQL; those
constraints escaped inspection. Foreign keys were checked only for expected
entries, so extra restrictions also escaped. Inspection now includes implicit
indexes, compares key semantics without relying on generated names, and
checks both missing and extra foreign keys. PK checks include collation and
direction, preserving the supported SERIAL/INTEGER journal variants.

Finally, the classifier returned `fresh` when application tables were absent
before validating the migration journal. It now validates journal records,
column shape and constraints first, and rejects recorded history without
application tables before any mutation. Genuine fresh storage and valid empty
journals still migrate successfully.

## Test-first evidence and preserved attempts

- `runtime-mode/red.log`: four readiness assertions fail on unfixed code; the
  default migration control passes. `green.log`: all five pass after the fix.
- `sqlite-schema/red.log`: twenty new cases fail; four controls pass. Follow-up
  `empty-journal-red.log`, `pk-red.log`, and `journal-pk-red.log` reproduce
  reviewer counterexamples before their respective fixes.
- `sqlite-schema/green.log`: the first 62-case migration/integrity run passes;
  it predates the additional reviewer cases and is not the final proof.
- Root-level `stages.jsonl`: initial integrated run passed build and SQLite,
  but stopped at PostgreSQL's missing private admin URL. Supplemental tests
  skipped five live PG cases. This attempt is not accepted as full coverage.
- `final-image/`: first image built from `f2d4bde`, with six expected scenario
  outcomes, but source-stability validation failed because the subsequent PK
  corrections changed three source/test files. It is not the accepted image.

## Final verification

Production source is `c6f9f30f7eabf77c3ce33796e70a8e81773647e6`;
the later test-only native-recovery budget amendment is
`383050ebab7145d923f6aaf51c1b3d22f86a6992`. The immutable local image is
`cc1cffc284fbb78bd0338d36883ca82ff3e38f33f560291e63525cc889b0a1aa`.
`final-image-final/postimage-test-amendment.json` identifies the sole changed
test file and verifies all 185 recorded product inputs remain identical.
The full 251-file check captured before that test amendment is preserved.

[Verification summary](verification-summary.json) checks actual exits, signals,
test totals and zero mandatory skips for these final executions:

| Verification | Result | Evidence |
|---|---|---|
| Production build | Exit 0 | `gates-serial/production-build.log` |
| Full suite, including SQLite application 27 and stability 3 | 173 passed | `gates-serial/full.log` |
| SQLite backend | 79 passed | `gates-serial/sqlite.log` |
| Supplemental integrity, readiness, no-DDL, worker and command contracts | 106 passed | `gates-serial/supplemental.log` |
| PostgreSQL backend after native test-budget repair | 93 passed | `native-recovery/postgres-backend.log` |
| PostgreSQL application | 25 passed | `gates-serial/application-postgres.log` |
| Native PostgreSQL recovery, normal package command | 1 passed | `native-recovery/standalone.log` |
| Svelte diagnostics | Same 18 errors / 4 warnings; zero added or resolved | `gates-serial/diagnostic-comparison.json` |
| Built SQLite readiness-first verify, invalid/default modes | PASS; recovery 1102 ms, same PID, no catalog/journal changes | `runtime-mode/built-final/run.log` |
| Built PostgreSQL restricted-role HTTP verify | PASS; 309.1 ms, active DDL guard, no CREATE/ownership, unchanged catalog/journal | `restricted-http/final/proof.log` |
| Image persistence and lost-write controls, both backends | Two positives exit 0; two intended negatives exit 1 | `final-image-final/*positive.log`, `*lost-write.log` |
| Phase-specific never-ready controls, both backends | Outer exit 0; both intended faults exit 1 after successful setup | `runtime-mode/controls-final/run.log` |

The first final-source integrated run (`gates-final/`) passed 105 supplemental
cases but an unchanged five-second worker-lock test timed out during an image
build. The complete supplemental run passed 106 cases serially without changing
that test or its deadline. `gates-serial/postgres.log` then retained the native
rehearsal's five-second default timeout failure. A single diagnostic proved the
whole recovery path completed; it did not identify the earlier slow phase.
Independent review approved a local 30-second aggregate test budget because the
composed workflow already permits ten-second connection/thirty-second SQL
operations and has no native five-second SLA. All assertions, tool arguments,
connection configuration and product code remain unchanged. Normal standalone
and complete PostgreSQL commands then passed; the diagnostic CLI override is
not counted as an acceptance run. See `native-recovery/implementation.md`.

The [independent corrective review](corrective-review.md) records the final
verdict separately from the initial audit. The CLI acceptance matrix is restored
only after that review and the immutable evidence commit exist.

The verifier uses Node 22 and the existing exact-lock Alpine development
modules, real SQLite files, PostgreSQL 18 and matching native client tools.
Unit/integration fixture storage is on tmpfs to avoid host overlay fsync
contention. Production image persistence and readiness proofs use disk storage.
No assertion retries are used; HTTP and post-fault deadlines are unchanged.
The explicit native aggregate budget amendment is described above. PostgreSQL credentials
remain private environment values and are redacted by the existing recorder.

The corrected image's first never-ready SQLite attempt timed out during initial
setup, before fault injection. Its nonzero exit alone is insufficient evidence:
the missing CONTROL marker made the aggregate runner stop. The separate phase-specific proof established initial readiness/write success
before stopping the restarted container and exercising the unchanged five-second
post-fault deadline, with distinct markers required for both backends.
The image's pre-amendment complete 251-file source manifest passed its separate
checksum verification; the interrupted aggregate runner is not reported as exit zero.

The first restricted-role HTTP harness expected `ready` for a newly created
database, although the successful migration correctly reports `fresh`.
`restricted-http/attempt1/` preserves the source and failed oracle. The revised
proof derives the expected migration counts, table inventory and journal hashes
from the image's own frozen history before exercising its runtime HTTP path.

## How to check again

From `okr-app/`, with the committed lockfile installed in a compatible Node 22
environment, first provide a private disposable `DATABASE_URL` and
`RUOK_TEST_PG_ADMIN_URL`, plus matching `pg_dump`, `pg_restore` and `psql`.
Run the exact commands in `gates.sh`; that script expects the documented
`/workspace/okr-app` Podman mount. It explicitly runs the supplemental integrity
and readiness tests because the package scripts enumerate test entrypoints.

The recorded `final-image-final/run.sh` binds the original build and scenario
commands to this image. Copy its output paths to a fresh directory before a
rebuild/replay; preserve existing results. For never-ready controls, use the
phase-specific `runtime-mode/never-ready-controls.sh` with `IMAGE` and a new
output directory so initial setup and the post-fault deadline remain distinct.
The separate `runtime-mode/built-proof.sh` requires an immutable local `IMAGE`
and a new output directory. `restricted-http/run.sh` likewise takes an immutable `IMAGE` and a new output
directory, with private `DATABASE_URL` supplied from the disposable superuser
fixture. Its proof runs inside that image and actively rejects runtime DDL
using a disposable database event trigger before testing actual HTTP readiness.

The existing Svelte check baseline is 18 errors and four warnings; comparison
must show zero new diagnostic identities, rather than treating exit 1 as a
clean type check. RISK-2 remains unresolved and operator-deferred. Dependencies,
historical migrations and CI/CD behavior remain outside this correction.

## Process lessons

Passing declared suites did not prove every initialization caller followed the
operator's mode. Future reviews should trace startup, readiness, ordinary
requests and command-line entrypoints separately. Compare SQLite constraints
through live metadata, including implicit objects, and validate internal
journals before any early-return classification. Test an incompatible extra
constraint as well as a changed or missing expected one.

Run tight timing gates without concurrent image builds. Keep explicit fixture
prerequisites fail-closed, and keep setup and injected-fault deadlines separate
in proof harnesses. A deliberate failure counts only after the intended fault
marker and failing assertion are both observed. Preserve failed attempts and
use independent counterexamples to improve coverage before restoring acceptance.
