# Final-source production image

Status: PASS, executed final source. This proof was required because final integration
corrects `SqliteLocalServices.checkAvailability` to return the declared boolean
after its existing query; the earlier WP08 image does not contain that source
line. Rebuilding and replaying the six live scenarios is justified by this
source change, not repetition of unchanged green packaging evidence.

After all source/test repairs and integrated verification are stable, invoke
from lane-i `okr-app/` with disposable PostgreSQL credentials privately exported:

```bash
bash docs/reviews/evidence/database-review-remediation/WP09/final-image/run.sh
```

The runner builds `localhost/ruok:wp09` with Docker format and `--pull=never`,
records source HEAD, a source/test dirty-diff hash, individual tracked source
hashes, actual immutable local image ID, runtime versions and HEALTHCHECK.
Local image identity is not a registry manifest digest. The script then reuses
that single ID for real SQLite/PostgreSQL exact-objective write/restart/read
positives and actual lost-write/never-ready negatives on both backends.

`engine-fault.sh` is an unchanged copy of WP08's reviewed control wrapper, now
writing solely into this WP09 evidence directory. It deletes actual objective
rows or stops the application only after a successful restart. Both the fault
marker and intended failure message must appear; a fixture error is not a valid
negative. The original PostgreSQL false-PASS proof remains in WP08 and need not
be replayed with its historical fixed account against a reused database.

Per-case commands/UTC/exits are recorded in `live-results.txt` and separate logs.
The final source hash check rejects edits during packaging/proof. Do not modify
application or test files after this final run; any further change must be
assessed before accepting the evidence. All databases/containers are disposable;
the scripts do not publish, deploy or edit CI/CD. Any required image acquisition
failure stops all mission work for operator assistance.

## Executed result

Build exit 0, final local image ID
`76851d5c343ef90ab57a6313db88d73a341e0f53c7380d6052f7cfd87d1fb06d`.
Docker-format HEALTHCHECK is present. Node 22.23.4, better-sqlite3 12.5.0 and
pg 8.23.1 are recorded in `runtime-versions.json`.

The six scenarios ran 2026-11-09T19:34:01Z–19:35:51Z: SQLite and PostgreSQL
positives exit 0; both lost-write and both never-ready controls exit 1 with
their actual fault markers and intended assertions. Exact pre/post-restart
objective values are recorded. `source-stability.log` verifies every captured
tracked source/test file stayed unchanged. `provenance.txt` records build/live
commands, source HEAD, dirty diff, host tools and immutable image identity.
