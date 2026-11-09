# Actual target-checkout verification after local merge

Status: prepared, not executed during WP09 implementation. Run only after
governed acceptance/local merge to `plan/sqlite-postgresql-support`.

```bash
bash /home/nikg/Develop/RUOK/okr-app/docs/reviews/evidence/database-review-remediation/WP09/postmerge/run.sh
```

The runner requires the actual `/home/nikg/Develop/RUOK` target checkout and
compares all captured source/test paths and hashes against the final image
proof before and after execution. It records actual target branch/HEAD. Keep
lane-i worktree/modules through merge: its exact-lock Node22/musl development
dependencies are bind-mounted into the fresh immutable final-image container.
The target's ordinary host dependencies are not replaced or reinstalled.

The container receives no database credentials, unsets baked database settings,
uses NODE_ENV=test and a 256 MB tmpfs `/tmp`, performs a production build, then
runs the declared full SQLite suite with `--maxWorkers=1 --retry=0`. The matrix's
live PostgreSQL/backend/application/recovery proofs remain separately recorded;
this postmerge check does not claim to rerun them without their prerequisites.
Actual tool versions, UTC/exits and full logs are captured in this directory,
and artifact checksums are written only on successful source-stable completion.

No source, test, dependency version, workflow, publication or repository setting
is changed. Build/test outputs and isolated bundle caches are generated in
ignored locations as in the premerge verification. A failed or already existing
attempt is not overwritten or automatically retried into green.
