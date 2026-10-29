# WP02 Review Feedback (round 1)

Verdict: **Changes requested** (move to `planned`).

Config validation (T006), lifecycle (T007) and tests (T008) are well built and
pass their scoped runs. Two issues block approval:

## Issue 1 (T005 — schema default parity): `key_results.expected_hours` loses `DEFAULT 0`

The production schema and the historical SQLite migration carry a default that
both new dialect schemas drop:

- `okr-app/src/lib/db/schema.ts`:
  `expectedHours: real('expected_hours').default(0),`
- `okr-app/drizzle/0000_cultured_tana_nile.sql`:
  `` `expected_hours` real DEFAULT 0 ``

But in `schema/sqlite.ts`, `schema/postgres.ts` and the fixture DDL in
`tests/db/fixtures.ts`, `expected_hours` is declared **without** a default:

- `expectedHours: real('expected_hours'),` / `expectedHours: doublePrecision('expected_hours'),`

Effect: a key result inserted without `expectedHours` will store `NULL` in the
new schemas instead of `0` as today. This is exactly the FR-002/T005 "matched
defaults/nullability" drift the review guidance calls out ("lost fields",
mismatched default).

Fix: restore `.default(0)` on `expected_hours` in `schema/sqlite.ts`,
`schema/postgres.ts`, and the `key_results` DDL in `tests/db/fixtures.ts`.

## Issue 2 (test-coverage gap): the schema-parity test does not compare against the production surface

`schema-parity.test.ts` only compares `schema/sqlite.ts` against
`schema/postgres.ts`. It would pass even if both dialects drifted from the real
production `schema.ts` (as Issue 1 demonstrates). Compare both dialects to the
production schema's table/column set and at least default/nullability
semantics (or assert the canonical column inventory from the shared artifact),
so a dropped default or field cannot pass silently.

## Issue 3 (anti-pattern #7 — shared-file ownership): `okr-app/package.json` modified outside owned scope

`package.json` is owned by WP01. WP02 modified it (added
`tests/db/lifecycle.test.ts` to the `test` script and added
`test:db:lifecycle`) without an explicit coordination note in the commit or WP
frontmatter. The change is functionally justified (T008 lifecycle tests must
run under `npm test`), so this is not a hard blocker by itself — but it must be
explicitly documented as a shared-file coordination note so downstream WPs
(WP03/WP08/WP09/WP10 also overlap `package.json`) can account for it. Add the
note to the task/commit and the move-task reason.

## What passed (for confirmation)

- All 25 tables/fields/FKs/indexes otherwise match production; nullable
  composite uniqueness on `objective_reflections` is preserved on both sides.
- Config validation (T006) and lifecycle (T007) implement the spec correctly:
  default sqlite, required `DATABASE_URL`, bounded pool/timeouts, validated
  journal/TLS, `DATABASE_PATH` ignored in postgres mode, DSN/CA redaction,
  lazy factory, no SQLite file in postgres mode, verified TLS via explicit
  `ssl` object (CA not erased by URL merge), fail-fast (no SQLite fallback).
- Scoped runs: `npm test` exit 0 (47 passed), `npm run test:db:sqlite` exit 0
  (21 passed), `npm run build` exit 0 (only pre-existing a11y warnings).
  `npm run test:db:postgres` fails fast on missing `RUOK_TEST_PG_ADMIN_URL`
  (no live PG service here) — correct non-substitution behavior.