# Supplemental PostgreSQL HTTP probe cycle

This evidence directory closes the PostgreSQL HTTP-cycle execution gap left
explicitly pending in the earlier WP04/WP06 records. It does not rewrite those
records and does not treat SQLite execution as PostgreSQL proof. Execution is
pending until `stages.jsonl` records `cycle` exit 0 and `cycle.log` contains
`PASS complete PostgreSQL HTTP cycle` followed by clean teardown.

## Executed result

The revised proof passed on 2026-11-09, 19:29:43.352Z–19:29:51.199Z, exit 0.
One built application process,PID 8108, completed the entire unavailable
startup→recovery→later outage→second recovery cycle in `verify` mode.
First readiness recovery took 1021.5 ms after the separate migration CLI
completed. The real idle-pool-error marker increased from 0 to 1 during a 2.3 ms
event observation. Later readiness reported503 within the original 10 s fault
budget (about 26 ms including fault injection and marker observation), while
health stayed200. Second recovery took 14.1 ms. The original objective ID/title
remained exact, process uptime increased and cleanup reported zero failures.

The longest recorded probe HTTP request including its body was 21.4 ms; all
proof HTTP requests, including ordinary registration/write/read traffic, were
below 5 s (largest 1554.4 ms). All required phase assertions passed without an
application restart, fault replay or assertion retry. `manifest.md` maps the
timestamps, bounds and provenance; `SHA256SUMS` covers the completed and
preserved failed-attempt artifacts.

## Preserved first attempt

`attempt1/` contains the untouched first execution's source scripts,
compile/provenance/stage record and transcript. It exited 1 on 2026-11-09 after
successfully proving unavailable startup, first recovery and later outage
detection on one PID, because its intended idle-pool-error marker was absent.
That incomplete execution is not counted as a passing complete cycle.

The harness immediately checked readiness after terminating an idle backend.
The installed `pg-pool` implementation removes an idle client's `idleListener`
when `_acquireClient` checks it out (`node_modules/pg-pool/index.js:344`).
Therefore the immediate readiness query can race the incoming PostgreSQL
termination error and convert the intended idle fault into an active-query
failure, which the product correctly reports as unavailable. The built product
contains the expected idle-error handler and the fixture's actual child PID
was captured; there is no evidence here of a missing product handler.

The revised proof keeps the same strict production-marker assertion and waits
event-wise for a **new** marker relative to the pre-fault count, for at most 1 s,
before issuing any database-readiness checkout. It records the baseline count,
delta and event-wait duration. This observation wait is included in the original
fault-injection-anchored10s outage detection budget, not added on top. It is
not a retry of the fault or a relaxed assertion; no product source was changed.

After the integrated verification matrix has finished and the current product
build is stable, execute visibly from the host:

```bash
podman exec ruok-wp09-verify sh docs/reviews/evidence/database-review-remediation/WP09/postgres-probe-proof/run.sh
```

The retained verifier has the private PostgreSQL connection environment and
the exact-lockfile Node22 tools. The proof connects its admin Client to the
`postgres` database and allocates a cryptographically unique database name;
the existing application's fixture database and other verification databases
are not altered.

`cycle.ts` imports the actual `startServer` and `CookieJar` from
`tests/application/http-fixture.ts`. That helper starts the real adapter-node
`node build` process from the current mounted workspace. The private temporary
CommonJS bundle fixes the compiled helper's `import.meta.url` to its original
source location so its build-directory resolution remains unchanged; it does
not substitute a backend implementation. An observer on the fixture's actual
`spawn(node, ['build'])` records child lifetime and counts the production
`[postgres] idle pool error:` marker without persisting raw process output.

| Phase | Actual external action | Required evidence |
| --- | --- | --- |
| Startup unavailable | Start `MIGRATION_MODE=verify` app against unique nonexistent DB | HTTP health 200, ready 503, ready:false |
| First recovery | Admin `CREATE DATABASE`, then actual built `/app/build/db-migrate.mjs` in separate `migrate` context | Same app PID, ready 200 within 30 s after schema is available |
| Ordinary persistence | Real user registration and objective create/list routes | Exact nonempty objective ID and title |
| Later outage | Require an idle app backend, disable new DB connections and terminate its real backends | HTTP ready 503 within 10 s, health 200, observed production idle-error marker, child alive |
| Second recovery | Re-enable new DB connections | Same app PID, ready 200 within 30 s and increasing process uptime |
| Persistence after recovery | Authenticated original cookie jar and exact list query | Original objective ID/title retained without recreation |
| Teardown | Stop built process, restore/drop unique DB and verify absence | Zero cleanup failures |

Each proof HTTP call has a combined five-second AbortSignal that covers the
response body and an explicit monotonic duration assertion. The global
test-side fetch wrapper also applies the same bound to the original fixture's
listening probes while preserving a stricter caller signal. Readiness state
detection/recovery polls once per second, with monotonic whole-phase bounds;
there is no rerun of a failed scenario or retry of authentication/writes.
The imported fixture's separate transport/listener startup loop samples every
250 ms; this is documented boot orchestration, not an undisclosed readiness
retry. The migration CLI is bounded to 20 s and admin SQL to 3 s.

`cycle.log` is written through the existing WP09 `run-command.cjs` redactor.
It contains UTC/monotonic timing, HTTP paths/status/durations, process PID,
uptime, safe objective ID/title and fault/cleanup counts, without passwords,
URLs, cookies or raw child logs. `provenance.txt` records exact command,
runtime versions, initial integrated source revision and current product,
fixture, harness, built CLI and full workspace-build fingerprints. The
retained verifier base-image identity is in the parent `provenance.txt`;
the application under test is the current mounted workspace build, not the
old image's embedded application. All compiled proof output is private
temporary data removed by the shell EXIT trap.
