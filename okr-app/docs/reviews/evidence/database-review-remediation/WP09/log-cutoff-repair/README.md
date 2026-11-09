# Deterministic query-log cutoff oracle

The required live PostgreSQL package run in `../postgres_tmpfs.log` passed
92 of 93 tests and failed the shared integration test at its final assertion:
`listSince(new Date())` returned zero rows while the test expected two.
The original failing transcript is retained; it is not relabeled as a PASS.

The test inserted both rows before constructing the cutoff. Both production
adapters correctly implement `createdAt >= since`, so a later cutoff should
exclude earlier rows. SQLite's second-level timestamp representation could
mask the wall-clock ordering mistake, while PostgreSQL's finer timestamp
precision exposed it. No production adapter change is required.

The orchestrator explicitly coordinated this narrow repair of the shared
WP07-owned test under WP09 before implementation. Only the query-execution-log
test in `tests/domains/integrations/integrations.suite.ts` is changed:

- `l1` uses the fixed UTC whole-second timestamp 2026-01-01T00:00:00Z.
- `l2` uses that timestamp plus one second.
- A cutoff at the first timestamp must return exactly `l1` and `l2`.
- A cutoff at the second timestamp must return exactly `l2`, proving the
  inclusive boundary.
- A cutoff one second later must return an empty list.

The original listing count, failed-log filter, error-body, and aggregate count
assertions remain. Whole-second boundaries are representable by both adapters.
There are no mocks, sleeps, timestamp tolerances, retries, skipped tests,
production changes, or weaker assertions.

Source base: `b70d064becea4f23d40d6557041fb7ca9f1867a6`.
Repair prepared at 2026-11-09T11:24:01Z.
Scoped test diff SHA-256:
`d5d813f9897158450718ccc352c63ee4d077a32fee7325dc4eea699fe099f7a5`.
Scoped `git diff --check` passed before handoff.

Runtime verification is pending the parent's Node 22 verifier against real
SQLite and PostgreSQL. The parent will retain focused and package rerun results
separately from the original failing transcript. No new runtime PASS is claimed
by this note.
