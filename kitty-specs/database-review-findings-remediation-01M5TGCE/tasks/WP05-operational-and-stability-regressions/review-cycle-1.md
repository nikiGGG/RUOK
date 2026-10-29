---
affected_files: []
cycle_number: 1
mission_slug: database-review-findings-remediation-01M5TGCE
reproduction_command:
reviewed_at: '2026-10-28T19:30:48Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 Review Feedback (REJECT → planned)

Reviewer: WP05 review (mission database-review-findings-remediation-01M5TGCE)
Commit reviewed: `493cb7b` (backup/restore operations isolation)
Date: 2026-10-28

## Verdict: Changes required — T023 real execution is missing

T021, T022, T024 and the fail-closed design are correct and should be preserved.
The single blocking issue is that **T023's intended scenario never executes**.

---

### Issue 1 (BLOCKER): T023 native full-installation recovery rehearsal never runs

`okr-app/tests/recovery/postgres-recovery.test.ts` now only asserts the
precondition gate:

```ts
const prereq = await assertPostgresPrerequisites(process.env)
expect(prereq.ok, prereq.missing.join('; ')).toBe(true)
```

In this environment the assertion fails on `pg_dump/pg_restore major 14 != server
major 18`, so the test exits **before** `pg_dump`, `pg_restore`, the typed-read
verification, or the final schema check ever run. The committed test is therefore
a precondition assertion, not a rehearsal — it never exercises a full dump/restore.

Per the WP DoR and review guidance this blocks acceptance:
- "Missing live execution remains incomplete and blocks acceptance."
- "Reject if the intended scenario never executes or fixture setup fails before the claimed assertion."
- "Any incomplete prerequisite or evidence gap is reported and prevents acceptance."

The WP manifest itself records: "This gap prevents full acceptance of T023."

**The gap is surmountable without violating C-007.** A live PG18 is reachable at
`127.0.0.1:55432` (server version 18.6), and the already-running postgres:18
container `traggo-test-pg` — the same one used as the live server — contains
`pg_dump` 18.6 and `pg_restore` 18.6 at `/usr/lib/postgresql/18/bin/`. Running the
rehearsal with those tools (e.g. via `docker exec` or by prefixing `PATH` with the
container's 18-bin directory) does **not** pull or substitute a Docker image;
C-007 governs image download/substitution, not use of the already-present
binaries in the already-running container.

**Required to close:** actually execute the seeded migrated dump → drop/recreate →
restore → typed-read verification → schema check against the live PG18 using the
matching pg18 dump/restore tools already present in the running container, and
record the executed run (exact command, exit codes, server + tool versions,
revision, and the live transcript) in the WP05 evidence directory. Keep the
fail-closed preflight as-is — the fix is to run the scenario for real, not to
weaken the gate.

---

### Confirmed good (preserve unchanged)

- **T021** (`postgres.operations.test.ts`): pool + outage cases now call
  `migrateDatabase` and assert the expected application tables exist before
  exercising behavior; advisory-lock assertion scoped to the backend pid.
  Verified live: 4/4 pass on real PG18.
- **T022** (`require-postgres-test.ts`): side-effect-free, fail-closed, reports
  missing prerequisites nonzero without credential output; preflight verified
  directly (returns 1 for missing URL and for version mismatch). Live-called.
- **T024** (`concurrency.test.ts`, `no-init.test.ts`): capture child
  stdout/stderr, exit code AND signal; unique isolated bundle path per run; ten
  consecutive iterations with Vitest retry disabled. Verified: 3/3 pass.
- No `describe.skip`/`hasBinary` leftovers; no silent-empty returns; commit
  touches only WP05-owned surfaces (no scope creep / no CI edits).