# WP01 Evidence — Enforce effective PostgreSQL TLS (FR-001 / DRIFT-1)

Mission: `database-review-findings-remediation-01M5TGCE`
Work package: `WP01`
Phase: Application remediation
Requirement refs: FR-001, FR-008, NFR-001, NFR-004

## Files in this directory

| File | Purpose |
|---|---|
| `manifest.md` | This index + run ledger (command/status/revision/checksums). |
| `effective-ssl-matrix.md` | T001 parser baseline + T002 canonical policy matrix against the real `pg-connection-string` / `pg.Client` parser. |
| `run-notes.md` | Redacted execution record and per-subtask status. |

## Source / test under change

- `okr-app/src/lib/db/config.ts` — canonical TLS policy (`parseUrlSslControls`,
  `sanitizePostgresConnectionString`, `buildPostgresPoolConfig`).
- `okr-app/tests/db/config.test.ts` — `loadConfig` / builder unit coverage.
- `okr-app/tests/db/tls.test.ts` — T001/T002 parser matrix + T003 live TLS suite.
- `okr-app/tests/db/tls-fixtures.ts` — disposable CA/server cert generation
  (`openssl`) and TLS-enabled PostgreSQL 18 endpoint (`docker`).

## Run ledger

Each row: UTC start/end, command (secrets redacted), exit code, source revision,
backend/driver/tool versions.

| # | Run | Command | Exit | Revision | Status |
|---|---|---|---|---|---|
| B1 | Baseline parser matrix (T001) | `DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/config.test.ts tests/db/tls.test.ts` | 0 | `HEAD` (lane-a) | EXECUTED |
| F1 | Fixed parser matrix + config suite (T002) | `DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/config.test.ts tests/db/tls.test.ts` | 0 | `HEAD` (lane-a) | EXECUTED |
| L1 | Live TLS endpoint (T003) | `RUOK_TEST_LIVE_TLS=1 vitest run tests/db/tls.test.ts` (Docker + openssl) | — | `HEAD` (lane-a) | PENDING (see note) |

**B1/F1 detail:** 55 passed / 5 skipped across `config.test.ts` (46) and
`tls.test.ts` (14 pass + 5 live T003 skipped). The 5 skipped are the opt-in live
endpoint cases (`RUOK_TEST_LIVE_TLS=1` unset).

> **Honest status:** The non-live parser matrix (B1), the fixed canonical
> policy + config suite (F1) and a diff-scoped type-check
> (`tsc --noEmit`, WP01-owned files clean) were executed and PASS (exit 0).
> The LIVE endpoint suite (L1 / T003) remains PENDING: the local Docker daemon
> has only `docker-proxy.artifactory.tcsbank.ru/postgres:18` and the short tag
> `postgres:18` is not present locally, so running it would require a pull that
> is not attempted per the mandatory image-download stop rule (C-007). This is
> recorded as a blocked/pending check, never PASS, and does not yet close the
> live-boundary portion of DRIFT-1/FR-001.

## Pinned versions / identity

- node-postgres (`pg`) 8.23.1, `pg-connection-string` 2.14.1.
- node v22.20.0, vitest 5.0.3.
- PostgreSQL image: `postgres:18` (pinned for C-007 reporting).
- Source revision: `HEAD` of
  `kitty/mission-database-review-findings-remediation-01M5TGCE-lane-a`.

## SHA-256 checksums (artifacts in this directory)

| Artifact | SHA-256 |
|---|---|
| `manifest.md` | `b191dc87dac936f5281afe7e2b38d1314c7317bf965379165e002924d657e6a0` |
| `effective-ssl-matrix.md` | `3641dfdd089b0d26d77036bd7a24885640be9d1801a192286ac8f99dabe33096` |
| `run-notes.md` | `4630bbcbbbbb023897fe9f19acb5bfe3562875eadd76e39a416e92c07d737fda` |

## Redaction

No passwords, session secrets or private CA keys are committed. Connection URLs
in logs are redacted to `postgres://***:***@host:port/db`. Disposable CA/keys
are generated at test time under a temp dir and removed; none are committed.