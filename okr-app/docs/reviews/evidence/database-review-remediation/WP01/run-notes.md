# WP01 run notes (redacted execution record)

Per-subtask execution records.

## T001 — Capture parser and TLS regression baseline

Status: EXECUTED (test `tests/db/tls.test.ts` "T001 parser baseline").

- Command: `DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/config.test.ts tests/db/tls.test.ts`
- Exit: 0 (T001 cases pass — DRIFT-1 reproduced at the real pg parser)
- Revision: `HEAD` (lane-a)
- Versions: `pg` 8.23.1, `pg-connection-string` 2.14.1, node v22.20.0, vitest 5.0.3
- Failing-before / passing-after: see `effective-ssl-matrix.md` rows.

## T002 — Normalize canonical TLS policy

Status: EXECUTED in `src/lib/db/config.ts`
(`parseUrlSslControls`, `sanitizePostgresConnectionString`,
`buildPostgresPoolConfig` sanitizes URL); unit tests in `config.test.ts` and
`tls.test.ts` — exit 0.

- Command: `DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/config.test.ts tests/db/tls.test.ts`
- Exit: 0
- Revision: `HEAD` (lane-a)
- Verification that both runtime and migration use the same builder:
  `adapters/postgres.ts` (`new Pool(buildPostgresPoolConfig(...))`) and
  `postgres-migrator.ts` (`createPostgresMigrationClient` →
  `buildPostgresPoolConfig`) — confirmed by source inspection (the builder is the
  only TLS path for both live entry points).

## T003 — Execute real PostgreSQL TLS cases

Status: IMPLEMENTED (opt-in `RUOK_TEST_LIVE_TLS=1` suite in `tls.test.ts` +
`tls-fixtures.ts`); NOT EXECUTED in the implementation environment.

- Command: `RUOK_TEST_LIVE_TLS=1 vitest run tests/db/tls.test.ts`
- Prereqs: `openssl`, Docker daemon, `postgres:18` image pull.
- Exit: (pending)
- Reason not executed: the local Docker daemon has only
  `docker-proxy.artifactory.tcsbank.ru/postgres:18`; the short tag `postgres:18`
  used by `tls-fixtures.ts` is NOT present locally and would require a pull.
  Per the mission's mandatory image-download stop rule (C-007), the pull was
  NOT attempted to avoid substituting registries/images; this is recorded as a
  blocked/pending check, never PASS. Await operator direction on image registry.

## T004 — Publish TLS regression evidence

Status: ARTIFACTS COMMITTED (`manifest.md`, `effective-ssl-matrix.md`,
`run-notes.md`). SHA-256 checksums computed in `manifest.md`.

## Redaction

No credentials, session secrets or private CA keys are committed. URLs in
records are `postgres://***:***@host:port/db`. Disposable keys are temp-dir
only and removed.