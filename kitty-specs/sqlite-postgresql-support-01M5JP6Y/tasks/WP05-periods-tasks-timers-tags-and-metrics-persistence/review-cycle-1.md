---
affected_files: []
cycle_number: 1
mission_slug: sqlite-postgresql-support-01M5JP6Y
reproduction_command:
reviewed_at: '2026-10-22T22:57:38Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 Review Feedback (cycle 1)

Reviewer verdict: **REJECT** — anti-pattern #1 (dead code) FAILs and blocks approval.

## Blocking issue — dead code (anti-pattern #1)

Several new public repository methods added in WP05 (`okr-app/src/lib/db/contracts.ts` + both adapters) have **no live production caller** — they are only exercised by tests or not at all:

- `TimeCommitmentRepository.upsert` / `TimeCommitmentRepository.findByPeriodId` — the **entire** commitments repository is test-only. T017 explicitly scopes "commitments" for migration, but no route/service consumes it. Production still reads commitments only via the old boundary in `routes/api/backup/+server.ts` (WP06-scope). Either wire the commitments repository into a production path (e.g. the weekly loader / a periods route), or defer its addition to the WP that actually consumes it (WP06 backup), removing it here.
- `TaskTagRepository.add` — test-only (used by the duplicate-pair test in `planning.suite.ts`); routes use `updateTaskWithDetails`/`replaceForTask` instead.
- `TaskTagRepository.replaceForTask` — no production caller (`updateTaskWithDetails` does the delete+insert inline inside its transaction).
- `TaskTagRepository.removeByTask` — zero callers anywhere (not even tests).
- `TaskAttributeRepository.removeByTask` — zero callers anywhere (not even tests).

Per the review prompt instruction ("verify new repository methods are ACTUALLY called by the rewired routes/metrics server ... not just defined") and anti-pattern #1, this is a FAIL. Every new public repository method must either have a live production caller or be removed. Prefer removing the truly-orphaned granular helpers (`taskTags.add`, `taskTags.replaceForTask`, `taskTags.removeByTask`, `taskAttributes.removeByTask`) unless a production consumer is added, and wire or defer `timeCommitments.*`.

## Minor notes (non-blocking recommendations)

- **T020 coverage gap**: the planning/metrics domain suites do not explicitly assert `completedAt` null/false behavior or injected read/write failure for the migrated domains. User isolation IS covered. Consider adding a completedAt/null assertion and a write-failure (rollback) case for a task-with-details transaction.
- **Timer PATCH race (minor)**: in `routes/api/tasks/[id]/+server.ts` PATCH, if `stopTimer` returns `undefined` (a concurrent stop already cleared the running state between `findById` and `stopTimer`), the handler returns `{ task: undefined }` without the accumulated total. This is benign (no lost update / no double-count) but the response can be undefined; consider re-reading or returning the stopped row's values.

## What passed (for context)

- No SQLite-only terminal remains in owned application paths (all owned routes route through `getDatabase()`; the only remaining `db/client` use is the documented WP07-staged `dashboardWidgets`/`savedQueries` block in `+page.server.ts`).
- Timer start/stop are genuinely atomic on BOTH backends (SQL `UPDATE ... WHERE timer_started_at IS NULL ... RETURNING`; PostgreSQL `SELECT ... FOR UPDATE` on a pinned transaction client; SQLite single synchronous better-sqlite3 transaction). No read-modify-write lost update.
- `createTaskWithDetails` / `updateTaskWithDetails` are bounded atomic ops on both backends (transaction-scoped; no escaped queries).
- User isolation enforced at route level (`userId !== locals.user.id` → 404) on tasks, tags, templates, periods, metrics.
- Empty ID filters short-circuit explicitly (`listByTasks`, `listByUserAndDateAndNames`).
- No dialect schema/handle imports in changed consumers (only type-only `MetricDefinition` imports).
- Validation: `npm test` → 0 (112 tests); `npm run test:db:sqlite` → 0 (56 tests); `npm run build` → 0. `npm run check` → exit 1 (20 pre-existing errors, none in files WP05 modified; baseline, not a regression). Live PostgreSQL not run (no service) — postgres adapter compiles via build; postgres domain suites are mandatory-gated on `DB_BACKEND=postgres`.