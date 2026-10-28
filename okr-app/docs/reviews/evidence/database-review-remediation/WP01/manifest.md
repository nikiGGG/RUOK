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
| L1 | Live TLS endpoint (T003) | `RUOK_TEST_LIVE_TLS=1 node_modules/.bin/vitest run tests/db/tls.test.ts` (Docker + openssl) | 0 | `HEAD` (lane-a) | PASS |

**B1/F1 detail:** 55 passed / 5 skipped across `config.test.ts` (46) and
`tls.test.ts` (14 pass + 5 live T003 skipped when `RUOK_TEST_LIVE_TLS=1` unset).

**L1 detail (executed live, cycle 2):** 14 passed / 0 skipped (all 5 T003 live
cases PASS) against the pinned image `docker-proxy.artifactory.tcsbank.ru/postgres:18`
(already present locally; no pull — C-007 respected). Real endpoints verified:
trusted CA + hostname `SELECT 1` succeeds on both the runtime pool and migration
Client; untrusted CA rejected (no plaintext fallback) on both; hostname mismatch
rejected despite the correct CA. Containers removed after the run.

> **Honest status (updated):** The non-live parser matrix (B1), the fixed
> canonical policy + config suite (F1), a diff-scoped type-check (WP01-owned
> files clean), and the LIVE endpoint suite (L1 / T003) were ALL executed and
> PASS (exit 0). L1 was previously PENDING because the local Docker daemon only
> had `docker-proxy.artifactory.tcsbank.ru/postgres:18` while `tls-fixtures.ts`
> used the short tag `postgres:18`; the image was not pulled (C-007). With
> operator authorization to pin the fixture to the already-local registry image,
> the fixture now uses `docker-proxy.artifactory.tcsbank.ru/postgres:18` (via
> `RUOK_TEST_PG_IMAGE`, default) and the live suite executes and passes. This
> closes the live-boundary portion of DRIFT-1 / FR-001 / FR-008 / NFR-001.

## Pinned versions / identity

- node-postgres (`pg`) 8.23.1, `pg-connection-string` 2.14.1.
- node v22.20.0, vitest 5.0.3.
- PostgreSQL image: `docker-proxy.artifactory.tcsbank.ru/postgres:18`
  (pinned; fixture default via `RUOK_TEST_PG_IMAGE`, present locally, no pull).
- openssl 3.5.1; Docker server 27.3.1 (colima VM, Ubuntu 24.04).
- Source revision: `HEAD` of
  `kitty/mission-database-review-findings-remediation-01M5TGCE-lane-a`.

## SHA-256 checksums (artifacts in this directory)

| Artifact | SHA-256 |
|---|---|
| `manifest.md` | `49be92d7321c0f3f4d6d1c9e0be88a8924f5cf961626fa7a223846f83569b8ba` |
| `effective-ssl-matrix.md` | `61314fefb4b2553d6cdecb98920c5e61f9cc93cde1e8bb2cfa0def4e4cb54aa5` |
| `run-notes.md` | `eebef5dc41f540ac3ddcb9f8642bfdf921ee809ff0ba9ef410ee8434a80a1c7b` |

## Before / after (T004)

Cycle-1 PENDING state is preserved in git history (commit `76204c2`); cycle-2
PASS state is this manifest. Live evidence (T003) executed with real endpoints;
see run-notes.md.

## Redaction

No passwords, session secrets or private CA keys are committed. Connection URLs
in logs are redacted to `postgres://***:***@host:port/db`. Disposable CA/keys
are generated at test time under a temp dir and removed; none are committed.