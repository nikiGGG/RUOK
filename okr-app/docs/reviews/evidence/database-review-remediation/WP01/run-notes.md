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

Status: EXECUTED (live, `tests/db/tls.test.ts` T003 against a real TLS
PostgreSQL 18 endpoint) — all 5 cases PASS.

- Command: `RUOK_TEST_LIVE_TLS=1 node_modules/.bin/vitest run tests/db/tls.test.ts`
- Exit: 0 (14 passed / 0 skipped; T003 = 5 passed)
- Image: `docker-proxy.artifactory.tcsbank.ru/postgres:18` (already present
  locally; pinned via `RUOK_TEST_PG_IMAGE`, no pull — C-007 respected)
- Revision: `HEAD` (lane-a)
- Versions: `pg` 8.23.1, `pg-connection-string` 2.14.1, node v22.20.0,
  vitest 5.0.3, openssl 3.5.1, Docker server 27.3.1 (colima), Ubuntu 24.04 VM
- Outcome (real endpoints, via both the runtime pool and migration Client
  builders):
  - trusted matching CA + hostname → `SELECT 1` = `1` (PASS);
  - untrusted CA → rejected, no plaintext fallback (PASS);
  - hostname mismatch (cert lacks `IP:127.0.0.1`, connect to 127.0.0.1) →
    rejected (PASS).
- Containers cleaned up after run (`docker ps -a --filter name=ruok-tls` empty).
- Note: fixture stages the cert/key into a home-based directory before
  `docker run` because colima (macOS) does not expose bind-mounts from
  `/var/folders`/`/tmp` (files surface as empty dirs → "no start line").

## T004 — Publish TLS regression evidence

Status: EXECUTED + COMMITTED (`manifest.md`, `effective-ssl-matrix.md`,
`run-notes.md`). Live run **L1** now PASS in the manifest ledger; SHA-256
checksums computed and recorded for all three artifacts. Before/after evidence:
the PENDING (cycle-1) state and the PASS (cycle-2) state both captured; the
before state is preserved in git history (commit `76204c2`).

## Redaction

No credentials, session secrets or private CA keys are committed. URLs in
records are `postgres://***:***@host:port/db`. Disposable keys are temp-dir
only and removed.