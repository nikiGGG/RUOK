# Implementation verification quickstart

This is an execution recipe for the later implementation, not a record of tests
already run. Run shell commands from repository root using the indicated workdir.
Do not invoke task generation or application implementation during planning.

## 1. Preflight and baseline

Record UTC time, `git rev-parse HEAD`, relevant dirty diff, Node/npm and actual
lockfile driver versions. Record current UI diagnostic identities using
`npm run check` in `okr-app/`; compare after changes, not against a fixed count.
Capture baseline full-suite and targeted finding failures before each fix.
Only use disposable databases and isolated ports. Never print credential variables.

Provision live PostgreSQL 18 with a disposable-database admin credential provided
privately as RUOK_TEST_PG_ADMIN_URL. Prepare TLS trusted/untrusted/hostname fixtures
and a runtime role that owns no objects, lacks CREATE and has only required
runtime/journal privileges. Revoke PUBLIC CREATE as well. Verify actual server
and pg_dump/pg_restore/psql compatibility before recovery.

Use Docker for mandatory production-image checks. Record every required base,
frontend or fixture image and identity. If ANY required image download fails,
STOP ALL mission work immediately. Report exact image/tag/digest, registry,
attempted command and redacted error; ask operator and wait for explicit direction.
No substitute, alternate registry, network-setting workaround or continued work.
Planning has attempted no image download and makes no environment readiness claim.

## 2. Regressions and implementation sequence

For each finding, first execute its targeted baseline regression or documented
controlled equivalent. Save redacted output/status before applying the fix.
Implement canonical TLS and semantic descriptors, then startup mode/no-DDL,
then lifecycle/probes, then integrate application and image checks. Preserve
existing assertions; fixture bugs must not obscure intended operational assertions.

Build the app in `okr-app/` with `npm run build`. The implementation must add
explicit required application entrypoints `test:application:sqlite` and
`test:application:postgres`, wired to the new real HTTP/application suites.
The PostgreSQL entrypoint requires prerequisites rather than skipping.

## 3. Required suites (workdir: okr-app)

```bash
npm test
npm run test:db:sqlite
npm run test:db:postgres
npm run test:application:sqlite
npm run test:application:postgres
npm run test:recovery:postgres
npm run build
npm run check
```

The two application commands are planned additions, not commands claimed present
today. The PostgreSQL backend/recovery commands must be hardened to fail missing
prerequisites. Record all exit codes; backend/required suites need zero failures
and all mandatory cases executed. Compare UI diagnostics with captured baseline;
no new failures may hide in historical debt.

Run `tests/db/concurrency.test.ts` and `tests/db/no-init.test.ts` ten consecutive
times using installed Vitest with retry disabled. Each run must pass; stop and
diagnose a failure, never retry it into a green series. Record child stderr,
signals and exit status for diagnosis. Test cleanup must isolate bundled output.

Run actual HTTP traces every second through unavailable startup, first recovery,
later outage and second recovery. Record response status, elapsed monotonic time
and unchanged process identity. Health is always 200; readiness is truthful 503/200
within 5/10/30-second bounds. Include idle pool errors, saturated checkout,
concurrent init and held SQLite lock responsiveness.

## 4. Controlled fault sensitivity

In an isolated disposable source copy, record exact patch/checksum for an admin
check removal, ownership filter removal and broken async bridge result. Execute
each relevant test expecting failure, restore source and execute it green. Do not
apply mutations in the main checkout or include fault code in final changes.
Likewise prove schema/TLS/no-DDL and image checks detect their original defect or
documented controlled equivalent. Capture zero attempted DDL with statement records
and unchanged object inventories; successful startup alone does not prove this.

## 5. Manual production images (workdir: okr-app)

After script hardening, invoke the existing shell entrypoints manually:

```bash
bash tests/container/smoke-sqlite.sh
bash tests/container/smoke-postgres.sh
```

Supply live DATABASE_URL privately for PostgreSQL and configure the same
RUOK_SMOKE_IMAGE identity for both. The hardened full PostgreSQL run must reject
a missing URL. Record image IDs/digests and source build identity. Persist exact
objective ID/title through container restart with the original account; do not
recreate records to make the check green. Run controlled lost-write and never-ready
negative scenarios and require nonzero exit. No publication or workflow edits.

## 6. Durable closure

Commit redacted commands/status/output, versions, timing traces and SHA-256
artifact checksums under
`okr-app/docs/reviews/evidence/database-review-remediation/`. Remove cookies,
passwords, private CA keys and credential URLs before saving durable artifacts.
Link each finding's before/after proof from the new follow-up report
`okr-app/docs/reviews/database-review-findings-remediation.md`. The historical
review remains unchanged. RISK-2 stays unresolved and operator-deferred.

Verify `.github/workflows/` has no mission changes and repository settings were
not changed. Any missing live/evidence requirement remains incomplete and blocks
acceptance. This quickstart itself is not evidence of any PASS.
