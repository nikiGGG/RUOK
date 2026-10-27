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
