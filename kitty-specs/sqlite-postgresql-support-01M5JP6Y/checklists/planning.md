# Planning review

- [x] Read task 115 and all two returned comments (179, 212).
- [x] Preserve SQLite default and add optional PostgreSQL; no single-backend replacement.
- [x] Inspect all 25 schema tables, connection/migrations, direct-query footprint, hooks/jobs, backup and packaging.
- [x] Execute current seven SQLite migrations in a disposable in-memory database and document limited evidence.
- [x] Consult primary database/driver/publication documentation and distinguish current docs from pinned dependencies.
- [x] Record architecture decisions, type boundary and synchronous SQLite transaction constraint.
- [x] Define supported legacy adoption, independent migration histories and fail-closed readiness.
- [x] Cover complete feature/privacy parity and four portable backup directions.
- [x] Separate user backup scope from full installation/native recovery.
- [x] Include image/CI publishing and external CNPG handoff without claiming deployment.
- [x] Decompose into 11 reviewable WPs and 44 unchecked subtasks with dependency/FR coverage.
- [ ] Complete application implementation, real PostgreSQL verification, image publication and live deployment (future work).
