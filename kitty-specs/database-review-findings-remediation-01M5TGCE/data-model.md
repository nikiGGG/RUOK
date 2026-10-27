# Data model and lifecycle invariants

The existing 25 business tables, ownership relationships and portable backup
format stay unchanged. No business-schema migration is planned. These internal
models enrich validation and lifecycle behavior; they are not new persisted tables.

## SchemaDescriptor

| Component | Required fields / semantics |
|---|---|
| Column | Physical name, declared type, nullability, normalized default, PK position |
| Index | Table/name, uniqueness, ordered key expressions/columns, collation/direction, partial predicate |
| Foreign key | Child/parent table, ordered column mapping, on-delete/on-update actions |
| Constraint | Supported PK/UNIQUE/CHECK/table options not already represented by catalog metadata |
| Journal | Journal structure and ordered known `(hash, created_at)` pairs; duplicate/unknown/corrupt rows rejected |
| Supported variant | Explicit historical shape and enumerated additive deltas allowed for adoption |

Identifiers/literals must be preserved safely; formatting normalization cannot
change SQL meaning. Index-name equality is never definition equality. Reference
metadata is generated from checked migrations, with independent fixture assertions.
Supported incomplete journals contain valid records only. Verify requires the
complete expected history and structural compatibility. No-history supported
legacy schema is adoptable in migrate only; empty storage is not ready.

## InitializationAttempt and ReadinessState

| Field | Meaning |
|---|---|
| generation | Monotonic owner identity; stale completion cannot publish after shutdown/reset |
| phase | uninitialized, opening, ready, retryable, unavailable, closing, closed |
| openingPromise | At most one in-flight open/verify/migrate; cleared on settlement |
| services | Published only after schema and connection success; closed on failed ownership |
| schemaVersion | Successful validated history version; alone never establishes readiness |
| nextAttemptAt | Bounded retry cooldown; no work after closing |
| availabilityPromise | Shared in-flight live query with bounded underlying resources |
| lastErrorCategory | Internal redacted diagnosis, no credential URL or exception dump in HTTP |

Readiness is true only when schema validation succeeded for this generation and
a bounded live operation succeeds. `_open` means resource ownership, not current
reachability. Failed writes are not replayed. Failed initialization can retry;
shutdown fences attempts and releases resources. Scheduler starts once after
usable storage; tracked timers stop at shutdown. See plan.md for state diagram.

## EvidenceRun and FindingDisposition

EvidenceRun contains source revision/diff identity, command with secret placeholders,
UTC start/end, exit status, environment versions, backend/scenario, image identity,
artifact links and SHA-256 checksums. It contains no cookies/passwords/private keys.

Each finding row links requirement IDs, changed behavior, baseline or controlled
fault result, fixed result, regression identifiers and durable EvidenceRun artifacts.
In-scope status moves open → implemented → verified only after required execution;
missing/blocked execution remains incomplete. RISK-2 remains unresolved and
operator-deferred, outside the six-finding closure count. Planning creates no
implemented/verified disposition.
