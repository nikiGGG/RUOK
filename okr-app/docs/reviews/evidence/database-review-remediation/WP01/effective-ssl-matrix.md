# Effective pg Client SSL matrix (T001 baseline + T002 fixed)

This documents the DRIFT-1 defect and its fix against the ACTUAL
`pg-connection-string` 2.14.1 parser used by `pg` 8.23.1.

## How the defect works

`pg`'s `ConnectionParameters` merges the parsed connection string over the
caller's config:

```js
if (config.connectionString) {
  config = Object.assign({}, config, parse(config.connectionString))
}
```

Because the right-hand `parse(...)` wins, any TLS control surviving in the
connection string (`sslmode`, `ssl`, `sslcert`, `sslkey`, `sslrootcert`,
`sslnegotiation`) OVERRIDES the explicit `ssl` object the application set,
silently dropping the CA and/or disabling verification. `tests/db/tls.test.ts`
reproduces this at the real parser.

## Baseline (T001) — raw URL overrides explicit ssl

Explicit `ssl: { rejectUnauthorized: true, ca: <CA> }` passed alongside a raw
URL:

| URL hint | Effective `connectionParameters.ssl` | Effect |
|---|---|---|
| `?sslmode=disable` | `false` | Downgrade to plaintext |
| `?sslmode=no-verify` | `{ rejectUnauthorized: false }` | Verification disabled |
| `?sslmode=require` | `{}` | CA dropped; verification weakened |
| `?ssl=no-verify` | `{ rejectUnauthorized: false }` | Verification disabled |
| `?sslrootcert=...` | `{ ca: <file contents> }` | CA source bypassed |

## Fixed (T002) — sanitized URL + explicit canonical ssl

`buildPostgresPoolConfig` strips every TLS control from the URL
(`sanitizePostgresConnectionString`) before passing it to pg, then applies an
explicit canonical `ssl`. The parser no longer sees a control to override:

| Config | Effective `connectionParameters.ssl` |
|---|---|
| `sslMode: 'disable'` | `false` |
| `sslMode: 'verify-full'` (no CA) | `{ rejectUnauthorized: true }` |
| `sslMode: 'verify-full'` + `DATABASE_SSL_CA_FILE` | `{ rejectUnauthorized: true, ca: <CA body> }` |

`rejectUnauthorized` and the custom CA survive the real parser for both the
runtime pool (`adapters/postgres.ts`) and the migration Client
(`postgres-migrator.ts`) because both share the same `buildPostgresPoolConfig`.

## URL control policy (T002) — reject before connect

`parseUrlSslControls` (called from `loadConfig`) rejects deterministically:

- Duplicate controls: `?sslmode=require&sslmode=verify-full` → `Duplicate TLS control`.
- Unsupported sslmode: `no-verify`, `prefer` → `Unsupported TLS sslmode`.
- Unsupported controls: `ssl`, `sslcert`, `sslkey`, `sslrootcert`,
  `sslnegotiation` → `Unsupported TLS control`.
- Contradictory explicit setting vs URL (pre-existing): `DATABASE_SSL_MODE=disable`
  + verifying URL sslmode → error; CA file + `disable` → error.

Non-security URL parameters are preserved by sanitization (e.g.
`application_name`, `options`, `target_session_attrs`).

## T003 live boundary (not executed in implementation sandbox)

`tests/db/tls.test.ts` `describe.runIf(RUOK_TEST_LIVE_TLS=1)` starts a real
TLS-enabled `postgres:18` container (via `tls-fixtures.ts`) and asserts, through
the production runtime pool and migration Client builders:

1. trusted matching CA + hostname → `SELECT 1` succeeds;
2. untrusted CA → rejected (no plaintext fallback);
3. hostname mismatch (cert lacks `IP:127.0.0.1`, connect to 127.0.0.1) → rejected.

These runs require Docker + openssl and were NOT executed by the implementation
agent (sandbox denies `docker`/`node`). See `manifest.md` run ledger.