# SQLite availability interface correction

WP09's same-lockfile baseline/current diagnostic comparison found one added
TypeScript error in `src/lib/db/adapters/sqlite-local.ts`: the worker-private
`SqliteLocalServices` implements `DatabaseServices`, whose availability method
returns `Promise<boolean>`, while this method declared `Promise<void>`.
The original failed check and diagnostic comparison remain in WP09 evidence.

The orchestrator explicitly coordinated this narrow correction to the
WP10-owned method under WP09 before implementation. It was implemented using
the Node Norris profile; the curator continues to own evidence reconciliation.
No other application method, interface, worker transport, test, or earlier
owner evidence was changed by this repair.

The method now declares `Promise<boolean>` and returns `true` only after its
existing real query against the required `users` table succeeds. The closed
handle guard and query exception propagation are unchanged. There is no cached
success or unconditional result before the query.

The public worker facade in `sqlite-worker-client.ts` already resolves a
successful availability command to `true` and errors/timeouts to `false`,
independently of the internal success payload. Its three-second queue/probe
deadline, in-flight coalescing, failure behavior, and recovery behavior are
unchanged. This patch makes the internal success result match its declared
interface without changing the public facade's behavior.

Source base: `b70d064becea4f23d40d6557041fb7ca9f1867a6`.
The parent records the final dirty diff and executed revision in WP09's run
provenance. The scoped `git diff --check` passed before handoff.

Runtime and type validation are pending the parent's retained Node 22 verifier.
Recommended existing coverage is `tests/db/sqlite-worker.test.ts` (blocked
write, bounded unavailability, then recovery) and `tests/db/availability.test.ts`
(open/closed, missing required table, coalescing and lifecycle recovery), plus
the current/baseline diagnostic comparison and required final suites. These
assert the public availability contract without adding a test that merely
mirrors this return statement. No runtime PASS is claimed by this note.
