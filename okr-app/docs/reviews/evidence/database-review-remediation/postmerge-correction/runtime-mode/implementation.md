# MR-1 runtime mode correction

Corrective Op: `01M71V7074RWQY0HAMEF8AQ4WX`; profile: Node Norris.

Requirement: FR-003 requires application startup to honor migration mode and
verification to perform zero DDL, including empty storage. NFR-002 requires
bounded probes and recovery without restart. NFR-004 requires executed,
revision-bound evidence. The original mission-review `verify-mode.log` records
the violating readiness-first behavior: absent file, 503, then 200 and 26 tables
created with `MIGRATION_MODE=verify`.

The missed caller is `src/hooks.server.ts` → `ensureOpenAttempted()` →
`openDatabase(cfg)` → preparation worker's default migrate mode. The ordinary
server accessor already uses the pure shared `parseMigrationMode` parser.

Test-first reproduction: `tests/db/readiness-mode.test.ts` drives the existing
`ensureOpenAttempted` and `getReadiness` APIs against real SQLite files and
workers. It covers noncreation of absent parent/file across cooldown and retry,
unchanged existing empty storage, recovery after external migration, omitted
mode preserving migration, and invalid mode rejecting before creation.
The parent-executed [red run](red.log) collected all five cases and reproduced
four failures: `ready:true` where refusal was required. Default migration passed.
This was the actual defect, rather than a missing API or collection failure.

The fix imports the existing side-effect-free parser directly into lifecycle,
resolves `process.env.MIGRATION_MODE` before configuration/opening, and passes
the resulting `{ mode }` to `openDatabase`. Both readiness-triggered startup
and the ordinary server accessor now select preparation mode through the same
parser. The opening, worker, cooldown, cleanup and readiness implementations are
otherwise unchanged. Invalid modes fail before opening or filesystem I/O.

Post-fix SHA-256 of `src/lib/db/lifecycle.ts`:
`28a832605751202070a5eeee3baf3a20419bb83d6c13b511cacd88a1a30bc34a`.
The parent-executed [green run](green.log) passes all five unchanged tests.

## Built HTTP proof

Run the reviewable [built-proof.sh](built-proof.sh) with the corrected local
production image and an output directory that does not exist yet:

```sh
IMAGE=<corrected-local-image-id> bash okr-app/docs/reviews/evidence/database-review-remediation/postmerge-correction/runtime-mode/built-proof.sh <new-output-directory>
```

The script uses `--pull=never`, unique containers and a new disk bind directory
(rejecting tmpfs/ramfs). It refuses existing output directories. Container and
temporary storage cleanup runs on exit/interruption, while evidence is retained.
The image healthcheck is recorded and disabled for these harness containers so
the script controls the first readiness request. The production healthcheck
configuration itself is unchanged.

Assertions cover six fresh verify refusals over retry cooldowns with absent
database/parent and healthy liveness; external migration by a separate process
from the same image; recovery under 30 seconds with unchanged server PID/start
time and unchanged catalog/journal; repeated invalid-mode 503 responses without
creation; and unset-mode migration reaching 200. Each request is bounded at five
seconds, and the first unavailability detection is bounded at ten seconds.
Commands, image ID, source hashes, UTC times, response bodies, durations and
server logs are retained without credentials. `bash -n` passes.

The parent-executed [built-final run](built-final/run.log) passes against local
image `cc1cffc284fbb78bd0338d36883ca82ff3e38f33f560291e63525cc889b0a1aa`,
source HEAD `c6f9f30f7eabf77c3ce33796e70a8e81773647e6`. Actual storage is btrfs.
Fresh verify remains 503 without file/parent creation across all six samples;
the first unready result takes 37 ms. Recovery after external migration takes
1,102 ms with the same server PID/start time and unchanged catalog/journal.
Invalid mode remains 503 and noncreating; unset mode reaches 200 in 1,130 ms.
Liveness succeeds throughout. This image ID is local, not a registry digest.

## Final-image never-ready control setup correction

The separate final-image runner sets a single `RUOK_SMOKE_READY_TIMEOUT=5` for
both setup and post-restart waits in the never-ready scenarios. Its final SQLite
attempt timed out before initial readiness, before objective creation, and
before the fault engine emitted any `CONTROL` marker. Its exit 1 therefore does
not establish fault sensitivity. That attempt remains preserved, and the
runner correctly rejected its missing control marker.

The reviewable [never-ready-controls.sh](never-ready-controls.sh) separates the
phases without changing product source, the real smoke library, or the fault
engine. It sources the existing smoke helpers, uses the normal runner's
15-second initial readiness bound, creates and reads an exact objective, then
calls the unchanged restart/stop injector and checks the actual stopped state.
Only after that does it set the same shell's `READY_TIMEOUT=5` for the second
wait. The outer runner requires exit 1 plus every setup/injection/deadline
marker, so an initial readiness or other setup failure cannot count as the
expected control failure. Both backends run under this same phase contract.

The parent approved this explicit phase separation before execution. Syntax
validation passes; execution is pending a serialized parent-run Podman command
with the same corrected image. Existing failed artifacts are not overwritten.

Pre-fix SHA-256 of `src/lib/db/lifecycle.ts`:
`1e298622900729feea7a71368c0dde63aa3b27f54c347694e21194a3d491b661`.

Command (application working directory):
`node_modules/.bin/vitest run tests/db/readiness-mode.test.ts --maxWorkers=1 --retry=0`.
The existing npm commands use explicit file lists, so this test requires an
explicit supplemental gate; package commands and CI/CD are outside this change.

Governance context, canonical profile, DIRECTIVE_025, DIRECTIVE_051,
dependency-hygiene and supply-chain-install-safety were read before edits.
No dependency, package, lockfile, historical SQL or CI/CD changes are needed.
No dependency installation or upgrade is performed by this implementer.


## Final parent execution (2026-11-10)

Parent execution completed: `built-final/run.log` PASS; `controls-final/run.log` PASS for both phase-specific faults. All six verify probes remained503 with absent storage; external migration recovered in1102ms on the same process. This supersedes preparation-time pending statements above.
