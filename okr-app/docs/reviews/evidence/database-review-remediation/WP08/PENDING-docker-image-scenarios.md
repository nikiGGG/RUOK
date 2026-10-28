# WP08 — PENDING: Docker image scenarios (C-007 blocked in this environment)

## What is pending

The two **container-image** smoke scripts (`smoke-sqlite.sh`, `smoke-postgres.sh`)
were implemented and hardened, but their **live container execution** could not
be run in this environment. Building and running the production image requires
`docker build` + `docker run` against the `node:22-alpine`-based image. This
environment's execution policy enforces C-007 strictly: **no image pull and no
`docker run`/`docker build` that would create containers or pull a base image**
(`node:22-alpine`, or any ephemeral build/run container) is permitted.

## Pending items (recorded truthfully — NOT PASS, NOT application defect)

1. `bash tests/container/smoke-sqlite.sh` — container-image SQLite positive
   (objective write → restart → exact id+title read) **and** its lost-write
   negative control. Expected: exit 0 (positive), exit nonzero (negative).
2. `DATABASE_URL=<live> bash tests/container/smoke-postgres.sh` — container-image
   PostgreSQL positive (requires explicit live `DATABASE_URL`; asserts no-SQLite
   dependency; objective write → restart → exact read) **and** its never-ready
   negative. Expected: exit 0 (positive), exit nonzero (never-ready).

## What was verified live instead (host-level production runtime `node build`)

The exact-write-restart-read and never-ready/lost-state logic these scripts
share (through the single hardened `lib.sh` oracle) was proven live at host level:

- SQLite positive (exact persistence): exit 0 — `run-sqlite-positive.txt`.
- PostgreSQL positive (live PG18 disposable DB, exact persistence): exit 0 — `run-postgres-positive.txt`.
- Lost-persistence negative: exit 1 — `run-sqlite-lost-persistence-negative.txt`.
- Lost-objective exact-read negative (404): exit 1 — `run-sqlite-lost-objective-negative.txt`.
- Never-ready negative (`/api/ready` stays 503): never 200 — `run-never-ready-negative.txt`.

## How to close the pending items

Run in a Docker-capable environment, or with explicit operator approval to build
and run the image, the two container scripts listed above, and add their
transcripts (with image id/digest, exit codes, revision, versions, UTC timestamps)
to this directory. Until then the container-image boundary for FR-004 / SC-003 is
recorded as **incomplete / PENDING**, not closed.

RISK-2 remains unresolved/operator-deferred. No workflow or publication logic was
modified.