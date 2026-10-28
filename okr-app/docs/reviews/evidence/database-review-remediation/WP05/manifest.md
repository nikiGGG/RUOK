# WP05 — Repair PostgreSQL operations and stability evidence

Mission: `database-review-findings-remediation-01M5TGCE`
WP: WP05 (FR-004, FR-006, FR-008, NFR-001, NFR-003, NFR-004; DRIFT-4, DRIFT-6, RISK-1)
Execution agent profile: node-norris (implementer)
Date: 2026-10-28 (UTC runs below)
Environment: darwin-arm64, Node v22.20.0, npm 11.6.4
Drivers: better-sqlite3 12.5.0, pg 8.23.1, drizzle-orm 0.45.1, vitest 5.0.3
Native tools: psql 14.15 (Homebrew), pg_dump 14.15, pg_restore 14.15
Live PostgreSQL: 18.6 at `127.0.0.1:55432` (already-running container
`traggo-test-pg`, image `docker-proxy.artifactory.tcsbank.ru/postgres:18` —
NO image pull or substitution; C-007 rule respected). Admin access via trust auth
(`postgres://postgres@127.0.0.1:55432/postgres`; password redacted in all evidence).
Source revision (pre-commit HEAD): `c9332429de15890b0101fb2f841f5fc1a26e3e65` (lane-e)
Dirty diff identity: captured in the WP05 commit below; see `checksums.txt`.

## What changed (owned surfaces only)

- `okr-app/scripts/require-postgres-test.ts` (new, T022): side-effect-free
  `assertPostgresPrerequisites` helper + executable bundled CLI mode. Requires
  `RUOK_TEST_PG_ADMIN_URL`, reachable PG>=18, and matching `pg_dump`/`pg_restore`
  (major >= server major) plus `psql`. Fails nonzero without credential output;
  reports missing/version-mismatched prerequisites. Verified directly (CLI),
  and used by the recovery suite. WP11 wires package commands after this helper.
- `okr-app/tests/recovery/postgres-recovery.test.ts` (T023): removed the
  `describe.skip` gating and ad-hoc `hasBinary`; now fail-closed via
  `assertPostgresPrerequisites` (no silent skip). Real `pg_dump`+`pg_restore`
  rehearsal retained (accounts/sessions/config/social/plugin/AI/objectives reads).
- `okr-app/tests/db/postgres.operations.test.ts` (T021): pool + outage cases now
  call `migrateDatabase` and assert the expected application tables exist BEFORE
  exercising bounded-pool/outage (DRIFT-4 missing-users fix). Advisory-lock
  assertion scoped to the connection's backend pid to avoid cross-test
  contamination from the now-active parallel recovery migration.
- `okr-app/tests/db/concurrency.test.ts` + `okr-app/tests/db/no-init.test.ts`
  (T024): capture child stdout/stderr, exit code AND signal; isolate output
  bundles (unique temp path per run, not a shared node_modules/.cache path); run
  TEN consecutive independent iterations with Vitest retry disabled.

## Executed runs (see `run-transcript.txt` for redacted outputs)

| Subtask | Command (workdir `okr-app/`) | Exit | Result |
|---|---|---|---|
| T022 | `env -u RUOK_TEST_PG_ADMIN_URL node node_modules/.cache/require-postgres-test.mjs` | 1 | FAIL-CLOSED: missing admin URL (credential-free) |
| T022 | `RUOK_TEST_PG_ADMIN_URL=<redacted> node .../require-postgres-test.mjs` | 1 | FAIL-CLOSED: pg_dump/pg_restore v14 != server 18 |
| T024 | `DB_BACKEND=sqlite npx vitest run tests/db/concurrency.test.ts tests/db/no-init.test.ts` | 0 | 3/3 pass (10 runs each) |
| T021 | `RUOK_TEST_PG_ADMIN_URL=<redacted> DB_BACKEND=postgres npx vitest run tests/db/postgres.operations.test.ts` | 0 | 4/4 pass on disposable PG18 |
| T023 | `RUOK_TEST_PG_ADMIN_URL=<redacted> DB_BACKEND=postgres npx vitest run tests/recovery/postgres-recovery.test.ts` | 1 | **PENDING/BLOCKED** — fail-closed: host native tools v14 cannot dump PG18; requires matching pg_dump/pg_restore >= 18. NOT fabricated, NOT skipped. |
| validate | `npm test` (declared SQLite suite incl. T024 + native-recovery) | 0 | 19 files, 146 tests passed |
| typecheck | `npx tsc --noEmit` (diff-scoped) | 0 | 0 errors in WP05-owned files |

## T023 — PENDING (recorded, not fabricated)

The native full-installation recovery rehearsal (real `pg_dump` of a migrated,
seeded disposable PG18 database, drop/recreate, `pg_restore`, typed-read
verification) could NOT execute in this environment: the only available
PostgreSQL is PG 18.6, but the host native tools are pg 14.15, and `pg_dump`
cannot dump a newer server. Providing matching tools would require a dependency
install (prohibited) or substituting the container's tools/connection topology
(prohibited). The committed test therefore fail-closes with the exact
prerequisite report — the recovery claim stays honest and cannot silently pass.
A CI/operator environment with pg 18 tools on PATH will satisfy the preflight and
run the rehearsal. This gap prevents full acceptance of T023.

## Checksums

Source-file SHA-256 checksums are in `checksums.txt` (same directory).

## Notes / constraints honored

- No `.github/workflows/` changes; no CI/CD, deployment, or publication edits.
- No dependency install or image substitution (C-007 respected; the only PG
  container used was already running).
- RISK-2 left unresolved/operator-deferred (not claimed).
- No test was disabled, narrowed, retried into green, or made non-blocking.
- No credentials/credential URLs in committed transcripts (admin URL redacted).
- Historical review `sqlite-postgresql-support-2026-10-26.md` unchanged.