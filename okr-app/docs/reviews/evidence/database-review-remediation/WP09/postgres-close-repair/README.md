# Idempotent PostgreSQL close and safe reopen

The required `remaining_contracts_tmpfs.log` run passed 61 of 62 tests and
failed the live PostgreSQL availability case with
`Called end on pool more than once`. The case closed the runtime service, then
its fixture teardown closed it again. `DatabaseServices.close()` explicitly
requires idempotent resource release; the adapter instead called `pool.end()`
on every invocation. The original failed transcript remains unchanged.

The orchestrator explicitly coordinated this narrow WP04 lifecycle correction
under WP09 before implementation. This repair owns only the PostgreSQL adapter's
open/close lifecycle fields and methods, the existing live PostgreSQL
availability case, and this note. Other SQL, availability queries and deadlines,
configuration, migrations, and earlier owner evidence are unchanged.

The corrected state flow is:

1. `close()` marks the adapter closed synchronously, then returns one cached
   drain promise for its current pool. Concurrent and subsequent calls share
   that same in-flight or completed operation. Errors remain rejected and are
   not swallowed.
2. `open()` waits for the prior close and opening attempt before retiring the
   matching completed close promise. It can then create a new pool. Concurrent
   opens/reopens share one opening promise, avoiding an orphaned extra pool.
3. An opening attempt superseded by close rejects rather than setting `_open`
   back to true. The existing real `SELECT 1`, client release, idle-error
   handler, and readiness publication after successful connection are retained.
4. Closing after reopen creates a new drain promise for the new pool; it cannot
   accidentally reuse the old pool's completed close result.

The existing real PostgreSQL test retains its initial true and closed false
availability assertions, then additionally checks concurrent and repeated
close, concurrent reopen, and close of the reopened pool. A separate bounded
admin observer queries `pg_stat_activity` for the fixture's actual database:
zero runtime connections after the first close, exactly one after concurrent
reopen, and zero after the final close. This catches leaks before fixture
teardown can terminate connections. Observer checkout/query deadlines are one
second each. Fixture teardown remains a final repeated close. No mocks,
test retries, global timeout changes, or relaxed assertions are introduced.

Source base: `b70d064becea4f23d40d6557041fb7ca9f1867a6`.
Repair prepared at 2026-11-09T11:37:10Z.
Two-file source/test diff SHA-256:
`7db04c1b68b3d1bbd28105afad3ae3b41a4f1b6a168f046816061799d9182eb0`.
Scoped `git diff --check` passed before handoff.

Runtime verification is pending the parent's retained Node 22 verifier and
real PostgreSQL fixture. The parent records focused availability and broader
suite results, final source provenance, production build, and image checks
separately. This note does not claim an executed runtime PASS.
