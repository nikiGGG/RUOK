# MR-2 / MR-3 SQLite correction

Corrective Op `01M71V7074RWQY0HAMEF8AQ4WX`; implementation profile Node Norris.
Requirement trace: FR-002, plan semantic SQLite recognition, WP02 T006–T009.

MR-2 arose because implicit UNIQUE autoindexes have NULL catalog SQL and were
excluded from inspection, and FK comparison tested only the expected subset.
The inspector now retains all index descriptors through SQLite PRAGMA metadata,
while its named-index SQL inventory remains unchanged. The classifier compares
restrictive uniqueness against reference key semantics, comparing PK indexes separately by table and ordered key descriptors, including
collation and direction, alongside column PK ordinals. Autoindex names carry no
semantic meaning. Named index definition
checks remain strict. FK descriptors are compared as a complete multiset, so
extra mappings/actions or duplicate edges cannot be silently accepted.

MR-3 arose because fresh classification preceded journal integrity checks.
Journal columns and hash/timestamp records are now validated first. Supported
SERIAL and INTEGER primary-key journal variants are retained. The in-memory
reference journal uses the migrator’s existing SERIAL DDL so SQLite supplies a
canonical PK index descriptor; INTEGER PRIMARY KEY journals retain their
supported absence of an autoindex. Existing journal PK indexes must match the
reference key semantics. A nonempty journal
without application tables is rejected even when every recorded migration is
known: those records cannot justify suppressing CREATE statements. Empty journals
also require the supported constraint surface before migration: unexpected
indexes/UNIQUE constraints, CHECK constraints and foreign keys are rejected.
Missing journal hash/timestamp columns produce an explicit structural diagnostic.

Tests were written first through existing `migrateDatabase(config, {mode})` APIs
against real SQLite files. Every new rejection compares catalog SQL, every table's
rows (including journal rows), and persistent journal mode before/after. Existing
assertions remain unchanged. Controls include named extra uniqueness, which was
already rejected; fresh/empty valid journal migration and verification; and all
existing recognized migration/db:push/additive/partial-journal/formatting cases.

Parent-executed first [RED](red.log): 20 failed, 4 passed among 24 selected cases;
15 existing cases were filtered out. Failures include actual unexpected ready
acceptance and migration mutation. The existing named-extra-UNIQUE controls and
fresh positives pass. The six additional empty-journal constraint tests were
then written before that follow-up correction: [RED](empty-journal-red.log)
records six failures. These prove the missing pre-fresh constraint checks, not
collection errors or a newly introduced API.

Review then demonstrated that equal PK ordinals still allowed changed key
collation/direction. Four application-PK tests were written before the fix:
[PK RED](pk-red.log) records the four new failures (with the existing altered-PK
regression passing). Four journal-PK tests plus an INTEGER journal positive were
written before that extension: [journal PK RED](journal-pk-red.log) records four
failures and one passing positive. Both migrate and verify now reject these
changes with exact unchanged-storage snapshots. The final integrity file has
54 cases, with its existing assertions retained.

Commands from the application directory (Node 22 corrective container):

```sh
node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t 'postmerge schema boundary regressions' --maxWorkers=1 --retry=0
node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t 'extra empty-journal' --maxWorkers=1 --retry=0
node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t 'primary key' --maxWorkers=1 --retry=0
node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts -t 'empty-journal PK|empty valid INTEGER' --maxWorkers=1 --retry=0
node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/migration-files.test.ts tests/db/migration.test.ts tests/db/legacy-adoption.test.ts --maxWorkers=1 --retry=0
```

The first focused [GREEN](green.log), before the six extra journal tests, records
62 passing cases across all four files. Final expanded results belong in the
parent's final verification ledger; this document does not predeclare them.
[Source manifest](source-manifest.json) binds original and final scoped source
content by SHA-256, including the first corrective commit as the PK-correction
baseline; the parent owns executed run/image provenance and final
checksums. Only implementation documentation and this manifest were written by
the implementation agent; live execution/logs came from the parent.

Bound Op governance, canonical profile CLI, DIRECTIVE_025/051 and dependency
tactics were read before edits. No dependencies were added, removed, upgraded or
installed; package/lockfile/CI/CD/historical SQL and existing WP09 artifacts remain
outside this correction. RISK-2 remains unresolved and operator-deferred.


## Final parent execution (2026-11-10)

Final parent supplemental run passed106 cases including all54 integrity cases, zero mandatory skips, with unchanged assertions and retry0. See `../gates-serial/supplemental.log` and independent `../corrective-review.md`.
