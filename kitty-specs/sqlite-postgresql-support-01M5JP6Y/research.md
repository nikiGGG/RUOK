# Database portability research

Research date: 2026-10-23, Europe/Samara. Local baseline: `975a92fd2b9903f1bf18ad8c27822ddea516c247`.

## Input and evidence boundaries

Read Vikunja task 115 in full and both returned comments: 179 (requirements and tool comparison) and 212 (PostgreSQL, published images and CNPG handoff). Current user adds an explicit requirement to preserve SQLite for simple installations. Older preference for another tool does not override this repository task. The external infrastructure PR 11 and existing CNPG configuration were described in comment 212, not fetched or tested. No production data or credentials were accessed.

## Repository findings

| Area | Observed evidence | Planning consequence |
|---|---|---|
| Stack | `okr-app/package.json`: SvelteKit 2.49, Svelte 5, TypeScript 5.9, Vite 7, adapter-node 5.4, Drizzle ORM ^0.45.1 / Kit ^0.31.8; Node 22 Alpine container | Keep current stack; do not combine portability with an ORM upgrade |
| Connection | `src/lib/db/client.ts`: module-level file creation/open, unconditional WAL, better-sqlite3 export, no explicit foreign_keys pragma | Lazy runtime initialization, backend validation, integrity preflight and explicit SQLite pragmas |
| Schema | `src/lib/db/schema.ts`: 25 sqliteTable declarations, IDs are text, boolean/timestamp integer codecs, JSON stored as text, real-valued progress/weights | Equivalent PostgreSQL definitions with a canonical application type model; do not blindly substitute column builders |
| Query spread | Text inventory: 420 `db.` occurrences across 67 source files | Group migration by domain and inventory exact calls; regex counts include strings/helpers and are not a count of SQL statements |
| SQLite terminals | `.all()`/`.get()`/`.run()` inventory contains both database calls and ordinary Map/Promise usage | Classify each match; never mass-replace by spelling |
| Startup migrations | Existing nonempty SQLite database skips migration journal; only max_agent_rounds is ensured; ensureColumn warns and continues | Explicit supported legacy adoption and failure before traffic; no table-count heuristic |
| Migration files | Seven journal entries 0000–0006 | Retain historical SQLite SQL and create independent PostgreSQL lineage |
| Backup | Export is per-user version 2, nested records with IDs stripped/remapped through names/indexes; restore directly imports sqlite and uses sqlite.transaction plus raw parameterized deletes and `.run()` | Portable validated restore plan with genuine dialect-specific atomic executors; preserve old format and scope |
| Query sandbox | QuickJS `executeQuery` already uses async host promises for daily/tasks/objectives | Keep JavaScript Query API; no new SQL language or raw SQL endpoint is needed |
| Hooks and jobs | `hooks.server.ts` starts scheduler before request resolution; scheduler and events/rate limits/caches are process-local | Await database readiness before jobs/auth; retain single application replica |
| Authentication/config | Most calls already await Drizzle; some consumers use synchronous terminals | Preserve existing return shapes and access control while changing persistence ownership |
| Constraints | nullable month in objective_reflections unique index; many relationships are app-managed; FK declarations exist | Preserve current semantics first; nullable unique columns do not imply yearly uniqueness; avoid accidental business-rule changes |
| Packaging | Dockerfile runs npm ci; no tracked package-lock.json found; build can import DB client; health check points at auth/me | Establish lockfile/reproducibility; database-free build; dedicated readiness endpoint |
| Docs | README and setup assume SQLite/db:push; backup recipes use checkpoint/copy | Document migrations instead of production push; use SQLite backup API/CLI backup or a stopped app and verified native PostgreSQL restore |

## Performed check

Applied all seven SQLite migration files, in journal order, to Python sqlite3 `:memory:`. Every file executed successfully and produced 25 tables. A static comparison of schema table/column declarations found no missing declared columns in the migrated layout. This is a SQL syntax/fresh-layout check with system SQLite, not validation of better-sqlite3, Drizzle typing, existing installations, indexes, default codecs, or PostgreSQL. No npm install, app build, live PostgreSQL or container run was performed during planning.

## Decisions and alternatives

1. **Retain Drizzle and better-sqlite3; add node-postgres (`pg`).** Drizzle supports this PostgreSQL adapter. Alternative postgres.js is viable, but pg provides explicit pooling, TLS and client-scoped transactions with no need to change the existing SQLite driver. No synchronous PostgreSQL facade or network-blocking subprocess bridge.
2. **Canonical application contracts and domain logic, concrete dialect adapters.** A union of SQLite/PostgreSQL Drizzle database/table types does not make all overloaded builders interchangeable. Avoid `as any` casts or pretending pg tables are sqlite tables. Duplicate only unavoidable dialect query construction; keep ownership rules, validation, orchestration, field descriptors and result contracts canonical. WP01 must demonstrate exact 0.45.x typing before wider conversion.
3. **Async public operations with backend-specific transaction execution.** better-sqlite3 transaction callbacks are synchronous. Do not pass an async callback to sqlite.transaction or use an awaited ORM facade inside it. Build and validate a restore command plan first; SQLite executes it synchronously on one connection, pg executes asynchronously on a pinned transaction client. Domain orchestration receives one atomic result. Generic arbitrary async transaction callbacks are not part of the shared port.
4. **Two explicit migration histories.** Existing SQLite history is immutable; PostgreSQL has its own schema/config/output folder. An explicitly fingerprinted legacy-adoption operation reconciles supported SQLite layouts and records only proven applied migrations. Unknown drift is rejected with recovery guidance.
5. **Existing version-2 user backup as portable subset.** It is not a full installation converter: users/passwords/sessions, friendships/notes, system secrets, plugin/AI credentials and logs are not fully represented. A native backup remains required. Audit omitted fields such as KR scoreLabel and serialized widget references; repair loss in a compatible optional-field extension or explicitly version the format if unavoidable, continuing to read v2.
6. **One application replica in either backend mode.** Database migrations need locking despite that default, because CLI/startup or rolling starts can overlap. Distributed application scheduling/event delivery is a separate mission.
7. **One image supporting both backends; trusted publication only.** Prepare GHCR automation, keep owner/name parameterized, and establish public pull access during release execution. Publication and live deployment are not planning actions.

## Primary documentation consulted

- [Drizzle PostgreSQL adapters](https://orm.drizzle.team/docs/get-started-postgresql): node-postgres and postgres.js are supported. Current docs display release-candidate installation examples; implementation must verify the project's pinned 0.45.x APIs instead of copying current examples wholesale.
- [Drizzle schema declaration](https://orm.drizzle.team/docs/sql-schema-declaration) and [migrations](https://orm.drizzle.team/docs/migrations): schema and migration generation are dialect-specific.
- [Drizzle transactions](https://orm.drizzle.team/docs/transactions) and [node-postgres transactions](https://node-postgres.com/features/transactions): use one transaction-scoped connection; never mix transaction work with unbound pool operations.
- [node-postgres TLS](https://node-postgres.com/features/ssl): explicit SSL configuration and connection-string SSL interactions must be tested with custom CA material.
- [SQLite WAL](https://www.sqlite.org/wal.html) and [SQLite network storage](https://www.sqlite.org/useovernet.html): WAL requires shared-memory coordination; local/block storage is the supported simple mode. Changing journal mode does not establish general NFS safety.
- [GitHub container publication](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images): GHCR build/publish workflow and token permissions.

## Remaining bounded research at implementation start

WP01 proves typed queries, transactions and runtime imports using exact locked dependencies. WP03 builds representative legacy fixtures, including db:push history, incomplete journals, orphan rows and partially upgraded columns. WP07 enumerates every export field/reference and collision behavior before changing backup code. WP10/11 confirm registry ownership/architecture and actual CNPG version, services, credentials and CA through the appropriate repository/account. These are explicitly assigned tasks, not assumptions of completed verification.
