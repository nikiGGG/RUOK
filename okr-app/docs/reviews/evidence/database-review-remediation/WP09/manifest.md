# WP09 evidence manifest

Mission: `database-review-findings-remediation-01M5TGCE`.
WP09 owns only the two database operating/verification guides, follow-up review
and this evidence directory. Prior owner evidence remains unchanged.
The orchestrator explicitly coordinated a bounded cross-owner
test repair in `tests/db/no-init.test.ts` and
`tests/application/probes.suite.ts` after the failures below; those changes are
separately authored and require independent review rather than silent ownership
drift. It also coordinated the one-method availability return-type correction
in `src/lib/db/adapters/sqlite-local.ts`, documented separately in
`availability-repair/README.md`. Its query/error behavior is preserved and the success result now satisfies the
existing boolean contract.
The subsequent live PostgreSQL matrix exposed a fourth, narrowly coordinated
test exception: the query-log case in
`tests/domains/integrations/integrations.suite.ts`. It now uses whole-second
deterministic timestamps and exact inclusive-cutoff IDs plus an empty future
cutoff; both adapters' already-correct `>=` implementations remain unchanged.
See `log-cutoff-repair/README.md` and the incremental planning-scope patch.
The live PostgreSQL availability case then exposed the actual idempotent-close
contract defect: a direct close followed by fixture teardown invoked `pool.end()`
twice. The orchestrator explicitly added the WP04-owned PostgreSQL adapter
open/close lifecycle and existing live availability case to WP09, with a second
runtime-source repair and stronger real-connection-count regression. See
`postgres-close-repair/README.md` and
`planning-postgres-close-scope.patch`. No unrelated SQL, TLS, query timeout,
configuration or earlier owner evidence changes are authorized.

Status: **implementation evidence complete; ready for independent review**.
All eight final mandatory test stages passed with zero mandatory skips, exact
baseline/current diagnostic identities match, the supplemental PostgreSQL HTTP
cycle passed, and the final-source production image passed six expected cases
with unchanged tracked source/test hashes. RISK-2 remains unresolved/operator-
deferred. No acceptance, merge, deployment or publication is claimed here.

## Final result

`result-matrix.md` is generated from actual stage/log records. Final counts:
full 173/173, SQLite backend 79/79, PostgreSQL backend 93/93, SQLite application
27/27, PostgreSQL application 25/25, native PostgreSQL recovery 1/1, stability
3/3 (ten independent attempts within each stability case), and additional
semantic/no-DDL/availability/worker/command contracts 62/62. All have zero
mandatory skips and no retries. The final production build exited 0; the focused
PostgreSQL close case additionally observed actual pool connections 0 → 1 → 0.

`current_check_after_pg_close.log` and `baseline-check.log` both retain exit 1:
18 errors and 4 warnings each, with zero added/resolved identities in
`diagnostic-comparison-after-pg-close.json`. Existing UI debt is not suppressed;
the extra worker-private return-type error found during integration was fixed.
The full corrected run completed 2026-11-09T11:52:56.025Z.

Final image `76851d5c343ef90ab57a6313db88d73a341e0f53c7380d6052f7cfd87d1fb06d`
built successfully and completed both backend persistence positives and all four
intended fault negatives at 19:35:51Z, with source stability exit 0. Its source
base is `b70d064becea4f23d40d6557041fb7ca9f1867a6` plus captured source/test dirty
diff SHA-256 `7d5b276c0e9000957a2a8660c974e24dd4d807c82ab8fe2d5b64daa97bbd94aa`.
The individual final source-file hashes and final actual image identity are in
`final-image/`; a local image ID is not a registry manifest digest.

## Initial blocking results and coordinated repair

The initial integrated build passed at 2026-11-09T04:41:13.504Z, but its explicit
development NODE_ENV made it unsuitable as final production-build proof. The
continuation separately executed `NODE_ENV=production npm run build` successfully,
then repeated it only after the actual availability source correction (exit 0
at 04:54:30.015Z). The first full
`npm test` command then exited 1 at 04:42:57.533Z: 19 of 21 files and 171 of
173 tests passed. Two tests exceeded Vitest's default aggregate 5000 ms budget:

- `tests/application/probes.suite.ts:60`, healthy startup plus health/readiness.
- `tests/db/no-init.test.ts:56`, ten independent child-process import probes.

See `full.log` and `stages.jsonl`. These are actual required-suite failures,
not the unrelated Python coverage-artifact record. Subsequent stages did not
execute in that attempt. At that point WP09 was incomplete; the owners subsequently
diagnosed and repaired the aggregate budgets as recorded below, preserving
per-request probe bounds and all stability assertions.

The coordinated repair must preserve ten independent no-init runs, disable
retries, keep each HTTP probe within five seconds (including response body),
capture child stderr/signals/timings and apply bounded per-child execution.
Aggregate budgets can account for multiple child processes and fixture startup;
they do not relax the individual operation contracts. The initial failures stay
in `full.log`; no successful rerun may erase them.

After repair, `focused-no-init.log` records both tests passing with all ten
separate children reporting exit 0, null signal, empty stderr and exact unopened
state; monotonic per-child times are recorded. The focused run exited 0 at
04:55:03.392Z. Complete application and full-suite verification subsequently passed, as recorded in the final result.

The initial type comparison found one additional `SqliteLocalServices`
availability return-type diagnostic (22 baseline diagnostic identities versus
23 current). After the narrow boolean correction, the fresh comparison exited 0
at 04:54:53.015Z: 22 baseline and 22 current, zero added/resolved identities.
`current-check-after-repair.log` and `baseline-check.log` both preserve their
actual nonzero check status. The original failed current/comparison logs remain
alongside `diagnostic-comparison-after-repair.json`; no historical count waiver
or diagnostic suppression is used.

The next unmodified `npm run test:db:sqlite` execution exited 1 at
04:56:30.505Z: 67/79 tests passed, with twelve aggregate 5000 ms timeouts across
seven files. The original `sqlite.log` is preserved. Passing cases showed
substantial fixture/worker overhead, so the parent investigated scheduler
contention rather than raising all deadlines. A distinct, explicitly authorized
single-file-scheduler experiment and subsequent complete matrix may establish a
reproducible execution environment; all test content, strict per-test deadlines,
in-test concurrency and zero retries remain. The subsequent controlled results
are recorded below, separately from these failed attempts.

The single-worker FUSE run improved SQLite to 77/79 but still failed the backup
round trip and upgrade deadlines; `sqlite-deterministic.log` remains. The
controlled tmpfs diagnostic passed those cases in 1,473/877 ms with the original
5,000 ms limits and no source edits. The complete SQLite package then passed
79/79 with zero skips in `sqlite_tmpfs.log` (11:20:02.059Z–11:21:11.916Z).
This establishes the recorded functional-test environment, not power-loss or
production-disk-latency guarantees; see `tmpfs-assessment.md` and raw filesystem
records. Final image scenarios retain disk-backed volumes.

The first real PostgreSQL package run on that environment passed 92/93 tests
and failed the old query-log cutoff oracle. It inserted rows and then chose a
later `new Date()` cutoff while expecting earlier rows to match. PostgreSQL
correctly returned none; SQLite's second precision had hidden the incorrect
expectation. `postgres_tmpfs.log` preserves the actual assertion failure, not a
timeout or missing prerequisite. The coordinated deterministic test repair
strengthens cutoff assertions and requires new complete SQLite/PostgreSQL runs
because shared test source changed. The replacement stages use distinct names
`sqlite_after_cutoff_tmpfs` and `postgres_after_cutoff_tmpfs`; earlier results are
not overwritten or falsely treated as final-source proof.

After the cutoff repair, complete SQLite and PostgreSQL backend commands passed
79/79 and 93/93 respectively. Both application commands, PostgreSQL native
recovery and ten-run stability also passed. The focused remaining-contract run
then failed one of 62 live tests: `Called end on pool more than once` from the
PostgreSQL availability case's direct close plus fixture teardown. That actual
contract failure remains in `remaining_contracts_tmpfs.log` and requires the
coordinated shared-close/safe-reopen fix and fresh affected PostgreSQL/focused/full
runs. Previously green unchanged SQLite/application/stability results are not
blindly repeated. Fresh logs have distinct after-close stage names.

## PostgreSQL HTTP coverage audit

The generic `probesSuite` full unavailable-startup/first-recovery/later-outage/
second-recovery cycle is inside `if (host.backend === 'sqlite')`. The PostgreSQL
application entrypoint runs healthy readiness and a permanently unreachable
startup baseline only. Its file count or green status does not prove PostgreSQL
HTTP recovery bounds. `postgres.operations.test.ts` covers open/close/reopen and
a controlled dropped-database error; `availability.test.ts` supplies healthy
PostgreSQL availability. Neither is the missing same-PID full HTTP sequence.

The gap was closed by `postgres-probe-proof/manifest.md` and `cycle.log`.
The successful cycle ran 19:29:43.352Z–19:29:51.199Z with one PID 8108: initial
verify-mode unavailable startup; schema-availability recovery in 1021.5 ms;
actual idle-pool marker 0 → 1; later readiness 503 within about 26 ms of the
fault; second recovery in 14.1 ms; exact original objective ID/title retained.
Every probe/body was below five seconds (largest probe 21.4 ms); cleanup had
zero failures. Sixteen recursive proof-artifact checksums and its secret scan
passed. The preserved first incomplete attempt exposed an observation-order
race, not a product failure: immediate readiness checkout acquired the dying
idle client before its idle listener. The revised harness observes the actual
new idle marker first, still within the original fault-anchored detection bound.
No acceptance assertion, deadline, product source or existing test was changed
for that successful supplemental proof.

## Replay and historical harnesses

Use `REPLAY.md` in an isolated checkout of the final reviewed source. It supplies
the exact Node22/client setup, current-source build/check comparison, complete
single-worker/tmpfs matrix, supplemental live boundary replays and final disk-
backed production-image cases. `run-integrated.sh`, `inside.sh` and subsequent
continuation harnesses remain as records of the staged investigation; their
initial default-FUSE/development-mode path is not the final accepted recipe.

The verifier uses cached reviewed runtime image `localhost/ruok:wp08` with
`--pull=never`, Node 22.23.4, npm 10.9.9 and PostgreSQL/native clients 18.6. Exact-
lock development dependencies are installed with `npm ci --include=dev`.
Production builds explicitly use NODE_ENV=production; tests use NODE_ENV=test.
The unchanged lockfile hash is recorded in `provenance.txt` and the final image.

`run-command.cjs` buffers complete stdout/stderr in memory, redacts secrets before
writing stage logs, and records exact command/cwd/UTC/exit/signal in each log and
`stages.jsonl`. Each failed attempt remains separate. Only a real source repair
or documented controlled environment change justified another execution; no
assertion was removed, test narrowed, framework retry enabled or failure hidden.

The original-source index test failed at its intended resolved-migration oracle
and the current-source equivalent passed. Filtered diagnostic/fault cases are
not acceptance coverage; the complete semantic suite and all required commands
execute without mandatory skips. Native backend operations remain real.

## Owner inventory

`inventory.cjs <source-head>` reads earlier owner files without changing them;
`owner-inventory.json` records actual artifact SHA-256 values and each listed
checksum comparison. `inventory-summary.log` gives counts. Old absolute macOS
paths in WP07 are explicitly mapped to their repository-relative `okr-app/`
suffix. Historical source hashes in WP03 and WP10 differ where later approved
work packages changed those sources; this is not an evidence-payload rewrite.
The older WP01/WP02 manifests remain intact and their execution/provenance gaps
are addressed only by linked supplemental executions.

## Independent live evidence

The [WP08 manifest](../WP08/manifest.md) records both backend image positives,
original false PASS and four intended fault failures with one image identity;
all 25 listed artifacts were independently checksum-verified during review.
The [supplemental TLS proof](tls-proof/README.md) completed 2026-11-09
04:45:59Z–04:46:10Z with exit 0 against source `b70d064`. Both real runtime
pool and migration client select successfully with trusted matching CA/TLS,
reject a foreign CA and reject a hostname mismatch (six live cases). It also
reproduces raw-pg parser TLS downgrade/CA loss and verifies the fixed canonical
policy. Exact product-source hashes, image identities, runtime versions and
public certificate identity are captured; seven artifact checksums pass, and
the proof's secret scan found no credential URL or private key material. This
fills WP01's historical live-provenance gap without rewriting that owner record.

## Completion checks and next handoff

- Required full/backend/application/recovery, focused contracts and ten-run stability passed.
- Same-lock baseline/current diagnostic identities match; actual check exit 1 remains recorded.
- Original/fixed SQLite semantic replay, TLS and PostgreSQL full HTTP cycle have complete provenance.
- Final corrected-source image passed both positives/four intended negatives; source hashes stayed unchanged.
- Workflow/migration/history/lockfile baseline diff is empty (`constraints.log`).
- Final link, syntax/whitespace, secret scan and artifact checksum results are in `validation.log`, `link-check.log`, `secret-scan.log` and `SHA256SUMS`.

The checksum inventory pins existing premerge artifacts and prepared postmerge
scripts. Later target-checkout validation writes separate `postmerge/` execution
logs and its own checksums without replacing these earlier results. Independent
WP09 review must inspect all six explicitly coordinated source/test exceptions,
the filesystem qualification and both supplemental live proofs. Acceptance and
local merge follow only if that review approves. RISK-2 remains unresolved and
operator-deferred; no deployment or publication is part of this handoff.

The final secret audit separates exact private URL/password matches, private-key headers and unexpected credential-shaped URIs: all three counts are zero. A per-file byte-exact public-source allowlist covers only the guide’s `user:pass@host` example and the TLS harness’s unevaluated password interpolation, plus the scanner’s copies of those literals; six public literal occurrences are reported. Executed TLS proof source is unchanged.
