# Replaying the final verification environment

Use an **isolated checkout of the final reviewed source with Git metadata**.
These commands overwrite that copy's execution logs. Preserve the committed
historical evidence elsewhere and do not replay into the active reviewed lane.
Use only disposable PostgreSQL storage, provide `DATABASE_URL` and the DBA/CREATEDB
`RUOK_TEST_PG_ADMIN_URL` privately and
never print it. The URL must be reachable from an application container.

Prerequisites: Podman, host Bash/Node/curl/Git, the reviewed Node22 runtime image
cached locally (`localhost/ruok:wp08`), cached
production Dockerfile base image and a disposable live PostgreSQL18+ server.
A required image acquisition failure stops all mission work for operator help;
do not substitute a registry/image or silently skip proof.

From the isolated `okr-app/` directory:

```bash
export WP09_EVIDENCE="$PWD/docs/reviews/evidence/database-review-remediation/WP09"
RUOK_WP09_REPLAY_BASELINE=$(mktemp -d /tmp/ruok-wp09-replay-baseline-XXXXXX)
git -C .. archive 0572599edc3e79dded5893aaaaef6867394a5288 okr-app |
  tar -x -C "$RUOK_WP09_REPLAY_BASELINE"
# Clear only the isolated replay copy's stage ledger so old PASS rows cannot skip execution.
: > "$WP09_EVIDENCE/stages.jsonl"
git rev-parse HEAD > "$WP09_EVIDENCE/replay-source.txt"
podman run --detach --pull=never --name ruok-wp09-verify --user 0 \
  --env DATABASE_URL --env RUOK_TEST_PG_ADMIN_URL --env NODE_ENV=test \
  --volume "$PWD/..:/workspace" --volume "$RUOK_WP09_REPLAY_BASELINE:/baseline" \
  --workdir /workspace/okr-app --entrypoint sleep localhost/ruok:wp08 infinity
```

This uses the same reviewed Node22 toolchain as the recorded execution.
Application tests execute the mounted reviewed source, not the runtime image's
embedded application. If this required runtime image is unavailable, stop and
ask the operator rather than selecting another image. The separately built
final image below is the required current-source packaging proof, not a fallback.

Run setup/build/checks inside the verifier. There are no credentials in these
command arguments:

```bash
podman exec -e WP09_EVIDENCE=/workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09 \
  ruok-wp09-verify sh -eu -c '
    R="$WP09_EVIDENCE/run-command.cjs"
    node "$R" replay-setup "apk add --no-cache bash build-base python3 postgresql18-client"
    node "$R" replay-install "npm ci --include=dev"
    node "$R" production_build_after_pg_close "NODE_ENV=production npm run build"
    node "$R" current_check_after_pg_close "npm run check" 1
    ln -s /workspace/okr-app/node_modules /baseline/okr-app/node_modules
    node "$R" baseline-check "npm run check" 1 /baseline/okr-app
    node "$R" diagnostic_comparison_after_pg_close "node docs/reviews/evidence/database-review-remediation/WP09/compare-diagnostics.cjs current_check_after_pg_close.log baseline-check.log diagnostic-comparison-after-pg-close.json"
  '
podman exec ruok-wp09-verify sh docs/reviews/evidence/database-review-remediation/WP09/diagnose-tmpfs.sh
podman exec ruok-wp09-verify sh -eu -c '
  . /workspace/okr-app/docs/reviews/evidence/database-review-remediation/WP09/tmpfs-common.sh
  unset DATABASE_URL DATABASE_PATH DB_BACKEND MIGRATION_MODE
  pending_tmpfs sqlite_after_cutoff_tmpfs "npm run test:db:sqlite -- --maxWorkers=1 --retry=0"
  pending_tmpfs postgres_after_close_tmpfs "npm run test:db:postgres -- --maxWorkers=1 --retry=0"
  pending_tmpfs application_sqlite_tmpfs "npm run test:application:sqlite -- --maxWorkers=1 --retry=0"
  pending_tmpfs application_postgres_after_close_tmpfs "npm run test:application:postgres -- --maxWorkers=1 --retry=0"
  pending_tmpfs recovery_postgres_after_close_tmpfs "npm run test:recovery:postgres -- --maxWorkers=1 --retry=0"
  pending_tmpfs stability_tmpfs "DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/concurrency.test.ts tests/db/no-init.test.ts --maxWorkers=1 --retry=0"
  pending_tmpfs remaining_contracts_after_close_tmpfs "DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --maxWorkers=1 --retry=0"
  cp tests/db/sqlite-integrity.test.ts /baseline/okr-app/tests/db/sqlite-integrity.test.ts
  pending_tmpfs baseline_sqlite_index_tmpfs "DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t \"rejects an expected-name unique index\" --maxWorkers=1 --retry=0" 1 /baseline/okr-app
  grep -q "promise resolved" "$WP09_EVIDENCE/baseline_sqlite_index_tmpfs.log"
  pending_tmpfs fixed_sqlite_index_tmpfs "DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t \"rejects an expected-name unique index\" --maxWorkers=1 --retry=0"
  pending_tmpfs full_after_pg_close_tmpfs "npm test -- --maxWorkers=1 --retry=0"
  '
```

All package tests execute with `--maxWorkers=1 --retry=0`, real backend storage
and unchanged strict deadlines/explicit in-test concurrency. Temporary SQLite
functional fixtures use the private tmpfs directory, with actual filesystem and
free-space records. This is not power-loss or production-disk-latency proof; see
`tmpfs-assessment.md`. The two selected diagnostic cases are not acceptance
coverage; the complete matrix must have zero mandatory skips.

After every source/test repair is stable, execute the final **disk-backed**
production-image proof from the host with the same private PostgreSQL URL:

```bash
bash docs/reviews/evidence/database-review-remediation/WP09/final-image/run.sh
```

That builds the final source, pins one immutable local image ID, executes both
backend persistence positives and all four intended fault negatives, and checks
that source hashes did not change during the proof. Do not edit application/test
files afterward. Supplemental TLS replay is documented in `tls-proof/README.md`.
The complete PostgreSQL HTTP cycle is replayed with
`podman exec ruok-wp09-verify sh docs/reviews/evidence/database-review-remediation/WP09/postgres-probe-proof/run.sh`
before the final image run; it must preserve one PID and the original objective
while observing the actual idle error and all 5/10/30-second bounds.
Only after successful review of the results should the operator remove the
disposable verifier, isolated baseline directory and privately supplied secrets.
Nothing in this replay publishes, deploys or changes CI/CD.
