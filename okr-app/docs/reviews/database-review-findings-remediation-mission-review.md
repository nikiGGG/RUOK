# Mission review: database review findings remediation

Audience: the RUOK operator and the maintainer deciding whether the locally merged remediation is ready to release.

Reviewer: independent Codex reviewer, CLI-resolved `reviewer-renata`; review and evidence only, no production fixes.
Date: 2026-11-10 (Europe/Samara).
Mission: `database-review-findings-remediation-01M5TGCE`, ID `01M5TGCE2YM9ND5B5HY1HQQM74`.
Target: `plan/sqlite-postgresql-support`; local merge `5f92e07`; reviewed target HEAD `10b7bd4f2b0839ebba3dcea65044090519ab61c5`.
Metadata baseline: `1aaafbe397c9d894c2046d26ea35c418597a8e8a`. The approved plan and WP prompts additionally freeze inspected reproduction baseline `0572599edc3e79dded5893aaaaef6867394a5288`; frozen surfaces and remediation source comparisons below use that inspected baseline.
WPs: all eleven, WP01–WP11, are `done` in canonical `status.json` and the merge events. Review source was the actual target checkout, not a lane checkout.

**Final verdict: FAIL.** Three HIGH findings were reproduced against unchanged merged source or its identical final built image. Readiness creates and migrates a fresh SQLite database despite `MIGRATION_MODE=verify`; SQLite migrate/verify accept incompatible extra constraints; a journal-only corrupt database is mutated as fresh. The actual-target production build and all 173 full-suite tests still pass, demonstrating concrete coverage gaps.

## Review basis and independence

I read the mission spec, plan, tasks, runtime-and-verification contract, canonical metadata/status/events, review-cycle records, closure report, final evidence matrix, relevant source and actual behavioral assertions. CLI commands `spec-kitty agent profile show reviewer-renata` and `spec-kitty charter context --action review --json` both exited 0; the latter reports no project charter, rather than supplying additional project rules.

Historical changes-requested cycles for WP01/03/05 concerned missing live proof, WP07 concerned the backend boolean assertion, and WP10 concerned preparation still executing SQLite on the HTTP thread. Later reviews and final proof address those specific issues. Six historical forced transitions route work back to planning; they are not forced approvals. I found no `ReviewerSelfApproval` or arbiter approval event. Earlier pending/skip records remain historical and are superseded only where final mandatory executions actually ran.

## Gate Results

These are RUOK TypeScript application gates. The skill's Python `tests/contract`, `tests/architectural` and Spec Kitty SaaS cross-repository scenarios describe the Spec Kitty product and do not exist as this mission's contracts. They were not run or represented as passing RUOK gates. No operator exception or lenient waiver substitutes for required application verification.

### Contract and required application gates

The committed [final matrix](evidence/database-review-remediation/WP09/result-matrix.md) and [stage ledger](evidence/database-review-remediation/WP09/stages.jsonl) record actual commands, UTC intervals and exits. All eight final mandatory groups exited 0, used `--maxWorkers=1 --retry=0`, and recorded zero mandatory skips:

| Actual command or explicit entry set | Passed |
|---|---:|
| `npm test` | 173 |
| `npm run test:db:sqlite` | 79 |
| `npm run test:db:postgres` | 93 |
| `npm run test:application:sqlite` | 27 |
| `npm run test:application:postgres` | 25 |
| `npm run test:recovery:postgres` | 1 |
| Explicit concurrency/no-init entry files | 3, with ten independent attempts per stability case |
| Explicit semantic/runtime-mode/no-DDL/availability/worker/command-coverage entries | 62 |

These are genuine passing tests. Their coverage limitation is documented in MR-1–MR-3 below, not converted into a fabricated failing suite result.

### Architectural and packaging gates

`NODE_ENV=production npm run build` exited 0 for final premerge source. Worker build/isolation proof and live callers establish that SQLite preparation and ordinary repository/backup/atomic work run through packaged workers. The final image retains its HEALTHCHECK. No new broad build or test run was started by this reviewer.

Actual-target postmerge verification completed: production build exit 0; full suite 173 passed, zero skipped, exit 0; whole runner exit 0; source-before/source-after exactly match the final image manifest, and all generated artifact checksums pass. The orchestrator confirmed these results. Commands and UTC intervals are in [postmerge/stages.jsonl](evidence/database-review-remediation/WP09/postmerge/stages.jsonl), with [source/image provenance](evidence/database-review-remediation/WP09/postmerge/provenance.txt).

### Live boundary and recovery gates

[Final image execution](evidence/database-review-remediation/WP09/final-image/live-results.txt): SQLite and PostgreSQL write/restart/exact-objective-read positives exit 0; each backend's lost-write and never-ready controls exit 1 as required. All six scenarios use local image ID `76851d5c343ef90ab57a6313db88d73a341e0f53c7380d6052f7cfd87d1fb06d`, accurately identified as a local image ID, not a registry manifest digest. Source manifests bind the proof to final merged application content. SQLite image volumes are disk-backed.

[TLS endpoint proof](evidence/database-review-remediation/WP09/tls-proof/live.log): six actual PostgreSQL 18.6 trusted-CA, wrong-CA and wrong-host cases pass over runtime and migration configuration; baseline raw-parser downgrade/CA loss is reproduced. [PostgreSQL HTTP cycle](evidence/database-review-remediation/WP09/postgres-probe-proof/cycle.log): unavailable startup, external migration, readiness recovery, later real connection outage/idle error, recovery and exact retained objective pass with unchanged PID and 5/10/30-second bounds. The first harness observation race is preserved and corrected without product changes. This HTTP proof does **not** assert zero DDL by the readiness-triggered startup path; see MR-1.

### Issue matrix and frozen scope

No GitHub issue-referenced issue matrix applies to this mission. The canonical mission contract inventories six historical in-scope findings plus the one explicit operator deferral; all seven are represented in the [closure disposition table](database-review-findings-remediation.md). Disposition completeness is present; closure correctness has the gaps below.

Independent command `git diff --name-only 0572599edc3e79dded5893aaaaef6867394a5288..HEAD -- .github/workflows okr-app/drizzle okr-app/drizzle-postgres okr-app/package-lock.json okr-app/docs/reviews/sqlite-postgresql-support-2026-10-26.md` exited 0 with no paths. Workflows, historical migrations, lockfile and historical review are unchanged. This review neither publishes/deploys nor modifies repository settings.

## FR coverage matrix

| Requirement | Owners | Implementation and executed test evidence | Adequacy |
|---|---|---|---|
| FR-001: effective TLS | WP01, WP09 | `config.ts` canonical builder is called by runtime pool and migration client; config/TLS suites and six actual endpoint cases | Adequate |
| FR-002: schema/journal integrity | WP02, WP09 | shared SQLite inspector/classifier; real tamper and supported-layout tests; original wrong-index failure and fixed pass | **FAIL / partial coverage: MR-2/MR-3 reproduced** |
| FR-003: no-DDL runtime | WP03, WP04, WP10, WP06 | explicit CLI/accessor verify path and live restricted-role tests correctly reject without DDL; worker packaging works | **FAIL / partial coverage: MR-1 reproduced** |
| FR-004: operational/image proof | WP05, WP08, WP11, WP09 | migrated operations fixtures, fail-closed matching-tool preflight, native restore and both-backend production image positives/faults | Adequate |
| FR-005: application paths | WP06, WP07, WP11, WP09 | built-server cookie login/admin/two-account denials and stored-state assertions; actual scheduler/QuickJS/saved-query/friend/AI paths on both backends; controlled guard/filter/bridge faults | Adequate for contracted scenarios |
| FR-006: recoverable probes | WP04, WP10, WP05, WP06, WP09 | bounded live checks, SQLite worker isolation under real locks at 0/5000/30000ms, same-PID HTTP recovery and actual idle-error proof | Adequate availability proof; MR-1 changes which startup work runs |
| FR-007: operator CI/CD deferral | WP09 | frozen workflow diff; RISK-2 explicitly unresolved/operator-deferred | Adequate disposition; not a fix |
| FR-008: durable closure | All, reconciled by WP09 | durable commands/exits/revisions/checksums, fault proof and operating instructions | Partial: six-closure claim overstates FR-002/003 coverage |

The application tests cross real HTTP/session and persistence boundaries rather than asserting literal success fixtures. The restricted-role tests constrain the actual verification function but do not constrain every caller selecting that function. The schema tests constrain their individual alterations but omit the accepted incompatible shapes below.

## Drift findings

### MR-1 — Readiness-triggered initialization ignores `MIGRATION_MODE`

Type: locked-decision violation and cross-WP integration. Severity: **HIGH**, release-blocking. References: FR-003, FR-008, plan D-03 and the migration-mode runtime contract; affected ownership WP03/WP04/WP10.

`src/hooks.server.ts` sends `/api/ready` to `ensureOpenAttempted()`. In `src/lib/db/lifecycle.ts:179`, that function calls `openDatabase(cfg)` without mode options. `src/lib/db/adapters/sqlite-worker-client.ts:145` chooses `options.mode ?? 'migrate'` and explicitly sends that value to the preparation worker. The worker calls `migrateDatabase(config, {mode: msg.mode})`. Only the ordinary server accessor in `src/lib/server/database.ts` parses `process.env.MIGRATION_MODE`.

Consequently, a readiness request arriving first selects privileged migration even when the operator configured verify; invalid mode values can bypass validation on this path too. If a later ordinary request passes verify, `openDatabase` can return the service already opened by readiness before using those options. This violates the absolute zero-DDL/no-file-creation runtime contract. With a restricted PostgreSQL role it can instead fail startup by attempting privileged operations that the read-only path would never execute.

Existing runtime-mode unit tests call the parser/migration function directly. The supplemental HTTP proof begins with an absent PostgreSQL database, creates it and immediately migrates externally before its recovery poll, so it cannot distinguish application migration from verification. It also does not collect statements attempted by that built HTTP process.

Focused execution evidence: [verify-mode.sh](evidence/database-review-remediation/mission-review/verify-mode.sh) and [actual output](evidence/database-review-remediation/mission-review/verify-mode.log), run 2026-11-10T04:23:03Z–04:23:07Z against the unchanged final image. Health-first startup leaves the fresh file absent; the first readiness response is 503, the second is 200, and catalog inspection shows 26 created tables (25 application tables plus journal), with `unexpected_mutation:true`. This is observed mutation, not an inferred mode mismatch. Required correction boundary: one canonical runtime mode selection for **all** initialization callers; real `/api/ready`-first verify/no-DDL/noncreating and invalid-mode regressions, including restricted-role startup. This reviewer made no fix.

### MR-2 — SQLite recognizes additional incompatible constraints as ready

Type: missing FR coverage. Severity: **HIGH**, release-blocking. References: FR-002, plan D-02, WP02 T006/T009.

`src/lib/db/migrations/sqlite-inspect.ts:201` reads only indexes whose `sqlite_master.sql IS NOT NULL`, omitting SQLite-generated indexes for inline UNIQUE constraints. Column descriptors do not represent those constraints. In `fingerprint.ts`, foreign keys are checked by ensuring each expected edge exists; extra edges are not rejected. Thus an otherwise identical table with a new `UNIQUE(value)` or additional foreign key can retain a matching fingerprint even though normal writes become invalid. WP02 T009 explicitly requires supported CHECK/UNIQUE constraint cases; the final suite tests CHECK and a named unique index but lacks these shapes.

Focused real migrate/verify and ordinary-write proof: [schema-boundaries.ts](evidence/database-review-remediation/mission-review/schema-boundaries.ts) and [executed output](evidence/database-review-remediation/mission-review/schema-boundaries.log), Node 22.23.4, 2026-11-10T04:21:53Z, harness exit 0. Both `UNIQUE(value)` and `FOREIGN KEY(value) REFERENCES users(id)` alterations are classified ready by **both** migrate and verify. Subsequent valid configuration inserts fail with actual UNIQUE/FOREIGN KEY constraint errors. Harness exit 0 means reproduction completed, not that the application contract passed. A fix must compare complete constraint semantics or reject unsupported additions without mutating the incompatible database, with independent positive and negative assertions.

### MR-3 — Journal-only corrupt storage bypasses journal validation as fresh

Type: locked recognition-contract gap. Severity: **HIGH**, release-blocking. References: FR-002, plan semantic recognition paragraph requiring an otherwise empty database with corrupt journal objects to be rejected rather than fresh.

`src/lib/db/migrations/fingerprint.ts` returns `{kind:'fresh'}` as soon as there are no application tables, before `validateJournal` runs. `sqlite-migrator.ts` then uses `CREATE TABLE IF NOT EXISTS` for the existing journal, preserves existing rows and skips migration SQL for any recorded timestamp. It reports the entire migration count as applied without inspecting the resulting shape again.

A journal-only database with an unknown row is therefore eligible for schema creation instead of unchanged rejection. Matching timestamps can also suppress CREATE statements even though their tables are absent. Existing journal-corruption tests start from a complete application schema and miss the early fresh branch.

Focused proof: [same real SQLite execution](evidence/database-review-remediation/mission-review/schema-boundaries.log). Before migration, only the journal exists and contains an unknown/corrupt row at timestamp 123. Migration returns `classification:"fresh"`, creates 25 application tables, appends all seven checked rows and preserves the original invalid row. This directly violates unchanged rejection. The separate known-timestamp suppression path is source analysis, not an independently executed claim. Validate journal structure/history before accepting fresh storage; test unknown/duplicate/hash-mismatched and misleading known timestamps with no application tables, including no-mutation assertions.

## NFR and success-criterion assessment

NFR-002 has direct timed HTTP/lock/recovery proof; NFR-003 has zero-failure/zero-skip final required runs and ten-run stability. Single file-worker execution preserves explicit concurrency within cases. No-init budgets now derive from ten independent child runs, each bounded at five seconds; composed HTTP cases retain individual request and phase bounds. Those documented adjustments do not hide retries or remove assertions.

NFR-004 has version/revision/UTC/exit artifacts and redacted proof; no private CA keys, session secrets or passwords were introduced by this review. Functional SQLite tests use real files/locks/WAL/backup/reopen on guarded private tmpfs after documented FUSE failures. This proves functional behavior, not disk-latency or power-loss durability; the production image proof uses disk-backed volumes.

`npm run check` remains exit 1: reproducible baseline/current comparison finds the same 18 errors and 4 warnings, zero added/resolved diagnostic identities. That disclosed pre-existing UI debt is not claimed as a passing typecheck or a waiver for database defects.

SC-002/003/004/005 have the recorded positive evidence above, including completed actual-target postmerge build/full execution for SC-002. SC-001/006 and NFR-001 cannot be signed off while FR-002/003 gaps remain. SC-007 has no recorded image-download failure in final verification; cached images use `--pull=never`.

## Silent failure and security notes

| Location/path | Failure treatment | Assessment |
|---|---|---|
| Lifecycle partial close and worker termination cleanup | Secondary cleanup error suppressed after the original failure | Original initialization error remains rejected; cleanup is best effort |
| Live availability errors/timeouts | `false` / HTTP 503 | Intentional public readiness contract; no cached-success claim |
| PostgreSQL idle pool error | Handler logs error; subsequent live checks establish availability | Actual idle-error/recovery execution present |
| Readiness startup mode selection | Missing option silently selects migrate | MR-1 is an unsafe success/default path and violates least-privilege startup |
| SQLite unsupported schema constraints/journal-only state | Classified ready/fresh | MR-2/MR-3 permit incompatible storage to be served or mutated |

TLS verification/CA enforcement has real negative boundary proof and no fallback. Exact probe routes bypass authentication only for the contracted probes; no new public fault/reset API is added. MR-1 is at least HIGH because ordinary unauthenticated probe traffic can select DDL despite explicit operator policy. RISK-2 remains an accepted **unresolved operator-owned CI/CD review**, not fixed or waived. No other new security finding is asserted without concrete evidence.

## Final Verdict

**FAIL.** MR-1, MR-2 and MR-3 are reproduced HIGH findings that block release sign-off. FR-002 and FR-003 remain incomplete; the six-in-scope closure claim in FR-008/SC-001/SC-006 is therefore not substantiated. Passing full/backend/application/image/TLS/recovery checks remain valid evidence for the paths they actually constrain and do not resolve these counterexamples. No waiver or severity-based exclusion applies.

The implementer must repair canonical runtime mode selection and complete SQLite constraint/journal recognition, add regressions that fail for these exact counterexamples, reconcile closure documentation, rerun affected checks and obtain independent corrective review. The orchestrator opened corrective Op `01M71V7074RWQY0HAMEF8AQ4WX` separately; this initial audit does not claim that Op has fixed anything. RISK-2 remains separately unresolved and operator-deferred. Existing UI diagnostic debt and tmpfs functional-proof limits remain disclosed non-blocking notes within the approved scope. No production source or committed test was edited by this reviewer.

## Retrospective Reminder

The runtime terminus authored `kitty-specs/database-review-findings-remediation-01M5TGCE/retrospective.yaml` and recorded `RetrospectiveCaptured`; I verified the record exists. Its six force/rework entries are useful history, but the newly identified mode-selection and schema-boundary gaps should also be surfaced. Canonical sequence: mission review → author/verify retrospective → surface findings. Use `spec-kitty retrospect summary` and `spec-kitty agent retrospect synthesize --mission database-review-findings-remediation-01M5TGCE` to inspect captured findings/proposals; synthesis is dry-run by default. No proposal was applied by this review.
