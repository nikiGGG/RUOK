# WP06 — Prove HTTP authorization and outage recovery

Evidence manifest for WP06 (`database-review-findings-remediation-01M5TGCE`).

- WP: WP06 (phase: Application remediation)
- Focus: real HTTP session/admin/two-account authorization and timed storage
  outage/recovery probes against the BUILT server (`node build`) on isolated
  ports with disposable storage; RISK-1 (recoverable probes) closure via HTTP.
- Requirement refs: FR-003, FR-005, FR-006, FR-008, NFR-001, NFR-002, NFR-004.
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
| Source revision (pre-commit HEAD) | `c9332429de15890b0101fb2f841f5fc1a26e3e65` |

Backend: real SQLite through the WP10 worker facade inside the built adapter-node
server. No Docker images pulled (C-007 image rule respected). A live PostgreSQL
at `127.0.0.1:55432` is not reachable with configured admin credentials, so all
live PostgreSQL HTTP scenarios are recorded **PENDING** (never fabricated, never
substituted with SQLite).

## Runs

### Fixed run — SQLite application suite (exit 0)

Command (from `okr-app/`): `DB_BACKEND=sqlite npx vitest run tests/application/sqlite.test.ts`

Result: 1 file passed, 19 passed, exit 0.
Start `2026-10-28T19:46:09Z`, end `2026-10-28T19:47:19Z`.
Full output: `run-transcript.txt`.

Coverage (all over real HTTP against the built server):

- **T026 sessions/admin**: register/login/me/logout, invalid session cookie,
  wrong-password 401, unauthenticated admin 401, non-admin admin 403 (no data
  leak), admin success 200 (no password hash exposed).
- **T027 two-account ownership**: Alice persists an objective; Bob list is empty,
  Bob read/update/delete are 404 with no leak and unchanged stored state;
  anonymous list/read are 401.
- **T028 probes**: health 200 `{status:ok,uptime}`; ready 200 `{ready:true,
  dialect,open,schemaVersion}`; startup-unavailable ready 503 health 200; one
  PID across unavailable-startup → first-recovery → outage → second-recovery
  within the 5s request / 10s detection / 30s recovery bounds; repeated
  outage/recovery across SQLite busy timeouts 0/5000/30000 with overlapping
  (coalesced) readiness probes and health staying 200 throughout.

### Full declared test command (exit 0)

Command (from `okr-app/`): `npm test`
Result: 19 files passed, 146 tests passed, exit 0 (existing suites unaffected).

### Build + worker emission (exit 0)

Command (from `okr-app/`): `npm run build`
Result: build succeeded; worker assets emitted: `build/workers/preparation.mjs`,
`build/workers/runtime.mjs`. The fixture spawns this built output.

### Type check

Command (from `okr-app/`): `npm run check`
- svelte-check reports 19 pre-existing errors / 4 warnings in 11 files, NONE in
  any WP06-owned file (diff-scoped grep for `tests/application` and
  `routes/api/(auth|admin|objectives)` returns no matches). No new TS errors.

## Controlled-fault / regression sensitivity (T029)

Performed in the lane worktree on isolated disposable copies, then restored and
re-run green. Patches and transcripts are committed in this directory. Both
faults cause the intended targeted test to FAIL and the restored source passes —
proving the authorization behavior is genuinely exercised (no fixture/build error
stands in for the negative assertion).

| Fault | Patch | Removed behavior | Intended failing test | Before | After |
|---|---|---|---|---|---|
| 1 | `fault1-admin-guard.patch` | admin `isAdmin` guard in `admin/users/+server.ts` GET | `non-admin admin users list is denied 403 and leaks no data` | FAIL (200 vs 403) | PASS |
| 2 | `fault2-ownership-filter.patch` | objective ownership filter in `objectives/[id]/+server.ts` GET | `other user (Bob) read of a foreign objective is denied 404 with no leak` | FAIL (200 vs 404) | PASS |

No fault code remains in the final source (verified: no `FAULT` markers; routes
restored via `git checkout`).

## Integration verification (no dead code)

- `tests/application/sqlite.test.ts` (and `postgres.test.ts`) are the live entry
  points: each calls `authSuite(...)` and `probesSuite(...)` directly, and those
  suites perform the real HTTP requests against the spawned built server. The
  SQLite run above proves the new code is actually reached.
- WP07 later imports `http-fixture.ts` for its own integration entries; no
  forward imports or edits to WP06 files are needed.

## PENDING items (not fabricated, not claimed PASS)

1. **Live PostgreSQL HTTP suites** (`postgres.test.ts`) — requires
   `RUOK_TEST_PG_ADMIN_URL` to create disposable databases. No admin URL is
   configured locally (the `127.0.0.1:55432` port is not usable with known
   credentials), so they are recorded PENDING. The entry is structurally complete
   and fails as a missing prerequisite when run without the admin URL (never
   falls back to SQLite). Live PostgreSQL closure belongs to CI with real PG.
2. **RISK-2** remains unresolved/operator-deferred (per WP safeguards).

## Artifacts (this directory)

- `manifest.md` — this manifest.
- `run-transcript.txt` — fixed-run transcript (SQLite application suite, exit 0).
- `fault1-admin-guard.patch` / `fault1-failing.txt` / `fault1-passing.txt` — T029 fault 1.
- `fault2-ownership-filter.patch` / `fault2-failing.txt` / `fault2-passing.txt` — T029 fault 2.
- `checksums.txt` — SHA-256 checksums of evidence artifacts and changed sources.

Source of truth for implementation: `spec-kitty-implement-database-review-findings-remediation-01M5TGCE-WP06.md`.