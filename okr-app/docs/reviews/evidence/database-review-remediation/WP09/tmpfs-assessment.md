# Functional-test filesystem assessment

The original parallel SQLite package run failed twelve aggregate 5000 ms test
deadlines. A controlled single-file scheduler preserved every assertion and
deadline and improved the complete package run to 77/79 passing, but the full
backup round trip and historical upgrade still timed out. Both failed runs are
retained (`sqlite.log`, `sqlite-deterministic.log`); neither is a passing result.

The parent identified the verifier's `/tmp` as FUSE-overlayfs backed by the
host's home Btrfs filesystem (84% used). This is distinct from the host's own
tmpfs `/tmp`. Tests create many temporary SQLite databases through
`os.tmpdir()`/`mkdtemp`; the next controlled variable is temporary filesystem
placement, not test logic or deadlines.

## Why private tmpfs is valid for these functional assertions

- `tests/backup/fixtures.ts` creates real SQLite database files and closes/removes
  them during teardown. `backup.suite.ts` verifies supported-field round trips,
  other-account preservation, pre-mutation validation, transaction rollback and
  consistency under concurrent export/restore. It does not simulate power loss.
- `tests/upgrade/upgrade-preserves-data.test.ts` seeds a real legacy file, runs
  the production adoption path, reads the original rows, creates a new row and
  checks the reconciled migration journal. It does not require a block device or
  measure physical fsync latency.
- `tests/recovery/native-recovery.test.ts` closes a real migrated installation,
  calls the native online `.backup()` API, opens an independent backup file and
  checks journal/readiness and typed installation data. This remains an actual
  native file backup on tmpfs, not a JSON export or mocked storage layer.
- `tests/db/concurrency.test.ts` still starts two real CLI processes against the
  same file for ten independent attempts. The filesystem must support actual
  SQLite file locking/WAL/transactions; tmpfs does. None of these assertions is
  replaced with a `:memory:` database, fake repository or single-process stub.

The correction sets only `TMPDIR=/dev/shm/ruok-wp09-tests`, keeps
`--maxWorkers=1 --retry=0`, and changes no application source, test source,
deadline, case count or explicit in-test concurrency. The selected two-case
filesystem diagnostic is not acceptance coverage; all package entrypoints must
then execute in the complete matrix with zero mandatory skips.

## Capacity and evidence

The diagnostic measured 65,536,000 bytes (62.5 MiB) total and free on the
verifier's tmpfs before and after its two selected cases. `tmpfs-snapshot.cjs` verifies the actual Linux filesystem
type and records total/available bytes, original `/tmp` type, UTC and Node version
before/after each stage. It rejects less than 16 MiB free. `df` output provides an
independent readable record. Tests use unique small per-fixture files and clean
up; any ENOSPC, incomplete cleanup or assertion failure must remain a real failed
result. This guard is not a claimed measurement of peak intermediate usage.

The new logs/stages use distinct `_tmpfs` names and preserve earlier failures.
The matrix stops at its first unexpected result; it does not retry a failure into
green. A filesystem change is accepted only if the controlled diagnostic and
complete required matrix pass without weakening their oracles.

The controlled diagnostic completed 2026-11-09T11:13:34.677Z–11:13:42.010Z
with exit 0. The previously failing backup round trip took 1,473 ms and historical
upgrade took 877 ms, each below its unchanged 5,000 ms deadline. Six unselected
cases are labelled skipped in this intentionally filtered diagnostic; they are
not acceptance coverage and must execute in the complete required matrix.

## Limit of this proof

Tmpfs preserves files across process close/reopen and process restarts while the
verifier lives; it does **not** preserve them across host reboot/power loss. These
runs therefore prove selected-backend functional/transaction/locking/recovery
contracts, not hardware durability or production disk latency. The final
production-image SQLite write/restart/read and failure controls still use actual
disk-backed Podman named volumes; PostgreSQL still uses the real external
disposable server. No tmpfs result substitutes for that separate production proof.
