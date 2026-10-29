# Runtime and verification contract

This supplements the original mission's persistence contract without changing
business APIs or backup format. Requirements in ../spec.md remain authoritative.

## Migration mode

`MIGRATION_MODE` supports migrate and verify. Absent means migrate, preserving
existing startup behavior; any other value fails with a redacted actionable error.
Application and CLI use the same validation. Verify performs read-only inspection,
zero DDL and zero journal writes even when storage is absent/outdated/incompatible.
SQLite verify does not create paths/files; PostgreSQL runtime owns no application
schema objects and needs no CREATE. Privileged migration remains separate.

## TLS

Every connection path uses canonical validated TLS policy. Duplicated, unknown
or contradictory URL TLS controls fail before a connection. Supported accepted
controls are consumed/removed before pg parses the connection URL; explicit
verify-full/custom CA retains CA and both certificate/hostname verification.
Runtime pool and migration Client share policy. Wrong CA/hostname fails without
fallback. Driver errors, public responses and evidence never reveal credentials.

## HTTP probes

| Request | Status and body | Storage/startup dependency |
|---|---|---|
| GET /api/health | 200 JSON `{status:"ok", uptime:number}` | Process-only, including failed/ongoing database initialization; no session lookup |
| GET /api/ready while opening/failed/unavailable | 503 JSON `{ready:false, dialect:string or null, open:boolean, schemaVersion:number or null}` | Can trigger one async opening attempt; does not wait for migration |
| GET /api/ready after schema + live check succeed | 200 JSON `{ready:true, dialect:"sqlite" or "postgres", open:true, schemaVersion:number}` | Actual selected service's bounded live query, no cached-success shortcut |

Probe responses complete within 5 seconds. Design budget is 3 seconds; backend
work has bounded cancellation/cleanup. Clients poll every second in acceptance
traces; outage becomes 503 within 10 seconds and recovery 200 within 30 seconds
of storage/schema availability, without process restart. Auth/session/plugin
initialization is bypassed for exact probe routes only. Query strings do not
broaden the bypass. Other routes keep existing authentication and ownership rules.
No new public reset, retry, fault injection or test-control API is introduced.

All synchronous SQLite driver work, including ordinary authenticated application
writes/reads, handle operations, schema preparation and backup/atomic transactions,
runs in workers. Preserve existing awaitable DatabaseServices and configured
SQLite busy timeouts (including >5s); do not silently clamp them. Runtime queue
is bounded to 128 queued ordinary requests; overflow rejects before dispatch.
Readiness has at most one coalesced pending/in-flight worker request and a <=3s
host wait including queue time. A readiness timeout does not cancel/replay a
business write, release its active slot early or flood another readiness command.
Late replies are generation/request-fenced. Crashed-worker writes may have an
uncertain commit outcome; never automatically replay or claim universal rollback.

The mandatory same-PID HTTP lock test holds an external SQLite write lock after
startup, issues an authenticated write and concurrently times health/readiness.
Repeat at configured busy timeouts 0/5000/30000ms, overlapping probes/backpressure
and lock release; preserve the existing 5/10/30-second targets and verify cleanup.

## Initialization and resource ownership

One open attempt per process/generation. Concurrent callers share it; rejection
clears it and partial resources. Stale attempts cannot publish after close/reset.
Recovery reuses healthy resources or recreates invalid ownership without automatic
application-write replay. Pool idle errors are handled and reduce readiness;
a later successful check permits recovery. Worker/connection/timer cleanup is
mandatory on error, timeout and shutdown. Scheduler startup is once per process.

## Application authorization and integration

Use actual HTTP login cookies for unauthenticated, non-admin, admin and two-user
cases. Preserve established route denial statuses; assert no foreign data in
response and no unauthorized persisted changes. Test both private and explicitly
shared friend data. Tests call actual query execution/QuickJS bridge, saved-query
paths, scheduled plugin callback/manager and AI-tool route/dispatcher. External
provider fixture data is allowed; database/auth/bridge mocks cannot prove closure.
Controlled guard/filter/bridge faults must fail their targeted regression.

## Command activation and suite ownership

WP10 builds worker assets through the existing Vite build hook; npm run build
remains usable without future package files. WP05 directly verifies the executable
PostgreSQL preflight; WP06 backend entries register auth/probes suites only.
WP07 owns separate integrations.sqlite.test.ts/integrations.postgres.test.ts and
imports the earlier HTTP fixture without changing earlier entry files.
WP11 alone activates package commands after WP05/WP07 dependencies complete:
SQLite application command explicitly names sqlite.test.ts plus
integrations.sqlite.test.ts; PostgreSQL names postgres.test.ts plus
integrations.postgres.test.ts. Required PostgreSQL/backend/recovery commands invoke
the now-existing preflight. All current full/backend suites remain present.
No missing-file forward references, optional discovery, skips or no-test success.

## Required verification and image scripts

Required PostgreSQL/backend/recovery entrypoints fail nonzero when server/admin
URL or matching pg_dump/pg_restore/psql are missing. No required scenario is skipped.
Manual image validation requires both storage modes, same image identity, exact
objective write/read comparison across restart, and fatal readiness timeouts.
Lost-write and never-ready controls must return nonzero. Record local image IDs
accurately when no registry digest exists. Scripts do not publish/deploy or edit CI.

If a required Docker image download fails, immediately stop ALL mission work,
report exact image/tag/digest, registry, command and redacted error, ask operator
for assistance and wait for explicit direction. Do not work around registry,
proxy/TLS/network settings or continue independent mission work during the block.

## Closure

All six findings require durable redacted failing-before/passing-after evidence
or an explicitly documented equivalent controlled fault. A script existing or a
builder assertion is not execution evidence. Reports must preserve the historical
review and explicitly retain RISK-2 unresolved/operator-deferred. No workflow,
publication-gate or repository-setting change is authorized by this contract.
