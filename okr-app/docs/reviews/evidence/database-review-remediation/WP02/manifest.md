# WP02 — Reject incompatible SQLite definitions (DRIFT-2 / FR-002)

**Mission**: `database-review-findings-remediation-01M5TGCE`
**Requirements**: FR-002, FR-008, NFR-001, NFR-004
**Scope**: `okr-app/src/lib/db/migrations/*` semantic integrity and
`okr-app/tests/db/sqlite-integrity.test.ts`.
**Historical report (unchanged)**: `docs/reviews/sqlite-postgresql-support-2026-10-26.md`.

## Defect being closed (DRIFT-2)

The previous classifier recognised SQLite layouts by column *names* and index
*names* only. It accepted any SQL under an expected index name, so replacing
`CREATE UNIQUE INDEX users_username_unique ON users(username)` with a nonunique
index of the same name on `users(id)` was classified `ready` and the
authentication username-uniqueness constraint silently lost.

## Fix

- **`contracts.ts`** — added semantic descriptors: `ColumnDescriptor`
  (type/nullability/default/PK position), `IndexDescriptor`
  (uniqueness/ordered keys/collation/direction/predicate),
  `ForeignKeyDescriptor` (mapping + actions), `JournalRecord` (hash+timestamp).
  `DbShape` carries these as optional semantic fields; `ExpectedLayout` carries
  them as required.
- **`sqlite-inspect.ts`** (new, shared) — PRAGMA-based semantic inspection used
  by migrator, verifier and the expected-layout builder. Also does bounded
  `CHECK`-constraint detection.
- **`expected-sqlite.ts`** — expected layout is now derived from the checked
  migrations applied to an isolated in-memory SQLite database, so it cannot
  drift from the frozen history.
- **`fingerprint.ts`** — classification now compares index *definitions*,
  column *definitions*, foreign-key mappings/actions and journal integrity, not
  names. Corrupt/unknown/future/duplicate journal rows are rejected; incomplete
  journals remain adoptable only when all existing rows are valid.
- **`sqlite-migrator.ts`** — inspect/reject happens before any mutation; the
  persistent `journal_mode` pragma is deferred until a compatible transaction
  commits (T008). FK-orphan preflight preserved.
- **`sqlite-verify.ts`** — shares the same inspector/classifier; still strictly
  read-only.

## Regression matrix (`tests/db/sqlite-integrity.test.ts`)

| Case | Expected |
|---|---|
| journal-managed migrated DB | ready (no mutation) |
| db:push (no journal) | adopt, record history |
| db:push missing additive column | adopt, add column |
| incomplete journal | adopt, record missing facts |
| harmless index formatting | ready (not falsely rejected) |
| nonunique wrong-column index under expected name | **reject**, unchanged |
| altered column type | **reject**, unchanged |
| altered nullability | **reject**, unchanged |
| altered default | **reject**, unchanged |
| altered PK | **reject**, unchanged |
| altered FK action | **reject**, unchanged |
| unsupported CHECK constraint | **reject**, unchanged |
| corrupt journal hash | **reject**, unchanged |
| duplicate journal record | **reject**, unchanged |
| unknown/future journal record | **reject**, unchanged |

Every rejection asserts the journal/catalog is unchanged after the failed run.

## Live execution evidence

Durable before/after runs with SHA-256 checksums, source revision and tool
versions are required by NFR-001/NFR-004. Live runs were captured on the lane-b
worktree for this WP (all commands run from `okr-app/`):

| Command | Result | Exit |
|---|---|---|
| `npx vitest run tests/db/sqlite-integrity.test.ts` | 15 passed (tamper + no-mutation + positives) | 0 |
| `npx vitest run tests/db/migration-files.test.ts tests/db/migration.test.ts tests/db/legacy-adoption.test.ts` | 23 passed | 0 |
| `npm run test:db:sqlite` | 11 files / 77 passed | 0 |
| `npm test` | 18 files / 133 passed | 0 |
| `npx tsc --noEmit` | no errors in WP02-changed files (pre-existing baseline debt remains only in `src/lib/server/ai/providers.ts` and `src/lib/server/plugins/oura.ts`, unchanged by WP02) | 0 for changed surface |

Environment: Node v22.20.0, better-sqlite3 12.5.0, vitest 5.0.3,
DB_BACKEND=sqlite. Source revision (base): `4a745701b0e0303d852179f75a5d44af1e5aefec`.
Runs executed UTC 2026-10-27 ~22:16–22:17Z. No Docker images were required for
this WP's SQLite-focused verification; no image download was attempted.

Every rejection case (nonunique wrong-column index, altered type/nullability/
default/PK, altered FK action, unsupported CHECK, corrupt/duplicate/unknown
journal record) asserted the catalog/journal is unchanged after the failed run
via `journalRows(path)` before/after comparison (state after tamper vs after the
rejected migrate, so the injected fault itself does not masquerade as mutation).

This manifest plus the green run records constitutes the durable evidence for
DRIFT-2. Artifact SHA-256 checksums (at evidence capture time):

| Artifact | SHA-256 |
|---|---|
| `tests/db/sqlite-integrity.test.ts` | `7a3a03baee024669c63a9e715e645246a2059dd39221d6204e911119f27ebf83` |
| `src/lib/db/migrations/sqlite-inspect.ts` | `00818a8beb9f513024bac23f7779d6c23340be2e61b2e67c7697856de8827741` |
| `src/lib/db/migrations/fingerprint.ts` | `515025eccf1960f88830664adb045bc5284ea0e68666a4c9c9de2f7c45d1d5b4` |
| `src/lib/db/migrations/contracts.ts` | `833292d763575d30a13342dcf2b23750449755ba677679fa9d8decd34242393a` |
| `src/lib/db/migrations/expected-sqlite.ts` | `5198f666e0001c1fb6454b2b66fa24508da31f5970b74f7e34865bda0131e030` |
| `src/lib/db/migrations/sqlite-migrator.ts` | `1efb606d728c2c731173599cae994d201e11d7f063db34b284067fc9067980c6` |
| `src/lib/db/migrations/sqlite-verify.ts` | `896fb475745a6f114112ffec72028f892b8094dc65094da69b0375626ad1245d` |
| `docs/reviews/evidence/database-review-remediation/WP02/manifest.md` | `0f2b2e45a505ac01092825ffce86db15d7708cce70c60bb25696be50a7882b32` |