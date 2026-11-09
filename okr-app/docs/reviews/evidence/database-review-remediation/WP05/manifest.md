# WP05 — Repair PostgreSQL operations and stability evidence

Mission: `database-review-findings-remediation-01M5TGCE`
WP: WP05 (FR-004, FR-006, FR-008, NFR-001, NFR-003, NFR-004; DRIFT-4, DRIFT-6, RISK-1)
Execution agent profile: node-norris (implementer)
Date: 2026-10-28 (UTC runs below)
Environment: darwin-arm64, Node v22.20.0, npm 11.6.4
Drivers: better-sqlite3 12.5.0, pg 8.23.1, drizzle-orm 0.45.1, vitest 5.0.3
Native tools (host PATH): psql 14.15 (Homebrew), pg_dump 14.15, pg_restore 14.15
Matching pg18 toolchain (C-007-safe fallback): pg_dump 18.6 + pg_restore 18.6 at
`/usr/lib/postgresql/18/bin/` inside the ALREADY-RUNNING container `traggo-test-pg`
(`docker-proxy.artifactory.tcsbank.ru/postgres:18`) — the same container that serves
the live PG18. Invoked via `docker exec`; NO image pull or substitution (C-007).
Live PostgreSQL: 18.6 at `127.0.0.1:55432` (host-published; container-internal
`127.0.0.1:5432`). Admin access via trust auth
(`postgres://postgres@127.0.0.1:55432/postgres`; password redacted in all evidence).
Source revision (pre-commit HEAD): `493cb7be4a76923dbe9b52263e466fc9a82b8ee2` (lane-e)
Dirty diff identity: captured in the WP05 commit below; see `checksums.txt`.

## What changed (owned surfaces only)

- `okr-app/scripts/require-postgres-test.ts` (new, T022) — UNCHANGED from cycle 1:
  side-effect-free `assertPostgresPrerequisites` helper + executable bundled CLI
  mode. Requires `RUOK_TEST_PG_ADMIN_URL`, reachable PG>=18, and matching
  `pg_dump`/`pg_restore` (major >= server major) plus `psql`. Fails nonzero without
  credential output; reports missing/version-mismatched prerequisites.
- `okr-app/tests/recovery/postgres-recovery.test.ts` (T023, cycle-2 fix): added a
  matching-toolchain resolver. When the host PATH tools do NOT match the live server
  major, the rehearsal falls back to the pg18 binaries already present in the running
  `traggo-test-pg` container via `docker exec` (C-007-safe), adapting the connection
  URI to the container-internal port and sharing a container-local dump path. The
  fail-closed gate is preserved: the suite aborts only when NO matching toolchain is
  available (host or container). The dump → drop/recreate → restore → typed-read →
  schema-check scenario now actually executes against live PG18.
- `okr-app/tests/db/postgres.operations.test.ts` (T021) + `okr-app/tests/db/concurrency.test.ts`
  + `okr-app/tests/db/no-init.test.ts` (T024): UNCHANGED from cycle 1 (confirmed good).

## Executed runs (see `run-transcript.txt` for redacted outputs)

| Subtask | Command (workdir `okr-app/`) | Exit | Result |
|---|---|---|---|
| T022 | `env -u RUOK_TEST_PG_ADMIN_URL node node_modules/.cache/require-postgres-test.mjs` | 1 | FAIL-CLOSED: missing admin URL (credential-free) |
| T022 | `RUOK_TEST_PG_ADMIN_URL=<redacted> node .../require-postgres-test.mjs` | 1 | FAIL-CLOSED: host pg_dump/pg_restore v14 != server 18 (gate preserved) |
| tooling | `docker ps` + `docker exec traggo-test-pg ls`/`--version` | 0 | `traggo-test-pg` running; pg_dump/pg_restore 18.6 at `/usr/lib/postgresql/18/bin/` |
| T024 | `DB_BACKEND=sqlite npx vitest run tests/db/concurrency.test.ts tests/db/no-init.test.ts` | 0 | 3/3 pass (10 runs each) |
| T021 | `RUOK_TEST_PG_ADMIN_URL=<redacted> DB_BACKEND=postgres npx vitest run tests/db/postgres.operations.test.ts` | 0 | 4/4 pass on disposable PG18 |
| T023 | `RUOK_TEST_PG_ADMIN_URL=<redacted> DB_BACKEND=postgres npx vitest run tests/recovery/postgres-recovery.test.ts` | 0 | **PASS** — native pg18 dump → drop/recreate → restore → typed-read → schema executed against live PG18 via container pg18 toolchain |
| validate | `npm test` (declared SQLite suite incl. T024 + native-recovery) | 0 | 19 files, 146 tests passed |
| typecheck | `npx tsc --noEmit` (diff-scoped) | 0 | 0 errors in WP05-owned files |

## T023 — PASS (executed for real)

The native full-installation recovery rehearsal executes end-to-end against the live
PG18 (server 18.6) using the matching pg18 toolchain (`pg_dump`/`pg_restore` 18.6)
inside the already-running `traggo-test-pg` container — invoked via `docker exec`
with the connection URI adapted to the container-internal `127.0.0.1:5432`
(host-published as `127.0.0.1:55432`). Steps performed on a disposable, migrated and
seeded database:

1. `pg_dump -Fc --no-owner --no-privileges` of the full installation → exit 0.
2. `DROP DATABASE ... WITH (FORCE)` + `CREATE DATABASE` (empty target) via admin client.
3. `pg_restore --no-owner --no-privileges -d <db>` → exit 0.
4. Re-run `migrateDatabase` → classified `ready` (aligned schema + history, 0
   migrations recorded), then typed-read verification across users, systemConfig,
   friendships, plugins, userAiConfig, objectives and tasks — all seeded rows present.

No image was pulled or substituted (C-007): the rehearsal reused the already-running
container's binaries. The fail-closed gate is intact and independently demonstrated —
the host-only preflight (`require-postgres-test.mjs`) still exits 1 on the v14-vs-18
mismatch, and the suite aborts when no matching toolchain is available.

## Checksums

Source-file SHA-256 checksums are in `checksums.txt` (same directory).

## Notes / constraints honored

- No `.github/workflows/` changes; no CI/CD, deployment, or publication edits.
- No dependency install or image substitution (C-007 respected; the only PG container
  used was already running — its binaries were reused, never an image pulled).
- RISK-2 left unresolved/operator-deferred (not claimed).
- No test was disabled, narrowed, retried into green, or made non-blocking. The
  container toolchain is a fallback that lets the intended scenario run; the
  fail-closed gate is unchanged and still aborts when no matching tool is available.
- No credentials/credential URLs in committed transcripts (admin URL redacted).
- Historical review `sqlite-postgresql-support-2026-10-26.md` unchanged.