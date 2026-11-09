# WP08 execution evidence

Audience: the independent reviewer and the WP09 evidence curator.

## Provenance

Application source: `0c6119f9f5b4a06aa386fe906b05034121054545` (approved
dependency integration). Host-side smoke-script changes are recorded in `source.patch`, with deleted
historical test-password literals redacted. The actual unredacted dirty diff
SHA-256 is `71b216f980e9c831279603254c3319311f72fe55bb853e0fcd0bb2f7482d551e`;
the redacted review artifact checksum is recorded separately in `SHA256SUMS`.
Use the committed WP08 source for replay; the redacted patch is for review.
No application source, Dockerfile, dependency lockfile, migration or workflow was
changed by WP08. Tests and logs are excluded by `.dockerignore`; the final image
runs the application code from that revision. The host scripts/evidence were
being authored during the image build; they are not runtime application code.

The original `lib.sh` and PostgreSQL script are extracted into a temporary
isolated directory by `run-live.sh` from the application revision above. Their
git blob IDs are respectively `3f102a058fc25e957070fda1a7f46b247f499cd3` and
`630fd82a89439f04c6af34262545df2f0ab2d3e3`, identical to the inspected historical
revision `0572599edc3e79dded5893aaaaef6867394a5288`. Original scripts are not
copied into durable evidence because their historical fixed test password must
not be stored as an execution credential in this evidence directory.

## Build

Command (workdir `okr-app/`):

```bash
podman build --format docker --pull=never -t localhost/ruok:wp08 .
```

See `build-start.txt`, `build-result.txt`, and `build.log` for UTC timestamps,
exit status and output. Final local image ID:
`51c54a4ee944c18485d06576c008b00cbb7e82b85bf3c1ca6465085b3971c7a9`.
This is a local configuration/image ID, not a registry digest; nothing was
published. Docker format preserves the declared production HEALTHCHECK.

An earlier OCI-format build succeeded but Podman warned it omitted HEALTHCHECK;
it is not the final verification image. `pre-reboot-overlay-failure.log` records
an earlier **environment prerequisite failure**, not an application regression:
the running old kernel lacked matching overlay modules after a kernel update.
The operator rebooted; running and installed kernel then matched
`7.2.14-arch1-1`, and the ordinary production build succeeded.

The build uses committed package-lock SHA-256
`66f8ca8e9383a41e1f318082d9b5b3d7eadfaa623fc72d0a51ce723f2ee17eae`.
The existing lockfile audit reports 19 dependency vulnerabilities (5 low,
4 moderate, 10 high). No dependency versions or lockfiles were changed.

## Required live scenarios

Replay against disposable resources only, with a privately exported live
`DATABASE_URL` reachable from inside the application container:

```bash
bash docs/reviews/evidence/database-review-remediation/WP08/run-live.sh
```

The runner pins the immutable local image ID once, then runs SQLite and
PostgreSQL positives and actual lost-write/never-ready controls. It records
per-case UTC start/end, exit code and expected result in `live-results.txt`;
scenario output is saved in separate logs. A negative must contain both the
fault-injection marker and the intended assertion failure, not merely exit
nonzero due to fixture setup.

`engine-fault.sh` runs the actual container commands and injects only after
successful restart: lost-write deletes objective rows through the real selected
database driver; never-ready stops the application container. No fault code is
installed into application source or image. The original PostgreSQL script is
expected to exit **zero despite lost persistence**, reproducing the defect;
fixed scripts must reject it. Both successful backend runs must preserve exact
original objective ID/title with the same account, without recreating records.

The final runner completed with exit 0 on 2026-11-09. `live-results.txt` and
seven scenario logs record both positives, the original false-PASS reproduction,
and four intended negative failures. Earlier aborted approval requests did not
execute the runner and are not verification evidence.

Use a fresh disposable PostgreSQL database for a full replay: the unmodified
historical baseline uses a fixed account name. After the recorded run, the
replay harness gained an explicit nonempty UUID-created guard so a future
registration conflict cannot count as valid baseline proof. This additional
guard was checked directly against the recorded baseline transcript; production
scripts were unchanged and no green live scenario was rerun.

## Supplemental contracts and validation

`helper-contract.cjs` uses a local HTTP fixture to test bad status, malformed
JSON, empty ID, absent objective, substring-only ID, changed title, exact match,
transport timeout and readiness deadline. These helper-level checks supplement,
and do not replace, the required real image/backend scenarios. Execute:

```bash
node docs/reviews/evidence/database-review-remediation/WP08/helper-contract.cjs
env -u DATABASE_URL bash tests/container/smoke-postgres.sh
bash -n tests/container/lib.sh tests/container/smoke-sqlite.sh tests/container/smoke-postgres.sh tests/container/smoke-host-sqlite.sh
git diff --check
```

Missing URL must exit nonzero before touching a container. `helper-contract.log`
and `missing-url.log` record these checks. Host Node is `v26.13.0` / npm
`12.2.2`; production image Node is `v22.23.4`, better-sqlite3 `12.5.0`, pg `8.23.1`
(`runtime-versions.json`). `image-healthcheck.json` confirms the retained
readiness healthcheck and its timing/retries. Podman is
`6.1.4`; disposable PostgreSQL is `18.6` (Debian build). No shell linter is
configured by this project and ShellCheck is absent; the diff-scoped Bash parser
check above is the applicable available shell validation.

No deployment/publication/CI or repository settings were changed. RISK-2 remains
unresolved and operator-deferred. A required image-download failure stops all
mission work; no such failure has occurred during these runs.
