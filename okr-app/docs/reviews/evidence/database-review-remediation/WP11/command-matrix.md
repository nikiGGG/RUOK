# WP11 — Runnable command handoff matrix (T052)

Mission: `database-review-findings-remediation-01M5TGCE` — WP11
Consumed by: WP08 (manual images), WP09 (operating docs). Boundary command matrix.
Workdir: `okr-app/` (node + vitest 5.0.3).

## Full / SQLite commands (no live PG required)

| Command | Purpose | Prerequisites |
|---|---|---|
| `npm test` | Full SQLite suite (db, upgrade, recovery:native, domains, backup, application:sqlite + integrations.sqlite) | none |
| `npm run test:application:sqlite` | HTTP/auth/probe (sqlite.test.ts) + integrations (integrations.sqlite.test.ts) against built server | `npm run build` (auto) |
| `npm run test:db:sqlite` | SQLite DB contract/parity/domains/backup/recovery | none |
| `npm run test:recovery:sqlite` | SQLite native recovery | none |
| `npm run build` | Vite/adapter-node build + worker artifacts | none |

## PostgreSQL commands (live PG18 + preflight required)

| Command | Purpose | Prerequisites (fail-closed `preflight:postgres`) |
|---|---|---|
| `npm run preflight:postgres` | Checks `RUOK_TEST_PG_ADMIN_URL`, `pg_dump`/`pg_restore`/`psql` on PATH with major >= server, reachable PG>=18. Exits 1 credential-free on any miss. | host pg client matching server major; `RUOK_TEST_PG_ADMIN_URL` |
| `npm run test:application:postgres` | HTTP/auth/probe (postgres.test.ts) + integrations (integrations.postgres.test.ts) | `preflight:postgres` OK + `RUOK_TEST_PG_ADMIN_URL` |
| `npm run test:db:postgres` | Postgres DB contract/operations/parity/domains/backup/recovery | `preflight:postgres` OK + `RUOK_TEST_PG_ADMIN_URL` |
| `npm run test:recovery:postgres` | Native pg_dump/pg_restore recovery rehearsal (reuses running container pg18 fallback) | `preflight:postgres` OK + `RUOK_TEST_PG_ADMIN_URL` |

## Verification suite

| Command | Purpose |
|---|---|
| `npx vitest run tests/verification/command-coverage.test.ts` | Static entrypoint inventory + command wiring + missing-file/no-tests failure + controlled missing-prerequisite subprocess (10 tests) |

## Prerequisite behavior (documented)

- `preflight:postgres` fails nonzero and credential-free when `RUOK_TEST_PG_ADMIN_URL`
  is unset, when host `pg_dump`/`pg_restore` major < server major, or when the server
  is unreachable / < PG18. It never substitutes SQLite.
- Live postgres suites require `RUOK_TEST_PG_ADMIN_URL` (DBA/owner, CREATEDB) and a
  reachable PG18. On a host whose pg toolchain does not match the server major, the
  recovery suite reuses the matching pg18 binaries inside the already-running
  `traggo-test-pg` container (C-007-safe); the application/backend suites connect via
  `node pg` and need the preflight to pass first.
- Zero-test runs are failures (`passWithNoTests=false`); a missing referenced entry
  file is a hard failure.

## Known boundary note

On the current dev host (Homebrew pg14, live server PG18, matching pg18 only inside
the Linux container), the full npm postgres commands stop at the fail-closed
`preflight:postgres` step. The underlying postgres suites pass when invoked directly
with the admin URL (application 25/25, recovery 1/1). WP08/WP09 should provision a
host pg18 client (or run where host tools match the server) to execute the full npm
postgres commands positively.