# WP04 — Recover initialization and keep probes truthful

Evidence manifest for WP04 (`database-review-findings-remediation-01M5TGCE`).

- WP: WP04 (phase: Application remediation)
- Focus: single lifecycle owner (shared open attempt, finally cleanup, bounded
  retry cooldown, generation fencing), bounded live availability (`checkAvailability`),
  asynchronous live readiness (no cached-success shortcut), probe-route separation,
  and dialect-bound `DatabaseServices`.
- Requirement refs: FR-003, FR-006, FR-008, NFR-001, NFR-002, NFR-004.
- Inspected baseline: `0572599edc3e79dded5893aaaaef6867394a5288`
  (historical review `okr-app/docs/reviews/sqlite-postgresql-support-2026-10-26.md`).

## Environment (all runs)

| Item | Value |
|---|---|
| Node | v22.20.0 |
| npm | 11.6.4 |
| Vitest | 5.0.3 |
| better-sqlite3 | 12.5.0 |
| pg | 8.23.1 |
| drizzle-orm | 0.45.1 |
| OS | darwin-arm64 |
| Source revision (pre-commit HEAD) | `d7d80ff8d8687f44d3a7a8a20e0ee72d3d8c574a` |

Backend: real SQLite through the WP10 worker facade. No Docker images pulled
(C-007 image rule respected). A live PostgreSQL at `127.0.0.1:55432` was probed
(port open) but no admin URL (`RUOK_TEST_PG_ADMIN_URL`) is configured, so the
live PostgreSQL `checkAvailability` scenario is recorded **PENDING** (see below),
never fabricated and never substituted with SQLite.

## Runs

### Fixed run — WP04 focused suites (exit 0)

Command (from `okr-app/`):
`DB_BACKEND=sqlite npx vitest run tests/db/availability.test.ts tests/db/lifecycle.test.ts tests/db/failure.test.ts tests/db/migration.test.ts tests/db/lifecycle-isolation.test.ts tests/db/sqlite-worker.test.ts tests/db/no-init.test.ts`

Result: 7 files passed, 44 passed / 1 skipped, exit 0.
Start `2026-10-28T19:19:05Z`, end `2026-10-28T19:19:15Z`.
Full output: `run-transcript.txt`.

### Full declared test command (exit 0)

Command (from `okr-app/`): `npm test`
Result: 19 files passed, 146 tests passed, exit 0.
(Verified after all WP04 source/test changes.)

### Build + worker emission (exit 0)

Command (from `okr-app/`): `npm run build`
Result: build succeeded; WP10 worker assets emitted:
`build/workers/preparation.mjs`, `build/workers/runtime.mjs`.

### Type check

Command (from `okr-app/`): `npm run check` (`svelte-kit sync && svelte-check`)
- svelte-check reports 19 pre-existing errors in 11 files, NONE in any WP04-owned
  file (confirmed by diff-scoped grep). All errors are in `.svelte` components and
  WP10's `sqlite-local.ts` / unrelated server files. No new TS errors introduced.

## Controlled-fault / negative controls (WP04 availability + lifecycle tests)

The following assertions in `tests/db/availability.test.ts` capture the defect and
the fix (they are genuine negative controls, not fixture errors):

- **Raw adapter open without migration reports unavailable**: a raw
  `createDatabaseServices(...).open()` bypasses migration, so the required
  application table (`users`) is absent and the live probe MUST report
  unavailable (false). This is the failing-before behavior the old cached
  readiness would have hidden.
- **No cached-success shortcut**: `checkAvailability()` reports false before
  open and after close; readiness resolves only via a bounded live query.
- **Recovery**: a failed open (unreachable backend) rejects; an immediate retry
  is refused by the <=1s cooldown (`/cooling down/i`); after reset a valid
  SQLite open recovers.
- **Close cannot resurrect resources**: after `closeDatabase()` the backend is
  not open, readiness is false, and a fresh open re-publishes successfully.
- **Shared open attempt**: concurrent `openDatabase` callers resolve to the same
  singleton instance.
- **Dialect binding / no cross-dialect leakage**: a SQLite backend has
  `dialect === 'sqlite'` and opens no PostgreSQL pool.

## PENDING items (not fabricated, not claimed PASS)

1. **Live PostgreSQL `checkAvailability`** — the not-open branch (returns false
   before open / after close) is exercised without a server
   (`tests/db/availability.test.ts`). The live "open migrated backend returns
   true" scenario is guarded on `RUOK_TEST_PG_ADMIN_URL` (skipped here because
   no admin URL is configured; the port `127.0.0.1:55432` is open but
   credentials are unknown). Recorded PENDING, never substituted with SQLite.
2. **RISK-1 closure** is intentionally NOT claimed — per WP04 boundary condition,
   RISK-1 remains open until WP06 timed HTTP proof and WP09 final reconciliation.
3. **RISK-2** remains unresolved/operator-deferred (per WP04 safeguards).

## Artifacts (this directory)

- `run-transcript.txt` — fixed-run transcript (focused suites, exit 0).
- `manifest.md` — this manifest.
- `checksums.txt` — SHA-256 checksums of evidence artifacts and changed sources.

Source of truth for implementation: `spec-kitty-implement-database-review-findings-remediation-01M5TGCE-WP04.md`.