# WP08 — Strict manual production-image verification

Audience: independent WP08 reviewer and WP09 evidence curator.
Mission: `database-review-findings-remediation-01M5TGCE`.
Requirements: FR-004, FR-008, NFR-001, NFR-002, NFR-004 (DRIFT-4 image portion).
Execution: Codex / node-norris and Podman, explicitly authorized by the operator.
Application source: `0c6119f9f5b4a06aa386fe906b05034121054545`.
Host script diff SHA-256: `71b216f980e9c831279603254c3319311f72fe55bb853e0fcd0bb2f7482d551e`
(actual dirty diff for the executed smoke checks; `source.patch` is a review
copy with deleted historical test-password literals redacted).
Lockfile SHA-256: `66f8ca8e9383a41e1f318082d9b5b3d7eadfaa623fc72d0a51ce723f2ee17eae`.

Final local production image:
`51c54a4ee944c18485d06576c008b00cbb7e82b85bf3c1ca6465085b3971c7a9`.
This is an immutable **local image ID**, not a registry digest; nothing was
published. Both backend positives and all fault controls use that same image.
Image build: `podman build --format docker --pull=never -t localhost/ruok:wp08 .`,
workdir `okr-app/`, exit 0. UTC timing is in `build-start.txt` and
`build-result.txt`; full final build output is `build.log`.
Docker format preserves the Dockerfile HEALTHCHECK instead of Podman's OCI
format warning/omission. Application source and Dockerfile were not modified.

Environment: Linux x86_64, kernel `7.2.14-arch1-1`; Podman `6.1.4`;
host Node `v26.13.0`, npm `12.2.2`; production Node `v22.23.4`, better-sqlite3 `12.5.0`, pg `8.23.1`
(`runtime-versions.json`);
live disposable PostgreSQL `18.6` (Debian build). PostgreSQL credentials and
session material were kept outside evidence. No dependency versions changed;
existing lockfile audit findings are described in `README.md`.

## Executed command and scenario results

The operator-provided disposable PostgreSQL URL was exported privately, never
printed. Effective public settings: `RUOK_SMOKE_SKIP_BUILD=1`, immutable
`RUOK_SMOKE_IMAGE` above, `RUOK_CONTAINER_ENGINE=/usr/bin/podman`; readiness limit
15 seconds for positives/lost-write and 5 seconds for never-ready controls.

```bash
# Workdir: okr-app/. DATABASE_URL=<private disposable PostgreSQL URL> exported.
bash docs/reviews/evidence/database-review-remediation/WP08/run-live.sh
```

The runner executes the exact shell entrypoints below, after supplemental
helper contracts. It uses `engine-fault.sh` only for controlled faults; actual
storage, auth, HTTP handlers, migration CLI, restart and persistence are live.
`live-results.txt` is the per-case UTC/exit record; each row has a matching log.

| Case / actual entrypoint | UTC start → end (2026-11-09) | Exit | Observed result |
|---|---|---:|---|
| SQLite positive / `bash tests/container/smoke-sqlite.sh` | 04:15:42 → 04:16:05 | 0 | Exact original ID/title before and after restart, same account; real data volume/file; production migration CLI |
| PostgreSQL positive / `bash tests/container/smoke-postgres.sh` | 04:16:05 → 04:16:16 | 0 | Exact original ID/title before and after restart, same account; live PostgreSQL; no SQLite file/volume; production migration CLI |
| Original PostgreSQL script / isolated original source + lost-write | 04:16:16 → 04:16:33 | 0 | **Reproduced defect**: real objective created, rows deleted after restart, persistence unconfirmed, yet script reports PASS |
| Fixed SQLite script + lost-write | 04:16:33 → 04:16:59 | 1 | Real initial write/read then injected deletion; readiness recovers; exact original objective assertion fails |
| Fixed PostgreSQL script + lost-write | 04:16:59 → 04:17:08 | 1 | Real initial write/read then injected deletion; readiness recovers; exact original objective assertion fails |
| Fixed SQLite script + never-ready | 04:17:08 → 04:17:26 | 1 | Real initial write/read then stopped application after restart; readiness deadline fails |
| Fixed PostgreSQL script + never-ready | 04:17:26 → 04:17:41 | 1 | Real initial write/read then stopped application after restart; readiness deadline fails |

Positive preserved values:

- SQLite: ID `6f3a8d8a-a42e-45ef-89f6-8238862a5f40`,
  title `WP08 persistence smoke_1ee8c3c19b6a5173`.
- PostgreSQL: ID `a6909847-4334-455d-b75d-1380fd01f7a5`,
  title `WP08 persistence smoke_383b15fac3ba8ba0`.
  Neither record was recreated after restart.

The final runner exited 0; all seven actual per-case outcomes matched their
expected results. `image-healthcheck.json` confirms the production readiness
healthcheck was retained.

Every negative log contains both a controlled-fault marker and its intended
failure, after a successful initial exact read. A setup failure cannot satisfy
these recorded negatives. The original script blob IDs and replay mechanism
are documented in `README.md`; the blobs are identical to the historical review
baseline. The application image is unchanged during fault injection.

## Supplemental contracts / syntax validation

`validation.log`: helper start `2026-11-09T04:15:38Z`, end
`2026-11-09T04:15:42Z`, exit 0; missing-URL check exit 1 as required; scoped
Bash parser check and `git diff --check` exit 0.

```bash
node docs/reviews/evidence/database-review-remediation/WP08/helper-contract.cjs
env -u DATABASE_URL bash tests/container/smoke-postgres.sh
bash -n tests/container/lib.sh tests/container/smoke-sqlite.sh tests/container/smoke-postgres.sh tests/container/smoke-host-sqlite.sh
git diff --check
```

Nine helper contracts passed: HTTP status, malformed JSON, empty ID, missing
objective, substring ID, changed title, exact-match success, one-second transport
timeout and bounded readiness deadline. These local HTTP fixtures supplement
rather than replace the real image/backend cases. No project shell linter is
configured and ShellCheck is absent; available diff-scoped Bash syntax validation
passed. The host-runtime script uses these same helpers; host-only proof is
explicitly supplemental and is not substituted for either image/backend run.

After the live run, only the evidence replay runner gained an additional
baseline UUID-created guard (verified against the recorded transcript); fresh
disposable PostgreSQL is required for replay of the historical fixed account.
Production smoke scripts remained unchanged. See `replay-guard-check.log`.

## Subtask and boundary mapping

- T035: original-script false-PASS reproduction; strict HTTP/JSON/ID/timeout
  helper contracts; lost-write and readiness sensitivity logs.
- T036: both production-image positives; exact preserved ID/title, original
  account re-login, same immutable image, PostgreSQL no-SQLite checks.
- T037: manual production build and all live positive/negative scenarios.
- T038: updated container README plus replay commands, this manifest and
  checksum-indexed durable artifacts.

The pre-reboot overlay log is an environment prerequisite failure, not an
application regression. Kernel restart resolved that problem. The earlier
OCI-format build is not the final verification image. No required image
registry/download failure occurred; the mission stop rule was preserved.

Only WP08-owned shell scripts/docs/evidence changed. No workflow, CI/CD,
publication, deployment, repository setting, dependency or migration changed.
RISK-2 remains unresolved and operator-deferred. Full integrated command/UI/
stability evidence reconciliation remains WP09's responsibility; this package
claims the manual image boundary and its bounded helpers, not mission acceptance.
Independent review and runtime state transitions are recorded by Spec Kitty,
not by editing this evidence manifest.
