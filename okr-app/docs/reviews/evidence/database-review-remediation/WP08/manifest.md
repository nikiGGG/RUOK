# WP08 — Make manual image verification fail truthfully (evidence manifest)

**Mission:** `database-review-findings-remediation-01M5TGCE`
**WP:** WP08 — Make manual image verification fail truthfully
**Requirement refs:** FR-004, FR-008, NFR-001, NFR-002, NFR-004
**Priority:** P1
**Revision (evidence runs):** `2912ff7012eecb15ec8442bc5e4eaf372dcece5d` (lane-h HEAD at capture time)
**Node:** v22.20.0 · **Host:** darwin (arm64) · **Docker:** 27.3.1 (present, but container/image build not runnable here per C-007 — see PENDING)
**Live PostgreSQL:** `traggo-test-pg` (postgres 18.6) at `127.0.0.1:55432`, reused C-007-safely (no image pulled).

## What changed (source)

| File | Change |
|---|---|
| `okr-app/tests/container/lib.sh` | Bounded every HTTP request (`--connect-timeout`/`--max-time`); added `require_cmds`, `api_call` (sets `HTTP_STATUS`, fails on network/timeout), `assert_status`, `json_field_file`, `image_id`/`image_digest` (local id labeled separately from registry digest), `exact_read_objective` (authenticated exact id+title re-read), fatal `wait_ready`. Removed all warn-then-PASS behavior. |
| `okr-app/tests/container/smoke-sqlite.sh` | Exact objective write → restart → re-login → exact id+title read on the same account. Readiness timeout, non-201 create, empty id, and lost/drifted objective are FATAL. No re-creation of the objective. Records local image id vs registry digest. |
| `okr-app/tests/container/smoke-postgres.sh` | Requires an explicit live `DATABASE_URL` for the full run (fails nonzero as a missing prerequisite otherwise — no more CI-only reachability PASS). Keeps the no-SQLite-file dependency assertion. Same exact write → restart → re-login → exact-read persistence oracle. |
| `okr-app/tests/container/smoke-host-sqlite.sh` | Host-level fallback hardened with the same truthfulness: bounded curl, fatal readiness/liveness, non-200 register/create as fatal, empty-id fatal, and exact id+title read after restart (re-login, no re-create). |
| `okr-app/tests/container/README.md` | Rewritten to match exit semantics, probe expectations, required `DATABASE_URL`, host-gateway reachability note, image-identity labelling and the C-007 stop rule. No old CI-only or intentionally-broken-liveness claim remains. |

## Subtask disposition

| Sub | Status | Evidence |
|---|---|---|
| T035 | DONE | Hardened shared helpers + truthfulness proven by all run files below; empty/missing id, non-200 status, timeout are fatal. |
| T036 | DONE | Exact write→restart→read in both modes: `run-sqlite-positive.txt`, `run-postgres-positive.txt`. |
| T037 | DONE (host-level live) + **PENDING** (Docker image scenarios) | Positive + negative controls below; container-image runs are PENDING per C-007 (see `PENDING-docker-image-scenarios.md`). |
| T038 | DONE | README updated; this manifest + transcripts + checksums are durable redacted evidence. |

## Live evidence runs (this environment, host-level production runtime `node build`)

| File | Scenario | Exit | Notes |
|---|---|---|---|
| `run-sqlite-positive.txt` | SQLite objective write → restart → exact id+title read | 0 | PASS |
| `run-postgres-positive.txt` | PostgreSQL (live PG18, disposable DB) write → restart → exact id+title read | 0 | PASS; DB created then dropped |
| `run-sqlite-lost-persistence-negative.txt` | SQLite fresh migrated-but-empty data dir before restart | 1 | NEGATIVE control; account/objective lost → 401 → fatal |
| `run-sqlite-lost-objective-negative.txt` | SQLite objective deleted via API then exact-read | 1 | NEGATIVE control; exact read → 404 → fatal |
| `run-never-ready-negative.txt` | Postgres mode vs unreachable DB; `/api/ready` stays 503 | never 200 | NEGATIVE control; wait_ready is FATAL after timeout |

The negative controls were executed from **isolated copies under `okr-app/tests/container/` that were removed after capture** (controlled faults are intentionally not committed to source). Their transcripts are retained here verbatim so the reviewer can distinguish failing-before from passing-after.

## Integration verification

- `smoke-host-sqlite.sh` is invoked directly and is the runnable host-level path in this environment (used for the SQLite positive + negatives).
- `lib.sh` helpers (`wait_ready`, `api_call`, `assert_status`, `exact_read_objective`, `image_id`) are imported by all three `smoke-*.sh` scripts (`source "$SCRIPT_DIR/lib.sh"`), i.e. the hardened oracle is the single shared path every script uses — no dead helpers.
- `smoke-sqlite.sh` / `smoke-postgres.sh` are the container-image entrypoints; they are implemented and import the same `lib.sh`, but their **live container execution is PENDING** (see below).

## PENDING (genuinely unrunnable in this environment)

Docker **image** validation (`smoke-sqlite.sh`, `smoke-postgres.sh`) requires building the production image and running it as a container. This environment's auto-mode policy enforces C-007 strictly: no image pull and no `docker run`/`docker build` that would create containers or pull base images (the `node:22-alpine` base and any build/run container are disallowed). Therefore:

- **PENDING:** `bash tests/container/smoke-sqlite.sh` — container-image SQLite positive + its lost-write negative.
- **PENDING:** `DATABASE_URL=<live> bash tests/container/smoke-postgres.sh` — container-image PostgreSQL positive + its never-ready negative.

These are recorded as **PENDING**, not PASS or FAIL. The same exact-write-restart-read and never-ready/lost-state logic they exercise was proven live at host level above; only the container-image boundary is not executed here. This must be run in a Docker-capable environment (or with operator approval to build/run the image) to close the container-image boundary for FR-004/SC-003.

RISK-2 remains unresolved/operator-deferred. No `.github/workflows/` or CI/CD logic was modified. No dependencies were installed/upgraded as part of this WP (only the repository's own `npm ci` + `npm run build` were run to exercise the runtime).

## Checksums

See `checksums.txt` for SHA-256 of every artifact in this directory.