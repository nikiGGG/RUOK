# WP11 — Activate complete required verification commands (evidence)

Mission: `database-review-findings-remediation-01M5TGCE`
WP: WP11 (FR-004, FR-005, FR-008, NFR-001, NFR-003, NFR-004; requirements D-07–D-09)
Execution agent profile: node-norris (implementer)
Date: 2026-10-29 (UTC runs below)
Environment: darwin-arm64, Node v22.20.0, npm 11.6.4, vitest 5.0.3, esbuild 0.27.2
Drivers: better-sqlite3 12.5.0, pg 8.23.1, drizzle-orm 0.45.1
Native tools (host PATH): psql 14.15 (Homebrew), pg_dump 14.15, pg_restore 14.15
Matching pg18 toolchain (C-007-safe fallback, reused by the WP05 recovery suite):
`pg_dump`/`pg_restore`/`psql` 18.6 at `/usr/lib/postgresql/18/bin/` inside the
ALREADY-RUNNING container `traggo-test-pg` (`docker-proxy.artifactory.tcsbank.ru/postgres:18`),
invoked via `docker exec`. NO image pull or substitution (C-007). The container
binaries are Linux aarch64 ELF and are therefore NOT usable as host PATH tools.
Live PostgreSQL: 18.6 at `127.0.0.1:55432` (host-published). Admin access via trust
auth (`postgres://postgres@127.0.0.1:55432/postgres`; password redacted everywhere).
Source revision (pre-commit HEAD): `791a9f748cd62bd12fef2c743ba6bf65b8e71c48` (lane-k)
Diff identity: package.json (scripts) + `tests/verification/command-coverage.test.ts` (new)
See `checksums.txt`.

## Objective (planning amendment; no application behavior / PASS is claimed)

Wire required package commands only after preflight, HTTP/auth/probe and integration
suites exist (WP05/WP06/WP07 dependency closure), without missing-file references,
skipped scenarios or ownership conflicts. Independent review evidence: both backend
application commands explicitly execute their HTTP + integration entry files; the
required PostgreSQL/recovery preflight fails for missing inputs/tools; all existing
command coverage remains intact.

## What changed (owned surfaces only)

- `okr-app/package.json` (T050):
  - `test:application:sqlite` — runs `tests/application/sqlite.test.ts`
    (WP06 HTTP/auth/probe) AND `tests/application/integrations.sqlite.test.ts`
    (WP07 integrations) with `DB_BACKEND=sqlite`.
  - `test:application:postgres` — runs `tests/application/postgres.test.ts` AND
    `tests/application/integrations.postgres.test.ts` with `DB_BACKEND=postgres`,
    gated by `npm run preflight:postgres`.
  - `preflight:postgres` — bundles `scripts/require-postgres-test.ts` (WP05) with
    esbuild into `node_modules/.cache/require-postgres-test.mjs` and invokes it
    (fail-closed, credential-free prerequisite check).
  - Preflight wired before every required PostgreSQL backend/recovery/application
    command: `test:db:postgres`, `test:recovery:postgres`, `test:application:postgres`
    now start with `npm run preflight:postgres && `.
  - `test` (full SQLite suite) extended with the two new application entry files
    (`tests/application/sqlite.test.ts`, `tests/application/integrations.sqlite.test.ts`)
    so the full command covers the HTTP/auth/probe + integration regressions.
  - WP10's `test:db:isolation` / `test:db:sqlite` / `test` additions preserved intact.
- `okr-app/tests/verification/command-coverage.test.ts` (new, T051):
  deterministic static + negative-control checks: dependency-produced entrypoint
  inventory (T049), package.json command wiring (T050), missing-file/no-tests
  failures (`passWithNoTests=false`), and the controlled missing-prerequisite
  subprocess (bundled preflight fails nonzero for a missing `RUOK_TEST_PG_ADMIN_URL`
  without credential output). 10 tests.

No `.github/workflows/`, CI/CD, deployment, publication, dependency/lockfile, or
repository setting changed. No WP05/WP06/WP07-owned file was edited.

## Dependency-produced entrypoint inventory (T049)

| Entry point | Producer | Present |
|---|---|---|
| `scripts/require-postgres-test.ts` | WP05 (preflight CLI, executable bundled mode) | yes |
| `tests/application/sqlite.test.ts` | WP06 (auth + probes) | yes |
| `tests/application/postgres.test.ts` | WP06 (auth + probes) | yes |
| `tests/application/integrations.sqlite.test.ts` | WP07 (integrations) | yes |
| `tests/application/integrations.postgres.test.ts` | WP07 (integrations) | yes |

All five verified on disk and non-empty (static membership in `command-coverage.test.ts`).

## Executed runs (see `run-transcript.txt` for redacted outputs)

| Subtask | Command (workdir `okr-app/`) | Exit | Result |
|---|---|---|---|
| T051 | `npx vitest run tests/verification/command-coverage.test.ts` | 0 | 10/10 pass (static + negative controls) |
| T050/T052 | `npm run build` (Vite/adapter-node) | 0 | build OK, worker artifacts emitted |
| T050/T051 | `npm run test:application:sqlite` | 0 | **2 files / 27 tests pass** (sqlite HTTP+auth+probe + integrations) |
| T050/T052 | `npm test` (full SQLite suite incl. new app entries) | 0 | **21 files / 173 tests pass** |
| T051 | `npm run preflight:postgres` (no admin URL) | 1 | FAIL-CLOSED: missing `RUOK_TEST_PG_ADMIN_URL`, credential-free |
| T051 | `npm run preflight:postgres` (admin URL set) | 1 | FAIL-CLOSED: host pg_dump/pg_restore v14 != server 18 (gate preserved) |
| T051 | `npm run test:application:postgres` (admin URL set) | 1 | FAILS at preflight (host v14 != server 18) — fail-closed gate, no suite executed |
| T051/T052 | `DB_BACKEND=postgres npx vitest run tests/application/postgres.test.ts tests/application/integrations.postgres.test.ts` (admin URL set) | 0 | **2 files / 25 tests pass** (postgres HTTP+auth+probe + integrations) |
| T051/T052 | `DB_BACKEND=postgres npx vitest run tests/recovery/postgres-recovery.test.ts` (admin URL set) | 0 | **1/1 pass** (native pg18 dump/restore via running container fallback) |
| T052 | `DB_BACKEND=postgres npx vitest run <test:db:postgres list>` (admin URL set) | 1 | 10 files pass, **1 pre-existing failure** in `tests/domains/integrations/postgres.test.ts` (see finding below) |
| typecheck | `npm run prepare && npx tsc --noEmit` | 0 | 0 errors in WP11-owned files |

## Fail-closed behavior (required by review evidence)

- Missing input: preflight exits 1 with `RUOK_TEST_PG_ADMIN_URL is not set` and NO
  credential output (asserted in `command-coverage.test.ts`).
- Missing/mismatched tool: preflight exits 1 because host `pg_dump`/`pg_restore`
  major 14 does not match the live server major 18. This is exactly the required
  "preflight fails for missing inputs/tools" behavior — it never substitutes SQLite
  and never hides a missing prerequisite.
- No-tests/missing-file: a nonexistent entry or a zero-test run exits nonzero
  (`passWithNoTests=false`, no implicit skips) — asserted in `command-coverage.test.ts`.

## Positive postgres execution and the preflight gate (honest boundary)

The postgres suites themselves pass on the live PG18 when invoked with the admin URL
(application 25/25, recovery 1/1 via the running container's pg18 toolchain). The
full npm postgres commands (`test:application:postgres`, `test:db:postgres`,
`test:recovery:postgres`) now gate on the fail-closed `preflight:postgres` step,
which on THIS macOS host fails because the host Homebrew pg toolchain is v14 while
the live server is PG18; the matching pg18 client exists only inside the already-running
Linux `traggo-test-pg` container (reused by the recovery suite, not usable as a host
PATH tool because it is ELF for a different OS). Full-command postgres positive
execution therefore requires a host pg18 client (e.g. `brew install postgresql@18`)
and is recorded as PENDING on this host — it is not fabricated. The referenced
suites demonstrably run and pass when the prerequisites are provided.

## Pre-existing finding (out of WP11 scope, not introduced here)

`tests/domains/integrations/postgres.test.ts > application integrations contract
(postgres) > query execution logs are recorded, listed and aggregated` fails:
`expect(await services.queryExecutionLogs.listSince(new Date())).toHaveLength(2)`
gets 0. Root cause is a timing-sensitive strict-comparison in the non-owned
`tests/domains/integrations/integrations.suite.ts` (`listSince(new Date())`) which
excludes rows whose stored `createdAt` equals the query instant when operations
complete within the same millisecond. This file is owned by WP04/WP05 and is NOT
modified by WP11 (`git diff HEAD -- tests/domains/integrations/` is empty). WP11
did not touch it and does not claim a PASS for it. The declared SQLite validation
command (`npm test`) does not include this postgres file and passes.

## Notes / constraints honored

- No `.github/workflows/`, CI/CD, deployment, publication, or repository edits.
- No dependency install or lockfile change; no image pulled/substituted (C-007).
  The only PG container used was already running; its binaries were reused.
- No test skipped, disabled, narrowed, or retried into green.
- No credentials/credential URLs in committed evidence (admin URL redacted).
- Historical review `sqlite-postgresql-support-2026-10-26.md` unchanged.
- Handoff to WP08 (manual images) / WP09 (operating docs) documented in
  `command-matrix.md`.