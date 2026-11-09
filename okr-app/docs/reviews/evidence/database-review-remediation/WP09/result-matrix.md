# Final required execution matrix

The failed earlier attempts remain in `stages.jsonl` and their original logs.
Selected diagnostic/baseline filters are separate proof, not acceptance coverage.

| Stage | Actual command | Exit / expected | Tests passed / skipped | UTC interval |
|---|---|---|---|---|
| sqlite_after_cutoff_tmpfs | `npm run test:db:sqlite -- --maxWorkers=1 --retry=0` | 0 / 0 | 79 / 0 | 2026-11-09T11:25:32.795Z–2026-11-09T11:26:42.945Z |
| postgres_after_close_tmpfs | `npm run test:db:postgres -- --maxWorkers=1 --retry=0` | 0 / 0 | 93 / 0 | 2026-11-09T11:47:39.537Z–2026-11-09T11:48:54.879Z |
| application_sqlite_tmpfs | `npm run test:application:sqlite -- --maxWorkers=1 --retry=0` | 0 / 0 | 27 / 0 | 2026-11-09T11:28:08.802Z–2026-11-09T11:29:38.807Z |
| application_postgres_after_close_tmpfs | `npm run test:application:postgres -- --maxWorkers=1 --retry=0` | 0 / 0 | 25 / 0 | 2026-11-09T11:48:55.096Z–2026-11-09T11:49:25.472Z |
| recovery_postgres_after_close_tmpfs | `npm run test:recovery:postgres -- --maxWorkers=1 --retry=0` | 0 / 0 | 1 / 0 | 2026-11-09T11:49:25.688Z–2026-11-09T11:49:33.611Z |
| stability_tmpfs | `DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/concurrency.test.ts tests/db/no-init.test.ts --maxWorkers=1 --retry=0` | 0 / 0 | 3 / 0 | 2026-11-09T11:30:13.715Z–2026-11-09T11:30:26.867Z |
| remaining_contracts_after_close_tmpfs | `DB_BACKEND=sqlite node_modules/.bin/vitest run tests/db/sqlite-integrity.test.ts tests/db/runtime-mode.test.ts tests/db/postgres-no-ddl.test.ts tests/db/availability.test.ts tests/db/sqlite-worker.test.ts tests/verification/command-coverage.test.ts --maxWorkers=1 --retry=0` | 0 / 0 | 62 / 0 | 2026-11-09T11:49:33.830Z–2026-11-09T11:50:12.433Z |
| full_after_pg_close_tmpfs | `npm test -- --maxWorkers=1 --retry=0` | 0 / 0 | 173 / 0 | 2026-11-09T11:50:19.899Z–2026-11-09T11:52:56.025Z |

Diagnostic comparison: baseline 22, current 22, added 0, resolved 0. Actual baseline/current check exits remain 1.

Supplemental complete PostgreSQL same-PID HTTP cycle: passed.

Final-source production-image scenarios: 6/6 recorded.

Incomplete checks: 0. RISK-2 remains unresolved/operator-deferred.
