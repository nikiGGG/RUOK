# Persistence boundary contract

## Selection and ownership

Exactly one DatabaseServices instance per process owns the selected driver, migration lifecycle and domain repositories. open/ready/health/close are awaitable and idempotent where appropriate. open happens at runtime, not definition import/build. Unknown configuration fails; no backend fallback. Domain consumers do not receive Drizzle tables, unions of driver objects or raw connections.

Repository groups: accounts/sessions/preferences; system configuration; objectives/key results/reflections; periods/journals/commitments; tasks/attributes/tags/timers; metrics/templates/values; social/friend notes; saved queries/widgets/query inputs; plugin configuration/sync; AI configuration/logs; backup export and restore. WP01 defines exact operation signatures from the actual call-site inventory, preserving existing payloads and error semantics. Keep one canonical validation/ownership/orchestration layer and concrete SQL only in adapters.

## Return values and errors

Public repository methods return Promise of canonical values. IDs remain strings; dates become Date at legacy second precision; booleans remain boolean; optional SQL NULL maps to null, not missing/false/0. Missing single rows have one documented contract (normally undefined consistent with existing findFirst), translated at HTTP boundaries. Lists return arrays and visible ordering must be explicit. Mutations return requested domain rows or explicit affected counts, not a driver-specific .changes/.rowCount object. Backend faults become controlled errors and redact connection secrets.

No raw SQL from user JavaScript. Existing QuickJS query filters must keep userId scope, output types and async promise bridging. Authorization behavior remains tested at both request and data access boundaries.

## Atomic operation contract

Public API exposes bounded atomic domain operations (restore, timer mutation, multi-record updates that need consistency), not an arbitrary async callback implemented identically by both drivers. A validated backend-independent restore command plan contains typed records/references; SQLite executes all statements synchronously in one better-sqlite3 transaction. PostgreSQL executes all statements with awaits on one transaction connection. Both resolve the public Promise only after commit and reject only after rollback/cleanup. No global db or pool query can escape the transaction. Large batches remain in the same atomic unit.

Exports use a backend-consistent snapshot; PostgreSQL uses suitable read transaction isolation and SQLite reads synchronously under a read transaction. Snapshotting must include all supported export fields and preferences.

## Migration and health

A single shared config and migration runner powers CLI and startup. Fresh and fingerprint-recognized legacy databases have separate explicit paths. A migration lock scopes all schema/adoption actions; migrations are never skipped merely because any table exists. Readiness requires successful selected-backend connection and expected schema. Liveness has no authentication dependency; neither health endpoint returns credentials. Recovery and native backup are documented separately from user JSON portability.

## Enforced checks

Shared real-backend contract cases and structural schema parity prevent dialect drift. A source dependency check should prohibit raw driver/dialect imports outside adapters/schema/migration tooling, while allowing migrations and test fixtures. This guard asserts boundaries rather than pinning implementation line numbers. No test disables a backend or masks contract differences with broad normalization.
